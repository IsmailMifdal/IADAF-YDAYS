#!/usr/bin/env python3
"""Merge IADAF LoRA v3.1 → HF, then ModelOpt PTQ NVFP4 → HF checkpoint for TRT-LLM.

Run inside WSL with _wsl_trtllm_env.sh sourced (needs GPU + modelopt).

Steps:
  1) merge LoRA into Qwen/Qwen3-8B (CPU or GPU)
  2) calibrate + quantize NVFP4 (Blackwell)
  3) export_hf_checkpoint for trtllm-serve

Env:
  IADAF_ADAPTER   default ml/artifacts/lora_v3_1
  IADAF_MERGED    default ml/artifacts/merged_iadaf_v3_1
  IADAF_NVFP4     default ml/artifacts/iadaf_qwen3_8b_nvfp4
  NVFP4_CFG       default NVFP4_DEFAULT_CFG  (or NVFP4_MLP_ONLY_CFG)
  CALIB_SIZE      default 128
  SKIP_MERGE=1    skip merge if merged already exists
  SKIP_QUANT=1    only merge
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ADAPTER = Path(os.environ.get("IADAF_ADAPTER", ROOT / "artifacts" / "lora_v3_1"))
MERGED = Path(os.environ.get("IADAF_MERGED", ROOT / "artifacts" / "merged_iadaf_v3_1"))
OUT = Path(os.environ.get("IADAF_NVFP4", ROOT / "artifacts" / "iadaf_qwen3_8b_nvfp4"))
BASE = os.environ.get("IADAF_BASE", "Qwen/Qwen3-8B")
CFG_NAME = os.environ.get("NVFP4_CFG", "NVFP4_DEFAULT_CFG")
CALIB_SIZE = int(os.environ.get("CALIB_SIZE", "128"))
MAX_LENGTH = int(os.environ.get("CALIB_MAX_LEN", "512"))


def merge() -> None:
    import torch
    from peft import PeftModel
    from transformers import AutoModelForCausalLM, AutoTokenizer

    if not (ADAPTER / "adapter_model.safetensors").is_file() and not (
        ADAPTER / "adapter_model.bin"
    ).is_file():
        # allow adapter at root
        if not ADAPTER.is_dir():
            raise SystemExit(f"adapter missing: {ADAPTER}")

    print(f"Loading base {BASE} (CPU bf16) …", flush=True)
    base = AutoModelForCausalLM.from_pretrained(
        BASE,
        torch_dtype=torch.bfloat16,
        device_map="cpu",
        trust_remote_code=True,
    )
    print(f"Merging {ADAPTER} …", flush=True)
    model = PeftModel.from_pretrained(base, str(ADAPTER))
    model = model.merge_and_unload()
    MERGED.mkdir(parents=True, exist_ok=True)
    print(f"Saving merged → {MERGED}", flush=True)
    model.save_pretrained(str(MERGED), safe_serialization=True)
    tok = AutoTokenizer.from_pretrained(BASE, trust_remote_code=True)
    tok.save_pretrained(str(MERGED))
    meta = {
        "base_model": BASE,
        "adapter": str(ADAPTER),
        "note": "IADAF v3.1 LoRA merged for NVFP4 PTQ",
    }
    (MERGED / "iadaf_merge.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print("MERGE_OK", flush=True)


def calib_texts() -> list[str]:
    gold = ROOT / "eval" / "gold" / "questions_v1.jsonl"
    texts: list[str] = []
    if gold.is_file():
        with gold.open(encoding="utf-8") as f:
            for line in f:
                row = json.loads(line)
                q = row.get("question")
                if q:
                    texts.append(
                        "Tu es l'assistant IADAF pour les démarches administratives françaises.\n"
                        f"User: {q}\nAssistant:"
                    )
    # pad with generic FR admin prompts
    extras = [
        "Explique la différence entre CAF et CPAM.",
        "Comment renouveler un titre de séjour ANEF ?",
        "Qu'est-ce que l'AME ?",
        "Pièces pour une demande d'APL.",
        "How do I get a carte Vitale after arriving in France?",
    ]
    while len(texts) < CALIB_SIZE:
        texts.extend(extras)
    return texts[:CALIB_SIZE]


def quantize_nvfp4() -> None:
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer

    import modelopt.torch.opt as mto
    import modelopt.torch.quantization as mtq
    from modelopt.torch.export import export_hf_checkpoint

    if not (MERGED / "config.json").is_file():
        raise SystemExit(f"merged model missing: {MERGED}")

    cfg = getattr(mtq, CFG_NAME, None)
    if cfg is None:
        raise SystemExit(f"unknown NVFP4_CFG={CFG_NAME}")

    mto.enable_huggingface_checkpointing()

    print(f"Loading merged for PTQ on GPU: {MERGED}", flush=True)
    # Keep ALL weights on one device — export_hf_checkpoint fails on cpu/cuda mix.
    try:
        model = AutoModelForCausalLM.from_pretrained(
            str(MERGED),
            torch_dtype=torch.bfloat16,
            device_map={"": "cuda:0"},
            trust_remote_code=True,
        )
    except torch.cuda.OutOfMemoryError:
        print("OOM full-GPU load — retry device_map=auto then gather to cuda", flush=True)
        torch.cuda.empty_cache()
        model = AutoModelForCausalLM.from_pretrained(
            str(MERGED),
            torch_dtype=torch.bfloat16,
            device_map="auto",
            trust_remote_code=True,
        )
    tok = AutoTokenizer.from_pretrained(str(MERGED), trust_remote_code=True)
    if tok.pad_token is None:
        tok.pad_token = tok.eos_token

    texts = calib_texts()
    print(f"Calib samples={len(texts)} cfg={CFG_NAME}", flush=True)

    def _device(m):
        try:
            return next(m.parameters()).device
        except StopIteration:
            return torch.device("cuda:0")

    def forward_loop(m):
        m.eval()
        dev = _device(m)
        with torch.no_grad():
            for i, text in enumerate(texts):
                batch = tok(
                    text,
                    return_tensors="pt",
                    truncation=True,
                    max_length=MAX_LENGTH,
                    padding=False,
                )
                batch = {k: v.to(dev) for k, v in batch.items()}
                m(**batch)
                if (i + 1) % 16 == 0:
                    print(f"  calib {i+1}/{len(texts)}", flush=True)
                    if torch.cuda.is_available():
                        torch.cuda.empty_cache()

    print("mtq.quantize …", flush=True)
    model = mtq.quantize(model, cfg, forward_loop)

    # Ensure single-device before export (offload leftovers → cuda)
    print("gather weights to cuda:0 for export …", flush=True)
    try:
        model = model.to("cuda:0")
    except Exception as e:
        print(f"to(cuda) warn: {e}", flush=True)

    OUT.mkdir(parents=True, exist_ok=True)
    print(f"export_hf_checkpoint → {OUT}", flush=True)
    try:
        export_hf_checkpoint(model, export_dir=str(OUT))
    except Exception as e:
        print(f"export_hf_checkpoint failed: {e}", flush=True)
        print("fallback: model.save_pretrained (modelopt HF hooks)", flush=True)
        model.save_pretrained(str(OUT), safe_serialization=True)
    tok.save_pretrained(str(OUT))
    meta = {
        "source_merged": str(MERGED),
        "quant": "NVFP4",
        "cfg": CFG_NAME,
        "calib_size": CALIB_SIZE,
        "serve": f"trtllm-serve serve {OUT} --host 0.0.0.0 --port 8000 --trust_remote_code",
    }
    (OUT / "iadaf_nvfp4.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print("NVFP4_OK", OUT, flush=True)


def main() -> int:
    skip_merge = os.environ.get("SKIP_MERGE", "0") == "1"
    skip_quant = os.environ.get("SKIP_QUANT", "0") == "1"
    if not skip_merge:
        if (MERGED / "config.json").is_file() and os.environ.get("FORCE_MERGE", "0") != "1":
            print(f"merged exists, skip ({MERGED}) — set FORCE_MERGE=1 to redo", flush=True)
        else:
            merge()
    else:
        print("SKIP_MERGE=1", flush=True)
    if skip_quant:
        print("SKIP_QUANT=1", flush=True)
        return 0
    quantize_nvfp4()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
