#!/usr/bin/env python3
"""Agrège arch_scale_matrix.jsonl → classement QoS + scale 256/512."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MATRIX = ROOT / "artifacts" / "results" / "current" / "arch_scale_matrix.jsonl"
OUT = ROOT / "artifacts" / "results" / "current" / "arch_scale_summary.json"


def load_rows(path: Path) -> list[dict]:
    if not path.is_file():
        return []
    rows = []
    for line in path.open(encoding="utf-8"):
        line = line.strip()
        if line:
            rows.append(json.loads(line))
    return rows


def key_cell(r: dict) -> str:
    return f"{r.get('track')}|{r.get('engine')}|{r.get('quant')}|{r.get('profile')}"


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--matrix", type=Path, default=MATRIX)
    p.add_argument("--out", type=Path, default=OUT)
    args = p.parse_args()

    rows = load_rows(args.matrix)
    if not rows:
        print(f"Matrice vide: {args.matrix}")
        return 1

    # Dernière mesure gagne par cellule
    latest: dict[str, dict] = {}
    for r in rows:
        latest[key_cell(r)] = r
    cells = list(latest.values())

    def rank_qos(profile: str):
        subset = [c for c in cells if c.get("profile") == profile]
        return sorted(
            subset,
            key=lambda c: (
                int(c.get("max_C_sla50") or 0),
                int(c.get("max_C_sla60") or 0),
                float(c.get("single_median_tps") or 0),
            ),
            reverse=True,
        )

    def rank_agg(profile: str, field: str):
        subset = [c for c in cells if c.get("profile") == profile and c.get(field) is not None]
        return sorted(subset, key=lambda c: float(c.get(field) or 0), reverse=True)

    qos_short = rank_qos("short")
    qos_docs = rank_qos("docs")
    agg256 = rank_agg("short", "agg_at_256")
    agg512 = rank_agg("short", "agg_at_512")

    summary = {
        "n_matrix_lines": len(rows),
        "n_unique_cells": len(cells),
        "cells": cells,
        "winner_qos_short": qos_short[0] if qos_short else None,
        "winner_qos_docs": qos_docs[0] if qos_docs else None,
        "winner_agg_256_short": agg256[0] if agg256 else None,
        "winner_agg_512_short": agg512[0] if agg512 else None,
        "ranking_qos_docs": [
            {
                "cell": key_cell(c),
                "max_C_sla50": c.get("max_C_sla50"),
                "max_C_sla60": c.get("max_C_sla60"),
                "single_median_tps": c.get("single_median_tps"),
            }
            for c in qos_docs
        ],
        "ranking_agg_512_short": [
            {
                "cell": key_cell(c),
                "agg_at_512": c.get("agg_at_512"),
                "ok_at_512": c.get("ok_at_512"),
            }
            for c in agg512
        ],
        "recommendation": _recommend(qos_docs, qos_short, agg512),
    }

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summary["recommendation"], ensure_ascii=False, indent=2))
    print(f"→ {args.out}")
    return 0


def _recommend(qos_docs, qos_short, agg512) -> dict:
    best_docs = qos_docs[0] if qos_docs else None
    best_short = qos_short[0] if qos_short else None
    best_burst = agg512[0] if agg512 else None
    lines = []
    if best_docs:
        lines.append(
            f"QoS docs: {key_cell(best_docs)} "
            f"(maxC@50={best_docs.get('max_C_sla50')}, @60={best_docs.get('max_C_sla60')})"
        )
    if best_short:
        lines.append(
            f"QoS short: {key_cell(best_short)} "
            f"(maxC@50={best_short.get('max_C_sla50')})"
        )
    if best_burst:
        lines.append(
            f"Burst agg@512: {key_cell(best_burst)} "
            f"(agg={best_burst.get('agg_at_512')}, ok={best_burst.get('ok_at_512')})"
        )
    lines.append(
        "Prod laptop: privilégier la cellule QoS docs. "
        "Scale users au-delà de max_C_sla50 → ajouter des réplicas GPU (pas monter C au détriment du tok/s/user)."
    )
    return {
        "prod_candidate": key_cell(best_docs) if best_docs else None,
        "burst_candidate": key_cell(best_burst) if best_burst else None,
        "notes": lines,
    }


if __name__ == "__main__":
    raise SystemExit(main())
