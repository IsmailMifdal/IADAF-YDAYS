"""Lightweight intent router — rules first (no extra GPU model)."""

from __future__ import annotations

import re
import unicodedata
from typing import Literal, Optional

from app.skills.allowlist import is_in_scope_allowed

Skill = Literal["qa", "checklist", "precheck", "prefill", "refuse"]

# Clear harmful / illegal intents.
_REFUSE_ILLEGAL = re.compile(
    # Word boundaries: pirat\w* alone matched "piration" inside "expiration".
    r"(\bpirat(?:e|er|age|ing)?\b|\bhack(?:er|ing)?\b|\bbombe\b|\bexplosi\w*|"
    r"drogue\s+(de\s+synth[eè]se|dure)|"
    r"\btuer\b|\bassassin|\bchild\s*porn|\bcontrefa[cç]on\b|"
    r"faux\s+(document|titre|papier)\s+(pour|afin)|\bmalware\b|\bransomware\b|"
    r"fabriquer\s+un\s+faux)",
    re.I,
)

# Finance / trading / leverage — refuse (v4). Exclude plain tax-filing admin.
_REFUSE_FINANCE = re.compile(
    r"("
    r"\bbourse\b|\btrading\b|\btrader\b|\bscalping\b|"
    r"effet\s+de\s+levier|\blevier\b|\bapalancamiento\b|\bleverage\b|"
    r"\bcrypto\b.*\b(trade|investir|acheter)\b|"
    r"investir\s+(en|dans)\s+(actions|bourse|crypto)|"
    r"conseil(le|s)?\s+(boursier|d['']investissement)|"
    r"صفقة|رافعة\s*مالية|تداول|"
    r"apalancar|trade\s+con\s+apalancamiento"
    r")",
    re.I,
)

# Tax admin stays in scope (impots.gouv) — do not refuse as "finance advice".
_FISCAL_ADMIN = re.compile(
    r"("
    r"impots?\.gouv|d[eé]clar(er|ation)\s+(mes\s+)?revenus|"
    r"num[eé]ro\s+fiscal|avis\s+d['']imposition|"
    r"espace\s+particulier|dgfip|"
    r"tax\s+return|income\s+tax\s+return"
    r")",
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

# Explicit carte-grise cost / how-to → still qa (ants skill can enrich later).
_ANTS_COST = re.compile(
    r"(co[uû]t|prix|tarif).{0,40}(carte\s*grise|immatriculation)|"
    r"(carte\s*grise|immatriculation).{0,40}(co[uû]t|prix|tarif|en\s+ligne)",
    re.I,
)


def _norm(s: str) -> str:
    return unicodedata.normalize("NFKC", s or "").strip()


def route_skill(message: str, *, forced: Optional[Skill] = None) -> Skill:
    if forced in ("qa", "checklist", "precheck", "prefill", "refuse"):
        return forced
    text = _norm(message)

    # Illegal always wins.
    if _REFUSE_ILLEGAL.search(text):
        return "refuse"

    # Finance advice refuse — unless clearly fiscal admin filing.
    if _REFUSE_FINANCE.search(text) and not _FISCAL_ADMIN.search(text):
        return "refuse"

    # In-scope admin allowlist → never accidental refuse path (qa).
    if is_in_scope_allowed(text) or _ANTS_COST.search(text):
        # Still allow checklist/precheck/prefill if clearly asked.
        if _PREFILL.search(text):
            return "prefill"
        if _PRECHECK.search(text):
            return "precheck"
        if _CHECKLIST.search(text):
            return "checklist"
        return "qa"

    if _PREFILL.search(text):
        return "prefill"
    if _PRECHECK.search(text):
        return "precheck"
    if _CHECKLIST.search(text):
        return "checklist"
    return "qa"
