"""Prefill V1 — structured recap of extracted fields (no portal submission)."""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

from app.skills.chemins import resolve_chemin


def _mask_iban(value: str) -> str:
    raw = re.sub(r"\s+", "", value or "").upper()
    if len(raw) < 8:
        return "***"
    return raw[:4] + " •••• •••• " + raw[-4:]


def _mask_nir(value: str) -> str:
    digits = re.sub(r"\D", "", value or "")
    if len(digits) < 5:
        return "***"
    return digits[:1] + " " + digits[1:3] + " ** ** *** ** " + digits[-2:]


SENSITIVE_MASKERS = {
    "iban": _mask_iban,
    "iban_masked": lambda v: v if "•" in str(v) else _mask_iban(str(v)),
    "nir": _mask_nir,
}


def build_prefill_recap(
    *,
    chemin_id: Optional[str] = None,
    pack_slug: Optional[str] = None,
    extracted_fields: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    chemin = resolve_chemin(chemin_id=chemin_id, pack_slug=pack_slug)
    wanted: List[str] = list((chemin or {}).get("prefill_fields") or [])
    raw = dict(extracted_fields or {})
    # Normalize aliases
    if "iban" in raw and "iban_masked" not in raw:
        raw["iban_masked"] = raw["iban"]
    if "nir" in raw and "nir" in wanted:
        pass
    fields: Dict[str, Any] = {}
    missing_fields: List[str] = []

    for key in wanted:
        val = raw.get(key)
        if val is None or str(val).strip() == "":
            missing_fields.append(key)
            continue
        masker = SENSITIVE_MASKERS.get(key) or SENSITIVE_MASKERS.get(key.replace("_masked", ""))
        fields[key] = masker(str(val)) if masker else val

    # Include extra extracted keys not in schema (still masked if sensitive)
    for key, val in raw.items():
        if key in fields or val is None:
            continue
        masker = SENSITIVE_MASKERS.get(key)
        fields[key] = masker(str(val)) if masker else val

    portal = (chemin or {}).get("portal_url") or "https://www.service-public.fr/"
    title = (chemin or {}).get("title") or pack_slug or chemin_id or "démarche"

    lines = [
        f"Récapitulatif à reporter pour « {title} » (confirmation usager requise).",
        f"Portail officiel : {portal}",
        "IADAF ne soumet aucun formulaire à votre place.",
    ]
    for k, v in fields.items():
        lines.append(f"- {k}: {v}")
    if missing_fields:
        lines.append("Champs encore manquants : " + ", ".join(missing_fields))

    return {
        "chemin_id": (chemin or {}).get("chemin_id") or chemin_id,
        "pack_slug": (chemin or {}).get("pack_slug") or pack_slug,
        "portal_url": portal,
        "fields": fields,
        "missing_fields": missing_fields,
        "message": "\n".join(lines),
        "submit_allowed": False,
    }
