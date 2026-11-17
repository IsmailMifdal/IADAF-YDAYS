"""Lightweight intent router — rules first (no extra GPU model)."""

from __future__ import annotations

import re
import unicodedata
from typing import Literal, Optional

Skill = Literal["qa", "checklist", "precheck", "prefill", "refuse"]

# Only clear harmful / illegal intents — never route admin Q&A (EN/FR) to refuse.
_REFUSE = re.compile(
    # Word boundaries: pirat\w* alone matched "piration" inside "expiration".
    r"(\bpirat(?:e|er|age|ing)?\b|\bhack(?:er|ing)?\b|\bbombe\b|\bexplosi\w*|"
    r"drogue\s+(de\s+synth[eè]se|dure)|"
    r"\btuer\b|\bassassin|\bchild\s*porn|\bcontrefa[cç]on\b|"
    r"faux\s+(document|titre|papier)\s+(pour|afin)|\bmalware\b|\bransomware\b|"
    r"fabriquer\s+un\s+faux)",
    re.I,
)
_CHECKLIST = re.compile(
    r"(checklist|pi[eè]ces?.{0,20}manqu|que\s+me\s+manque|dossier\s+complet|"
    r"liste\s+des\s+pi[eè]ces|quoi\s+fournir|documents?\s+requis)",
    re.I,
)
_PRECHECK = re.compile(
    r"(pr[eé]-?v[eé]rif|pr[eé]check|scan\s+flou|valider\s+(ma|mon|la|le)\s+pi[eè]ce|"
    r"contr[oô]le\s+qualit[eé]|mrz|iban\s+invalide|pi[eè]ce\s+refus)",
    re.I,
)
_PREFILL = re.compile(
    r"(pr[eé]-?rempl\w*|autofill|remplir\s+(le\s+)?formulaire|"
    r"r[eé]cap(itulatif)?\s+des\s+champs|extraire\s+les\s+champs)",
    re.I,
)


def _norm(s: str) -> str:
    return unicodedata.normalize("NFKC", s or "").strip()


def route_skill(message: str, *, forced: Optional[Skill] = None) -> Skill:
    if forced in ("qa", "checklist", "precheck", "prefill", "refuse"):
        return forced
    text = _norm(message)
    if _REFUSE.search(text):
        return "refuse"
    if _PREFILL.search(text):
        return "prefill"
    if _PRECHECK.search(text):
        return "precheck"
    if _CHECKLIST.search(text):
        return "checklist"
    return "qa"
