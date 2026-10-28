#!/usr/bin/env python3
"""Merge LoRA adapter into base weights, then document / trigger GGUF export.

Full GGUF conversion needs llama.cpp convert scripts on the machine. This helper:
1. Merges PEFT adapter → safetensors in ml/artifacts/merged
2. Prints the exact convert command for Q4_K_M
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONFIG = ROOT / "configs" / "model.yaml"
DEFAULT_ADAPTER = ROOT / "artifacts" / "lora"
DEFAULT_MERGED = ROOT / "artifacts" / "merged"
DEFAULT_GGUF = ROOT / "artifacts" / "gguf"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument("--adapter", type=Path, default=DEFAULT_ADAPTER)
    parser.add_argument("--merged", type=Path, default=DEFAULT_MERGED)
    parser.add_argument("--gguf-dir", type=Path, default=DEFAULT_GGUF)
    parser.add_argument(
        "--merge-only",
        action="store_true",
        help="Only merge LoRA; skip printing convert hints",
    )
    parser.add_argument(
        "--skip-merge",
        action="store_true",
        help="Do not load GPU weights; only print GGUF commands",
    )
    args = parser.parse_args()

    with args.config.open(encoding="utf-8") as f:
        cfg = yaml.safe_load(f)

    name = cfg.get("output_name", "iadaf-model")
    quant = cfg.get("export", {}).get("gguf_quant", "Q4_K_M")
    args.gguf_dir.mkdir(parents=True, exist_ok=True)
    gguf_path = args.gguf_dir / f"{name}-{quant}.gguf"

    if not args.skip_merge:
        if not args.adapter.is_dir():
            print(f"Adapter missing: {args.adapter}", file=sys.stderr)
            return 1
        try:
            import torch
            from peft import PeftModel
            from transformers import AutoModelForCausalLM, AutoTokenizer
        except ImportError as exc:
            print(f"Missing deps for merge: {exc}", file=sys.stderr)
            return 1

        print(f"Loading base {cfg['base_model']} …")
        base = AutoModelForCausalLM.from_pretrained(
            cfg["base_model"],
            torch_dtype=torch.bfloat16,
            device_map="cpu",
            trust_remote_code=True,
        )
        print(f"Merging adapter {args.adapter} …")
        model = PeftModel.from_pretrained(base, str(args.adapter))
        model = model.merge_and_unload()
        args.merged.mkdir(parents=True, exist_ok=True)
        model.save_pretrained(str(args.merged), safe_serialization=True)
        tok = AutoTokenizer.from_pretrained(cfg["base_model"], trust_remote_code=True)
        tok.save_pretrained(str(args.merged))
        print(f"Merged model → {args.merged}")

    if args.merge_only:
        return 0

    print(
        f"""
Next — convert with llama.cpp (source + Windows binaries):

  # tokenizer must include vocab.json + merges.txt (saved from base Qwen)
  python convert_hf_to_gguf.py {args.merged} --outfile {gguf_path.with_suffix('').as_posix()}-f16.gguf --outtype f16
  C:\\llama.cpp\\bin\\llama-quantize.exe {gguf_path.with_suffix('').as_posix()}-f16.gguf {gguf_path} {quant}

Serve the specialized 7B with llama-server (not Strata MoE):

  .\\ml\\serving\\llama-iadaf.ps1 -ModelPath "{gguf_path}"

Point IADAF / eval at http://127.0.0.1:8080/v1 (same OPENAI_* env as Strata).
"""
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
