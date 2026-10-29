#!/usr/bin/env python3
"""QLoRA fine-tune for IADAF chat (v2: Qwen3-8B on RTX 5080 16 GB).

Config: ml/configs/model.yaml (v1 snapshot: model_v1.yaml).
Prefers Unsloth when installed; falls back to transformers+peft+trl.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

# Anaconda + torch: duplicate OpenMP runtimes abort the process otherwise
os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")
os.environ.setdefault("OMP_NUM_THREADS", "1")

import yaml

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONFIG = ROOT / "configs" / "model.yaml"
DEFAULT_DATA = ROOT / "datasets" / "processed" / "instruct_train.jsonl"
DEFAULT_OUT = ROOT / "artifacts" / "lora"


def load_config(path: Path) -> dict:
    with path.open(encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_jsonl_messages(path: Path) -> list[dict]:
    rows = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            rows.append(json.loads(line))
    if not rows:
        raise SystemExit(f"Empty dataset: {path}. Run datasets/build_instruct.py first.")
    return rows


def format_chat(tokenizer, messages: list[dict]) -> str:
    if hasattr(tokenizer, "apply_chat_template"):
        return tokenizer.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=False
        )
    # Fallback plain concat
    parts = []
    for m in messages:
        parts.append(f"{m['role'].upper()}: {m['content']}")
    return "\n".join(parts)


def build_sft_config(SFTConfig, *, out_dir: Path, max_seq: int, n_examples: int, t: dict):
    """Build SFTConfig compatible with TRL 0.x and 1.x (field names drift a lot)."""
    import inspect
    import math

    params = set(inspect.signature(SFTConfig.__init__).parameters)
    batch = int(t["per_device_train_batch_size"])
    accum = int(t["gradient_accumulation_steps"])
    epochs = float(t["epochs"])
    steps_per_epoch = max(1, math.ceil(n_examples / max(batch * accum, 1)))
    total_steps = max(1, int(steps_per_epoch * epochs))
    warmup_ratio = float(t.get("warmup_ratio", 0.03))
    warmup_steps = max(1, int(total_steps * warmup_ratio))

    import torch

    want_bf16 = bool(t.get("bf16", True)) and torch.cuda.is_available() and torch.cuda.is_bf16_supported()
    want_fp16 = (not want_bf16) and torch.cuda.is_available()
    raw = {
        "output_dir": str(out_dir),
        "num_train_epochs": epochs,
        "per_device_train_batch_size": batch,
        "gradient_accumulation_steps": accum,
        "learning_rate": float(t["learning_rate"]),
        "weight_decay": float(t.get("weight_decay", 0.01)),
        "logging_steps": int(t.get("logging_steps", 10)),
        "save_steps": int(t.get("save_steps", 200)),
        "seed": int(t.get("seed", 42)),
        "bf16": want_bf16,
        "fp16": want_fp16,
        "optim": str(t.get("optim", "paged_adamw_8bit")),
        "dataset_text_field": "text",
        "packing": False,
        "report_to": "none",
        "max_seq_length": max_seq,
        "max_length": max_seq,
        "warmup_ratio": warmup_ratio,
        "warmup_steps": warmup_steps,
    }
    filtered = {k: v for k, v in raw.items() if k in params}
    # Prefer one length field only
    if "max_seq_length" in filtered and "max_length" in filtered:
        del filtered["max_seq_length"]
    if "warmup_ratio" in filtered and "warmup_steps" in filtered:
        # TRL 1.16: warmup_ratio removed → keep steps only
        del filtered["warmup_ratio"]
    return SFTConfig(**filtered)


def make_sft_trainer(SFTTrainer, *, model, tokenizer, train_dataset, args):
    import inspect

    params = set(inspect.signature(SFTTrainer.__init__).parameters)
    kwargs = {"model": model, "train_dataset": train_dataset, "args": args}
    if "processing_class" in params:
        kwargs["processing_class"] = tokenizer
    elif "tokenizer" in params:
        kwargs["tokenizer"] = tokenizer
    return SFTTrainer(**kwargs)


def train_unsloth(cfg: dict, data_path: Path, out_dir: Path) -> None:
    from unsloth import FastLanguageModel
    from datasets import Dataset
    from trl import SFTTrainer, SFTConfig

    max_seq = int(cfg["max_seq_length"])
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=cfg["base_model"],
        max_seq_length=max_seq,
        load_in_4bit=bool(cfg.get("load_in_4bit", True)),
        dtype=None,
    )
    lora = cfg["lora"]
    model = FastLanguageModel.get_peft_model(
        model,
        r=int(lora["r"]),
        lora_alpha=int(lora["alpha"]),
        lora_dropout=float(lora.get("dropout", 0.0)),
        target_modules=list(lora["target_modules"]),
        bias="none",
        use_gradient_checkpointing="unsloth",
    )

    raw = load_jsonl_messages(data_path)
    texts = [format_chat(tokenizer, r["messages"]) for r in raw]
    ds = Dataset.from_dict({"text": texts})

    t = cfg["training"]
    args = build_sft_config(
        SFTConfig, out_dir=out_dir, max_seq=max_seq, n_examples=len(texts), t=t
    )
    trainer = make_sft_trainer(
        SFTTrainer, model=model, tokenizer=tokenizer, train_dataset=ds, args=args
    )
    trainer.train()
    out_dir.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(str(out_dir))
    tokenizer.save_pretrained(str(out_dir))
    print(f"Saved LoRA adapter → {out_dir}")


def _require_cuda() -> "torch":  # noqa: F821 — annotated at runtime
    import torch

    if not torch.cuda.is_available():
        raise SystemExit(
            "CUDA indisponible — PyTorch CPU détecté "
            f"({torch.__version__}, cuda_built={torch.version.cuda}).\n"
            "Installe un wheel CUDA, par ex. (PowerShell) :\n"
            "  pip uninstall -y torch torchvision torchaudio\n"
            "  pip install torch torchvision torchaudio "
            "--index-url https://download.pytorch.org/whl/cu128\n"
            "Puis vérifie : python -c \"import torch; print(torch.cuda.is_available(), "
            "torch.cuda.get_device_name(0))\""
        )
    return torch


def train_transformers(cfg: dict, data_path: Path, out_dir: Path) -> None:
    torch = _require_cuda()
    from datasets import Dataset
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
    from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
    from trl import SFTTrainer, SFTConfig

    use_bf16 = bool(torch.cuda.is_bf16_supported())
    compute_dtype = torch.bfloat16 if use_bf16 else torch.float16
    print(f"GPU={torch.cuda.get_device_name(0)} bf16={use_bf16}")

    max_seq = int(cfg["max_seq_length"])
    bnb = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_use_double_quant=True,
        bnb_4bit_compute_dtype=compute_dtype,
    )
    tokenizer = AutoTokenizer.from_pretrained(cfg["base_model"], trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        cfg["base_model"],
        quantization_config=bnb,
        device_map="auto",
        trust_remote_code=True,
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

    raw = load_jsonl_messages(data_path)
    texts = [format_chat(tokenizer, r["messages"]) for r in raw]
    ds = Dataset.from_dict({"text": texts})

    t = cfg["training"]
    args = build_sft_config(
        SFTConfig, out_dir=out_dir, max_seq=max_seq, n_examples=len(texts), t=t
    )
    trainer = make_sft_trainer(
        SFTTrainer, model=model, tokenizer=tokenizer, train_dataset=ds, args=args
    )
    trainer.train()
    out_dir.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(str(out_dir))
    tokenizer.save_pretrained(str(out_dir))
    print(f"Saved LoRA adapter → {out_dir}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument("--data", type=Path, default=DEFAULT_DATA)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument(
        "--backend",
        choices=("auto", "unsloth", "transformers"),
        default="auto",
    )
    args = parser.parse_args()
    cfg = load_config(args.config)

    backend = args.backend
    if backend == "auto":
        try:
            import unsloth  # noqa: F401

            backend = "unsloth"
        except ImportError:
            backend = "transformers"
            print("Unsloth not installed — using transformers+peft fallback", file=sys.stderr)

    print(f"Backend={backend} base={cfg['base_model']} data={args.data}")
    if backend == "unsloth":
        train_unsloth(cfg, args.data, args.out)
    else:
        train_transformers(cfg, args.data, args.out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
