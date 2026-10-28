#!/usr/bin/env python3
"""Build chat-format JSONL for QLoRA from KB + optional CESEDA / service-public raw files."""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "datasets" / "raw"
OUT = ROOT / "datasets" / "processed" / "instruct_train.jsonl"
GOLD = ROOT / "eval" / "gold" / "questions_v1.jsonl"

SYSTEM_FR = (
    "Tu es l'assistant IADAF. Tu aides des personnes non francophones sur les "
    "démarches administratives françaises (titre de séjour, CAF, CPAM, impôts). "
    "Réponds de façon factuelle, claire et structurée. Oriente vers service-public.fr "
    "quand c'est pertinent. Ne invente pas de procédures."
)

# Lightweight paraphrase templates (no external API) for multilingual coverage
PARAPHRASE = {
    "en": "Answer in English. Question: {q}",
    "es": "Responde en español. Pregunta: {q}",
    "ar": "أجب بالعربية. السؤال: {q}",
}


def load_json(path: Path):
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def msg(user: str, assistant: str, system: str = SYSTEM_FR) -> dict:
    return {
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
            {"role": "assistant", "content": assistant},
        ]
    }


def from_faq(faq: list) -> list[dict]:
    rows = []
    for item in faq:
        q = item.get("question") or ""
        a = item.get("answer") or ""
        if not q or not a:
            continue
        rows.append(msg(q, a))
        for lang, tmpl in PARAPHRASE.items():
            rows.append(
                msg(
                    tmpl.format(q=q),
                    a + f"\n\n(Réponse de référence IADAF — langue demandée: {lang})",
                )
            )
    return rows


def from_demarches(demarches: list) -> list[dict]:
    rows = []
    for d in demarches:
        title = d.get("title") or d.get("id") or "démarche"
        docs = d.get("documents_requis") or []
        etapes = d.get("etapes") or []
        liens = d.get("liens_utiles") or []
        answer_parts = [
            f"**{title}**",
            d.get("description") or "",
            "Documents requis : " + ", ".join(docs) if docs else "",
            "Étapes :\n" + "\n".join(etapes) if etapes else "",
            "Liens : " + ", ".join(liens) if liens else "",
        ]
        answer = "\n\n".join(p for p in answer_parts if p)
        rows.append(msg(f"Quels documents et étapes pour : {title} ?", answer))
        rows.append(
            msg(
                f"Liste les pièces à fournir pour {title}.",
                "Pièces :\n- " + "\n- ".join(docs) if docs else answer,
            )
        )
    return rows


def from_service_public_kb(sp: list) -> list[dict]:
    rows = []
    for item in sp[:500]:
        title = item.get("title") or item.get("titre") or ""
        text = item.get("text") or item.get("contenu") or item.get("content") or ""
        if isinstance(text, list):
            text = "\n".join(str(x) for x in text)
        if not title or not text:
            continue
        rows.append(msg(f"Explique la fiche service-public : {title}", str(text)[:4000]))
    return rows


def from_ceseda(path: Path, limit: int = 400) -> list[dict]:
    if not path.is_file():
        return []
    rows = []
    with path.open(encoding="utf-8") as f:
        for i, line in enumerate(f):
            if i >= limit:
                break
            row = json.loads(line)
            ref = row.get("ref") or row.get("num") or row.get("id") or f"art-{i}"
            title = row.get("title_main") or row.get("surtitre") or "CESEDA"
            texte = row.get("texte") or row.get("texteHtml") or ""
            if not texte:
                continue
            rows.append(
                msg(
                    f"Que dit l'article {ref} du CESEDA ({title}) ?",
                    f"Article {ref} — {title}\n\n{texte[:3500]}",
                )
            )
    return rows


def from_gold(path: Path) -> list[dict]:
    if not path.is_file():
        return []
    rows = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            g = json.loads(line)
            q = g.get("question") or ""
            a = g.get("expected_answer") or g.get("answer") or ""
            if q and a:
                rows.append(msg(q, a))
    return rows


def from_hf_sp_chunks(path: Path, limit: int = 800) -> list[dict]:
    if not path.is_file():
        return []
    rows = []
    with path.open(encoding="utf-8") as f:
        for i, line in enumerate(f):
            if i >= limit:
                break
            row = json.loads(line)
            text = (
                row.get("text")
                or row.get("content")
                or row.get("chunk")
                or row.get("passage")
                or ""
            )
            title = row.get("title") or row.get("titre") or row.get("source") or "service-public"
            if not text:
                continue
            rows.append(msg(f"Résume / explique : {title}", str(text)[:3500]))
    return rows


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--shuffle", action="store_true", default=True)
    args = parser.parse_args()
    random.seed(args.seed)

    examples: list[dict] = []
    kb = RAW / "kb_iadaf"
    faq_p = kb / "faq.json"
    dem_p = kb / "demarches.json"
    sp_p = kb / "service_public.json"

    if faq_p.is_file():
        examples += from_faq(load_json(faq_p))
    if dem_p.is_file():
        examples += from_demarches(load_json(dem_p))
    if sp_p.is_file():
        data = load_json(sp_p)
        if isinstance(data, list):
            examples += from_service_public_kb(data)

    examples += from_ceseda(RAW / "ceseda" / "articles.jsonl")
    examples += from_hf_sp_chunks(RAW / "service_public_hf" / "chunks.jsonl")
    examples += from_gold(GOLD)

    if args.shuffle:
        random.shuffle(examples)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", encoding="utf-8") as f:
        for ex in examples:
            f.write(json.dumps(ex, ensure_ascii=False) + "\n")
    print(f"Wrote {len(examples)} examples → {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
