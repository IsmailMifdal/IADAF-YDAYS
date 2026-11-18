"""Deterministic in-scope allowlist — blocks false refuse on admin topics.

Carte grise / ANTS, urgences, APL/CAF, CPAM/AME, permis remain qa-eligible
even when the generative model tends to emit a refuse template.
"""

from __future__ import annotations

import re
import unicodedata
from typing import Optional

# Topics that must never be refused as "out of scope" by themselves.
_ALLOW = re.compile(
    r"("
    r"carte\s*grise|certificat\s+d['']?immatriculation|immatriculation|"
    r"\bants\b|immatriculation\.ants|"
    r"urgences?|num[eé]ros?\s+d['']?urgence|\b112\b|\bSAMU\b|"
    r"\bAPL\b|aide\s+au\s+logement|\bCAF\b|"
    r"\bCPAM\b|\bAME\b|\bPUMa\b|\bameli\b|assurance\s+maladie|"
    r"permis\s+de\s+conduire|driving\s+licen[cs]e|"
    r"بطاقة\s*رمادية|طوارئ|منحة\s*السكن|"
    r"matricula(?:ción|cion)|emergencia|permiso\s+de\s+conducir"
    r")",
    re.I,
)


def _norm(s: str) -> str:
    return unicodedata.normalize("NFKC", s or "")


def allowlist_topic(message: str) -> Optional[str]:
    """Return a topic tag if the message is clearly an in-scope admin ask."""
    text = _norm(message)
    if not _ALLOW.search(text):
        return None
    low = text.lower()
    if re.search(r"carte\s*grise|immatriculation|بطاقة|matricula", low, re.I):
        return "carte_grise"
    if re.search(r"urgence|112|samu|طوارئ|emergencia", low, re.I):
        return "urgences"
    if re.search(r"\bapl\b|aide\s+au\s+logement|منحة\s*السكن", low, re.I):
        return "apl"
    if re.search(r"\bame\b|\bcpam\b|ameli|puma|assurance\s+maladie", low, re.I):
        return "ame_cpam"
    if re.search(r"permis|driving\s+licen|conducir", low, re.I):
        return "permis"
    return "admin_in_scope"


def is_in_scope_allowed(message: str) -> bool:
    return allowlist_topic(message) is not None
