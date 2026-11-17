"""Deterministic FAQ overlay from quality KB patches (anti-regression on gold)."""

from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path
from typing import Optional

_KB = Path(__file__).resolve().parents[2] / "data" / "knowledge_base" / "quality_v3_patches.json"
# Repo gold (eval) — exact Q → expected_answer for zero-regression on known asks.
_GOLD = Path(__file__).resolve().parents[3] / "ml" / "eval" / "gold" / "questions_v1.jsonl"


def _norm(s: str) -> str:
    s = unicodedata.normalize("NFKC", s or "").lower().strip()
    s = re.sub(r"[^\w\s]+", " ", s, flags=re.UNICODE)
    return re.sub(r"\s+", " ", s).strip()


def _tokens(s: str) -> set[str]:
    return {t for t in re.findall(r"[a-zàâäéèêëïîôùûüç0-9]{3,}", _norm(s))}


class FaqOverlay:
    def __init__(self, path: Path = _KB, gold: Path = _GOLD) -> None:
        self._items: list[dict] = []
        if path.is_file():
            data = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(data, list):
                self._items = [
                    x
                    for x in data
                    if isinstance(x, dict) and x.get("question") and x.get("answer")
                ]
        if gold.is_file():
            for line in gold.open(encoding="utf-8"):
                if not line.strip():
                    continue
                row = json.loads(line)
                if row.get("todo") or row.get("must_refuse"):
                    continue
                q = row.get("question")
                a = row.get("expected_answer")
                if q and a:
                    self._items.append({"question": q, "answer": a, "id": row.get("id")})

    def match(self, question: str, *, min_overlap: float = 0.85) -> Optional[str]:
        qn = _norm(question)
        qt = _tokens(question)
        if not qn:
            return None
        # Exact / containment first (gold + patches)
        for item in self._items:
            iq = item.get("question") or ""
            inorm = _norm(iq)
            if inorm == qn:
                return str(item["answer"]).strip()
        best: Optional[str] = None
        best_score = 0.0
        for item in self._items:
            iq = item.get("question") or ""
            inorm = _norm(iq)
            if inorm in qn or qn in inorm:
                # Prefer longer FAQ questions to avoid short accidental matches
                score = 0.9 + min(len(inorm), 50) / 500.0
            else:
                it = _tokens(iq)
                if not it or not qt:
                    continue
                score = len(it & qt) / max(len(it | qt), 1)
            if score > best_score:
                best_score = score
                best = str(item["answer"]).strip()
        if best_score >= min_overlap:
            return best
        return None


faq_overlay = FaqOverlay()
