#!/usr/bin/env python3
"""Assemble processed/instruct_train_v5.jsonl (mix partagé V5A + V5B).

- Hérite du mix v4 (curated + raw/v4)
- Ajoute bucket docs-in-context (questions sur pièces + readiness admin FR)
- System prompt v5 : docs en contexte, validation code-first, checklist « prêt »
"""

from __future__ import annotations

import argparse
import json
import random
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILD_V4 = ROOT / "datasets" / "build_instruct_v4.py"
CURATED = ROOT / "datasets" / "curated"
OUT = ROOT / "datasets" / "processed" / "instruct_train_v5.jsonl"

SYSTEM_V5 = (
    "Tu es l'assistant IADAF pour les démarches administratives françaises "
    "(séjour/ANEF, CAF, Ameli, impôts, permis, carte grise ANTS) en FR/EN/AR/ES. "
    "Appuie-toi STRICTEMENT sur le contexte officiel et sur les documents fournis "
    "par l'usager (OCR/extrait/JSON de contrôle) ; cite [Source: URL] quand un lien officiel est donné. "
    "N'invente jamais montants, CERFA, champs OCR ni délais hors contexte. "
    "Documents : le CODE valide (IBAN, MRZ, dates, netteté, cohérence) ; tu EXPLIQUES les error_codes "
    "et tu indiques clairement si le dossier / la pièce est PRÊT(E) ou NON pour un dépôt admin FR, "
    "avec les prochaines actions concrètes. "
    "Refuse uniquement l'illégal/dangereux et le conseil boursier/trading/levier. "
    "Carte grise, urgences 15/17/18/112, APL, CPAM/AME, permis ANTS sont TOUJOURS in-scope."
)


def msg(user: str, assistant: str) -> dict:
    return {
        "messages": [
            {"role": "system", "content": SYSTEM_V5},
            {"role": "user", "content": user},
            {"role": "assistant", "content": assistant},
        ]
    }


def load_qa_jsonl(path: Path) -> list[tuple[str, str]]:
    rows: list[tuple[str, str]] = []
    if not path.is_file():
        return rows
    for line in path.open(encoding="utf-8"):
        line = line.strip()
        if not line:
            continue
        row = json.loads(line)
        q = (row.get("question") or row.get("prompt") or "").strip()
        a = (row.get("answer") or row.get("response") or row.get("completion") or "").strip()
        if q and a:
            rows.append((q, a))
    return rows


def upsample(pairs: list[tuple[str, str]], target: int, rng: random.Random) -> list[dict]:
    if not pairs:
        return []
    out: list[dict] = []
    prefixes = ["", "Bonjour, ", "Question : ", "Please answer: ", "Pregunta: ", "سؤال: "]
    i = 0
    while len(out) < target:
        q, a = pairs[i % len(pairs)]
        out.append(msg(prefixes[i % len(prefixes)] + q, a))
        i += 1
    rng.shuffle(out)
    return out


def rewrite_system(row: dict) -> dict:
    messages = []
    for m in row.get("messages") or []:
        if not isinstance(m, dict):
            continue
        role = m.get("role")
        content = m.get("content")
        if role == "system":
            messages.append({"role": "system", "content": SYSTEM_V5})
        elif role in {"user", "assistant"} and content:
            messages.append({"role": role, "content": content})
    if len(messages) < 2:
        return row
    if messages[0]["role"] != "system":
        messages = [{"role": "system", "content": SYSTEM_V5}] + messages
    return {"messages": messages}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=OUT)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--curated-only", action="store_true")
    parser.add_argument("--scale", type=float, default=1.0)
    parser.add_argument(
        "--docs-target",
        type=int,
        default=4000,
        help="Cible exemples docs-in-context / readiness (avant scale)",
    )
    args = parser.parse_args()
    rng = random.Random(args.seed)

    if not BUILD_V4.is_file():
        print(f"Manquant: {BUILD_V4}", file=sys.stderr)
        return 1

    # 1) Mix v4 → fichier temporaire (subprocess : évite SystemExit de v4)
    tmp = args.out.with_suffix(".from_v4.jsonl")
    cmd = [
        sys.executable,
        str(BUILD_V4),
        "--out",
        str(tmp),
        "--seed",
        str(args.seed),
        "--scale",
        str(args.scale),
    ]
    if args.curated_only:
        cmd.append("--curated-only")
    proc = subprocess.run(cmd, check=False)
    if proc.returncode != 0 or not tmp.is_file():
        print(f"build_instruct_v4 a échoué (code={proc.returncode}) → {tmp}", file=sys.stderr)
        return 1

    # 2) Retag system + inject docs-in-context
    docs_pairs = load_qa_jsonl(CURATED / "docs_in_context_v5.jsonl")
    docs_pairs += load_qa_jsonl(CURATED / "docs_explain_v4.jsonl")
    docs_target = max(1, int(args.docs_target * args.scale))
    docs_rows = upsample(docs_pairs, docs_target, rng)

    out_rows: list[dict] = []
    with tmp.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            out_rows.append(rewrite_system(json.loads(line)))

    # Dédup soft sur user content pour docs injectés
    seen_users = {
        next((m["content"] for m in r["messages"] if m["role"] == "user"), "")
        for r in out_rows
    }
    added = 0
    for row in docs_rows:
        user = next((m["content"] for m in row["messages"] if m["role"] == "user"), "")
        if user in seen_users:
            continue
        seen_users.add(user)
        out_rows.append(row)
        added += 1

    rng.shuffle(out_rows)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open("w", encoding="utf-8") as f:
        for row in out_rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    meta = {
        "version": "v5",
        "tracks": ["v5a", "v5b"],
        "base_models": {
            "v5a": "mistralai/Ministral-3-8B-Instruct-2512-BF16",
            "v5b": "mistralai/Ministral-3-14B-Instruct-2512-BF16",
        },
        "out": str(args.out.relative_to(ROOT)),
        "total": len(out_rows),
        "docs_in_context_added": added,
        "docs_target": docs_target,
        "inherits": "v4_mix",
        "system": "v5_docs_ready",
        "note": (
            "Mix v4 + system prompt docs/readiness + curated docs_in_context_v5. "
            "Validation IBAN/MRZ/dates = code ; LLM explique et dit prêt/non-prêt."
        ),
    }
    meta_path = args.out.with_suffix(".meta.json")
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(meta, ensure_ascii=False, indent=2))
    print(f"Wrote {len(out_rows)} → {args.out}")

    try:
        tmp.unlink(missing_ok=True)
        tmp.with_suffix(".meta.json").unlink(missing_ok=True)
    except OSError:
        pass
    return 0 if out_rows else 1


if __name__ == "__main__":
    raise SystemExit(main())
