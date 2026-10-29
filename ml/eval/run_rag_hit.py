#!/usr/bin/env python3
"""Go/no-go RAG : Hit@k des questions gold contre ml/artifacts/rag_v3.

Hit = au moins un passage top-k dont le texte ou le titre chevauche
les expected_keywords (ou tokens de expected_answer).
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

from rag_local import LocalRag

ROOT = Path(__file__).resolve().parents[1]
GOLD = ROOT / "eval" / "gold" / "questions_v1.jsonl"
OUT = ROOT / "artifacts" / "eval_rag_hit.json"


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").lower()).strip()


def tokens(s: str) -> set[str]:
    return {t for t in re.findall(r"[a-zàâäéèêëïîôùûüç0-9]{4,}", norm(s))}


def load_gold(path: Path) -> list[dict]:
    rows = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            if row.get("todo") or row.get("must_refuse"):
                continue
            rows.append(row)
    return rows


def hit_for(item: dict, passages: list[dict]) -> bool:
    kws = [norm(k) for k in (item.get("expected_keywords") or []) if k]
    blob = " ".join(
        norm((p.get("title") or "") + " " + (p.get("text") or "") + " " + (p.get("url") or ""))
        for p in passages
    )
    if kws:
        hits = sum(1 for k in kws if k in blob)
        if hits / len(kws) >= 0.34:
            return True
    exp = tokens(item.get("expected_answer") or "")
    if not exp:
        return bool(kws) and any(k in blob for k in kws)
    got = tokens(blob)
    return len(exp & got) / max(len(exp), 1) >= 0.2


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--k", type=int, default=3)
    parser.add_argument("--threshold", type=float, default=0.7, help="Hit@k minimum go/no-go")
    parser.add_argument("--index", type=Path, default=ROOT / "artifacts" / "rag_v3")
    args = parser.parse_args()

    gold = load_gold(GOLD)
    rag = LocalRag(args.index)
    results = []
    hits = 0
    for item in gold:
        q = item.get("question") or ""
        passages = rag.retrieve(q, top_k=args.k)
        ok = hit_for(item, passages)
        if ok:
            hits += 1
        results.append(
            {
                "id": item.get("id"),
                "hit": ok,
                "titles": [p.get("title") for p in passages[: args.k]],
            }
        )

    total = max(len(gold), 1)
    rate = hits / total
    report = {
        "hit_at_k": args.k,
        "hits": hits,
        "total": total,
        "rate": round(rate, 4),
        "threshold": args.threshold,
        "success": rate >= args.threshold,
        "index": str(args.index),
        "items": results,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(
        f"Hit@{args.k}={rate:.1%} ({hits}/{total}) threshold={args.threshold} "
        f"success={report['success']}"
    )
    print(f"Report → {OUT}")
    return 0 if report["success"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
