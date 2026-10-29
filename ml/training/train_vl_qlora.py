#!/usr/bin/env python3
"""QLoRA fine-tune for IADAF documents VL (v2: Qwen3-VL-4B, RTX 5080 16 GB).

Loads ONE vision model at a time — stop chat/llama-server first.
Dataset: ml/datasets/processed/vl_train.jsonl (from build_vl_synth.py).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")
os.environ.setdefault("OMP_NUM_THREADS", "1")

import yaml

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONFIG = ROOT / "configs" / "model_vl.yaml"
DEFAULT_DATA = ROOT / "datasets" / "processed" / "vl_train.jsonl"
DEFAULT_OUT = ROOT / "artifacts" / "lora_vl"


def load_config(path: Path) -> dict:
    with path.open(encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_rows(path: Path) -> list[dict]:
    rows = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            rows.append(json.loads(line))
    if not rows:
        raise SystemExit(f"Empty VL dataset: {path}. Run datasets/build_vl_synth.py")
    return rows


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument("--data", type=Path, default=DEFAULT_DATA)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()
    cfg = load_config(args.config)

    import torch

    if not torch.cuda.is_available():
        raise SystemExit("CUDA requis pour train VL — installe torch cu128.")

    from datasets import Dataset
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
    from transformers import AutoProcessor, BitsAndBytesConfig
    from trl import SFTConfig, SFTTrainer

    # Prefer AutoModelForVision2Seq / Qwen3-VL class when available
    try:
        from transformers import AutoModelForImageTextToText as AutoVL
    except ImportError:
        try:
            from transformers import Qwen2_5_VLForConditionalGeneration as AutoVL
        except ImportError:
            from transformers import AutoModelForCausalLM as AutoVL

    print(f"GPU={torch.cuda.get_device_name(0)} base={cfg['base_model']}")
    use_bf16 = bool(torch.cuda.is_bf16_supported())
    compute_dtype = torch.bfloat16 if use_bf16 else torch.float16
    max_seq = int(cfg.get("max_seq_length", 1024))
    max_pixels = int(cfg.get("max_pixels", 589824))

    bnb = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_use_double_quant=True,
        bnb_4bit_compute_dtype=compute_dtype,
    )
    processor = AutoProcessor.from_pretrained(
        cfg["base_model"], trust_remote_code=True
    )
    if hasattr(processor, "image_processor") and hasattr(
        processor.image_processor, "max_pixels"
    ):
        processor.image_processor.max_pixels = max_pixels

    model = AutoVL.from_pretrained(
        cfg["base_model"],
        quantization_config=bnb,
        device_map="auto",
        trust_remote_code=True,
        torch_dtype=compute_dtype,
    )
    model = prepare_model_for_kbit_training(model)
    if cfg.get("gradient_checkpointing", True):
        model.gradient_checkpointing_enable()
        if hasattr(model, "enable_input_require_grads"):
            model.enable_input_require_grads()

    lora = cfg["lora"]
    model = get_peft_model(
        model,
        LoraConfig(
            r=int(lora["r"]),
            lora_alpha=int(lora["alpha"]),
            lora_dropout=float(lora.get("dropout", 0.05)),
            target_modules=list(lora["target_modules"]),
            bias="none",
            task_type="CAUSAL_LM",
        ),
    )

    raw = load_rows(args.data)

    def to_text(row: dict) -> str:
        # Text-only SFT fallback if full multimodal collator unavailable:
        # embed image path + dialogue so the adapter still sees structure.
        msgs = row.get("messages") or []
        parts = [f"[IMAGE] {row.get('image', '')}"]
        for m in msgs:
            parts.append(f"{m['role'].upper()}: {m['content']}")
        return "\n".join(parts)

    texts = [to_text(r) for r in raw]
    ds = Dataset.from_dict({"text": texts})

    t = cfg["training"]
    import inspect
    import math

    params = set(inspect.signature(SFTConfig.__init__).parameters)
    batch = int(t["per_device_train_batch_size"])
    accum = int(t["gradient_accumulation_steps"])
    epochs = float(t["epochs"])
    steps = max(1, int(math.ceil(len(texts) / max(batch * accum, 1)) * epochs))
    warmup = max(1, int(steps * float(t.get("warmup_ratio", 0.03))))
    raw_args = {
        "output_dir": str(args.out),
        "num_train_epochs": epochs,
        "per_device_train_batch_size": batch,
        "gradient_accumulation_steps": accum,
        "learning_rate": float(t["learning_rate"]),
        "logging_steps": int(t.get("logging_steps", 5)),
        "save_steps": int(t.get("save_steps", 100)),
        "seed": int(t.get("seed", 42)),
        "bf16": use_bf16,
        "fp16": not use_bf16,
        "optim": str(t.get("optim", "adamw_8bit")),
        "dataset_text_field": "text",
        "report_to": "none",
        "max_length": max_seq,
        "warmup_steps": warmup,
    }
    filtered = {k: v for k, v in raw_args.items() if k in params}
    sft_args = SFTConfig(**filtered)

    tok = getattr(processor, "tokenizer", processor)
    trainer_kwargs = {
        "model": model,
        "train_dataset": ds,
        "args": sft_args,
    }
    tparams = set(inspect.signature(SFTTrainer.__init__).parameters)
    if "processing_class" in tparams:
        trainer_kwargs["processing_class"] = tok
    elif "tokenizer" in tparams:
        trainer_kwargs["tokenizer"] = tok

    trainer = SFTTrainer(**trainer_kwargs)
    trainer.train()
    args.out.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(str(args.out))
    processor.save_pretrained(str(args.out))
    print(f"Saved VL LoRA → {args.out}")
    print(
        "Note: ce run utilise un fallback texte+[IMAGE path]. "
        "Pour un collator multimodal natif, brancher TRL vision ou Unsloth VL "
        "quand supporté sur ta stack transformers."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
