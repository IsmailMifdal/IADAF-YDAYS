#!/usr/bin/env python3
"""Build an actionable failure report from quality + rag_hit artifacts."""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GOLD = ROOT / "eval" / "gold" / "questions_v1.jsonl"


def load_gold(path: Path) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        out[row["id"]] = row
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--quality",
        type=Path,
        default=ROOT / "artifacts" / "results" / "current" / "eval_quality_rag.json",
    )
    parser.add_argument(
        "--rag-hit",
        type=Path,
        default=ROOT / "artifacts" / "results" / "current" / "eval_rag_hit.json",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=ROOT / "artifacts" / "results" / "current" / "eval_failure_report.json",
    )
    args = parser.parse_args()

    gold = load_gold(GOLD)
    q = json.loads(args.quality.read_text(encoding="utf-8")) if args.quality.is_file() else {}
    r = json.loads(args.rag_hit.read_text(encoding="utf-8")) if args.rag_hit.is_file() else {}
    qfail = {f["id"]: f for f in q.get("failures") or []}
    rmiss = {
        it["id"]: it
        for it in (r.get("items") or [])
        if it.get("id") and not it.get("hit")
    }

    rows = []
    for gid in sorted(set(qfail) | set(rmiss)):
        g = gold.get(gid, {})
        rows.append(
            {
                "id": gid,
                "question": g.get("question"),
                "category": g.get("category") or g.get("chemin_id") or "",
                "quality_fail": gid in qfail,
                "rag_miss": gid in rmiss,
                "detail": (qfail.get(gid) or {}).get("detail"),
                "answer_preview": (qfail.get(gid) or {}).get("answer_preview", "")[:200],
                "expected_keywords": g.get("expected_keywords"),
            }
        )

    report = {
        "quality_score": q.get("score"),
        "rag_hit_rate": r.get("rate"),
        "n_rows": len(rows),
        "by_category": dict(Counter(x["category"] or "unknown" for x in rows)),
        "items": rows,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(
        f"failures={len(rows)} quality={q.get('score')} rag_hit={r.get('rate')} → {args.out}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
