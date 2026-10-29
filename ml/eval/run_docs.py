#!/usr/bin/env python3
"""Eval v2 — scénarios documents / état de dossier (gold documents_v2.jsonl)."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

import httpx
import yaml

from openai_compat import chat_payload, completion_text
from run_quality import load_gold, score_item

ROOT = Path(__file__).resolve().parents[1]
GOLD = ROOT / "eval" / "gold" / "documents_v2.jsonl"
THRESHOLDS = ROOT / "eval" / "thresholds.yaml"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default=os.environ.get("OPENAI_BASE_URL", "http://127.0.0.1:8080/v1"))
    parser.add_argument("--api-key", default=os.environ.get("OPENAI_API_KEY", "iadaf-dev-local-key"))
    parser.add_argument("--model", default=os.environ.get("OPENAI_MODEL", "iadaf"))
    parser.add_argument("--gold", type=Path, default=GOLD)
    parser.add_argument("--out", type=Path, default=ROOT / "artifacts" / "eval_docs.json")
    args = parser.parse_args()

    thr = {}
    if THRESHOLDS.is_file():
        thr = yaml.safe_load(THRESHOLDS.read_text(encoding="utf-8")) or {}
    docs_thr = thr.get("docs") or {}
    quality_thr = thr.get("quality") or {}
    min_rate = float(
        docs_thr.get("min_score", thr.get("docs_min_pass_rate", quality_thr.get("min_score", 0.85)))
    )

    items = load_gold(args.gold)
    if not items:
        print(f"No gold items in {args.gold}", file=sys.stderr)
        return 1

    results = []
    headers = {"Authorization": f"Bearer {args.api_key}"}
    with httpx.Client(timeout=120.0, headers=headers) as client:
        model = args.model
        if not model or model == "iadaf":
            m = client.get(f"{args.base_url.rstrip('/')}/models")
            m.raise_for_status()
            ids = [x.get("id") for x in m.json().get("data", []) if x.get("id")]
            if not ids:
                print("No models on server", file=sys.stderr)
                return 1
            model = ids[0]
            print(f"Using model {model}")

        for item in items:
            payload = chat_payload(
                model,
                [
                    {
                        "role": "system",
                        "content": (
                            "Tu es l'assistant IADAF pour les démarches administratives "
                            "françaises et le contrôle de pièces. Sois factuel. "
                            "Refuse de contourner les contrôles (IBAN, dates, MRZ)."
                        ),
                    },
                    {"role": "user", "content": item["question"]},
                ],
                max_tokens=600,
            )
            r = client.post(
                f"{args.base_url.rstrip('/')}/chat/completions",
                json=payload,
            )
            r.raise_for_status()
            answer = completion_text(r.json())
            scored = score_item(item, answer)
            results.append(scored)
            status = "OK" if scored["ok"] else "KO"
            print(f"[{status}] {item['id']} {scored['detail']}")

    passed = sum(1 for x in results if x["ok"])
    rate = passed / len(results)
    report = {
        "passed": passed,
        "total": len(results),
        "pass_rate": rate,
        "threshold": min_rate,
        "ok": rate >= min_rate,
        "results": results,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Docs pass_rate={rate:.1%} (seuil {min_rate:.0%}) → {args.out}")
    return 0 if report["ok"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
