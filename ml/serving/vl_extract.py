#!/usr/bin/env python3
"""VL extracteur (process séparé) — champs JSON pour préfill / règles.

Charge Qwen3-VL-4B + adapter LoRA si présent. Un seul gros poids GPU à la fois :
arrêter llama-server chat avant d'appeler ce script.

Usage:
  python ml/serving/vl_extract.py --image path.jpg --doc-type "Justificatif de domicile"
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ADAPTER = ROOT / "artifacts" / "lora_vl"


SCHEMA_HINT = (
    "Extrais un JSON compact avec les clés présentes parmi : "
    "nom, prenom, date_naissance, nationalite, adresse, iban, nir, "
    "numero_fiscal, immatriculation, vin, date_emission, date_expiration, "
    "document_type_guess, anomalies_detected (liste). "
    "Ne invente pas de valeurs illisibles : utilise null. "
    "Réponds UNIQUEMENT avec le JSON."
)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--image", type=Path, required=True)
    parser.add_argument("--doc-type", default="")
    parser.add_argument("--adapter", type=Path, default=DEFAULT_ADAPTER)
    parser.add_argument("--base", default="Qwen/Qwen3-VL-4B-Instruct")
    parser.add_argument("--out", type=Path, default=None)
    args = parser.parse_args()

    if not args.image.is_file():
        print(f"Image introuvable: {args.image}", file=sys.stderr)
        return 1

    try:
        from PIL import Image
        import torch
        from transformers import AutoProcessor
    except ImportError as exc:
        print(f"Dépendances VL manquantes: {exc}", file=sys.stderr)
        return 2

    prompt = SCHEMA_HINT
    if args.doc_type:
        prompt = f"Type de pièce attendu: {args.doc_type}.\n{SCHEMA_HINT}"

    # Lazy import heavy VL stack
    try:
        from transformers import AutoModelForVision2Seq
    except ImportError:
        from transformers import AutoModelForImageTextToText as AutoModelForVision2Seq  # type: ignore

    processor = AutoProcessor.from_pretrained(args.base, trust_remote_code=True)
    model = AutoModelForVision2Seq.from_pretrained(
        args.base,
        torch_dtype=torch.bfloat16 if torch.cuda.is_available() else torch.float32,
        device_map="auto",
        trust_remote_code=True,
    )
    if args.adapter.is_dir():
        try:
            from peft import PeftModel

            model = PeftModel.from_pretrained(model, str(args.adapter))
            print(f"LoRA chargé: {args.adapter}", file=sys.stderr)
        except Exception as exc:  # noqa: BLE001
            print(f"WARN LoRA non chargé ({exc})", file=sys.stderr)

    image = Image.open(args.image).convert("RGB")
    messages = [
        {
            "role": "user",
            "content": [
                {"type": "image"},
                {"type": "text", "text": prompt},
            ],
        }
    ]
    text = processor.apply_chat_template(messages, add_generation_prompt=True)
    inputs = processor(text=[text], images=[image], return_tensors="pt")
    inputs = {k: v.to(model.device) if hasattr(v, "to") else v for k, v in inputs.items()}
    with torch.inference_mode():
        out = model.generate(**inputs, max_new_tokens=512)
    decoded = processor.batch_decode(out, skip_special_tokens=True)[0]
    # Best-effort JSON slice
    start = decoded.find("{")
    end = decoded.rfind("}")
    payload = {"raw": decoded, "fields": {}}
    if start >= 0 and end > start:
        try:
            payload["fields"] = json.loads(decoded[start : end + 1])
        except json.JSONDecodeError:
            pass

    text_out = json.dumps(payload, ensure_ascii=False, indent=2)
    if args.out:
        args.out.write_text(text_out, encoding="utf-8")
        print(f"Wrote {args.out}")
    else:
        print(text_out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
