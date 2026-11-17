#!/usr/bin/env python3
"""Qualité en conditions proches de ai-service (sans Postgres).

Pipeline : route_skill (rules) → si LLM : LocalRag + prompt glossaire + GGUF.
Pour le vrai --target ai-service, démarrer Postgres + uvicorn (voir LOCAL-V3.md).
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

import httpx
import yaml

from openai_compat import chat_payload, completion_text
from rag_local import LocalRag
from run_quality import SYSTEM_RAG, load_gold, score_item

ROOT = Path(__file__).resolve().parents[1]
GOLD = ROOT / "eval" / "gold" / "questions_v1.jsonl"
THRESHOLDS = ROOT / "eval" / "thresholds.yaml"

# Keep router logic in sync with ai-service/app/skills/router.py (rules-only).
_REFUSE = re.compile(
    r"(\bpirat(?:e|er|age|ing)?\b|\bhack(?:er|ing)?\b|\bbombe\b|\bexplosi\w*|"
    r"drogue\s+(de\s+synth[eè]se|dure)|"
    r"\btuer\b|\bassassin|\bchild\s*porn|\bcontrefa[cç]on\b|"
    r"faux\s+(document|titre|papier)\s+(pour|afin)|\bmalware\b|\bransomware\b|"
    r"fabriquer\s+un\s+faux)",
    re.I,
)

_GLOSSARY = {
    "ame": "AME = Aide Médicale de l'État. PAS un compte bancaire. ≠ PUMa.",
    "caf": "CAF = allocations familiales / logement. ≠ CPAM.",
    "cpam": "CPAM = assurance maladie (Vitale). ≠ CAF.",
    "anef": "ANEF = démarches séjour. ≠ ANTS.",
    "ants": "ANTS = CNI/passeport/permis/carte grise. ≠ ANEF.",
    "récépissé": "Récépissé = preuve de dépôt de titre ; voyage souvent limité.",
    "recepisse": "Récépissé = preuve de dépôt de titre ; voyage souvent limité.",
    "numéro fiscal": "Numéro fiscal = identifiant impôts ≠ NIR.",
    "fiscal": "Numéro fiscal = identifiant impôts ≠ NIR.",
}

REFUSE_MSG = (
    "Je ne peux pas aider sur cette demande illégale ou dangereuse. "
    "Je reste disponible pour les démarches administratives françaises "
    "(séjour, CAF, Ameli, impôts, permis, carte grise…) en français ou en anglais. "
    "Consultez aussi https://www.service-public.fr/."
)


def route(message: str) -> str:
    if _REFUSE.search(message or ""):
        return "refuse"
    return "qa"


def glossary_block(q: str) -> str:
    low = (q or "").lower()
    lines = [v for k, v in _GLOSSARY.items() if k in low]
    return "\n".join(f"- {x}" for x in lines) if lines else ""


def is_en(q: str) -> bool:
    low = (q or "").lower()
    return any(m in low for m in ("what is", "how do", "how can", "i just", "can i ", "account on"))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default=os.environ.get("OPENAI_BASE_URL", "http://127.0.0.1:8080/v1"))
    parser.add_argument("--api-key", default=os.environ.get("OPENAI_API_KEY", "iadaf-dev-local-key"))
    parser.add_argument("--model", default=os.environ.get("OPENAI_MODEL", ""))
    parser.add_argument("--rag-dir", type=Path, default=ROOT / "artifacts" / "rag_v3")
    parser.add_argument("--rag-top-k", type=int, default=6)
    parser.add_argument("--out", type=Path, default=ROOT / "artifacts" / "results" / "current" / "eval_quality_prodlike.json")
    args = parser.parse_args()

    th = yaml.safe_load(THRESHOLDS.read_text(encoding="utf-8"))["quality"]
    gold = load_gold(GOLD)
    rag = LocalRag(args.rag_dir)

    results = []
    headers = {"Authorization": f"Bearer {args.api_key}"}
    with httpx.Client(timeout=90.0, headers=headers) as client:
        model = args.model
        if not model:
            m = client.get(f"{args.base_url.rstrip('/')}/models")
            m.raise_for_status()
            model = m.json()["data"][0]["id"]
            print(f"Using model {model}")

        for item in gold:
            q = item["question"]
            skill = route(q)
            if skill == "refuse":
                ans = REFUSE_MSG
            else:
                hits = rag.retrieve(q, top_k=args.rag_top_k)
                ctx = rag.format_context(hits)
                gloss = glossary_block(q)
                lang_note = (
                    "Answer in English. English French-admin questions ARE in scope.\n"
                    if is_en(q)
                    else ""
                )
                system = (
                    SYSTEM_RAG
                    + "\n"
                    + lang_note
                    + (f"Glossaire:\n{gloss}\n" if gloss else "")
                )
                user = f"Contexte officiel :\n{ctx}\n\nQuestion usager : {q}"
                r = client.post(
                    f"{args.base_url.rstrip('/')}/chat/completions",
                    json=chat_payload(
                        model,
                        [
                            {"role": "system", "content": system},
                            {"role": "user", "content": user},
                        ],
                        max_tokens=800,
                    ),
                )
                r.raise_for_status()
                ans = completion_text(r.json()) or ""
            results.append(score_item(item, ans))

    ok_n = sum(1 for r in results if r["ok"])
    score = ok_n / max(len(results), 1)
    report = {
        "score": round(score, 4),
        "passed": ok_n,
        "total": len(results),
        "threshold": th["min_score"],
        "success": score >= float(th["min_score"]),
        "target": "prodlike-ai-service",
        "note": "skills+RAG+GGUF without Postgres; full ai-service needs DATABASE_URL",
        "failures": [r for r in results if not r["ok"]],
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"quality_score={report['score']:.2%} ({ok_n}/{len(results)}) → {args.out}")
    return 0 if report["success"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
