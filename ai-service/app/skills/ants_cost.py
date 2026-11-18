"""Deterministic ANTS carte-grise routing — no invented tariffs in weights.

Full DILA XML cost engine can be plugged later via local JSON from DELTA-14.
Until then: always point to the official simulator / portal.
"""

from __future__ import annotations

from typing import Any, Dict, Optional

ANTS_IMMAT_URL = "https://immatriculation.ants.gouv.fr/"
SERVICE_PUBLIC_CG = (
    "https://www.service-public.fr/particuliers/vosdroits/N367"
)


def ants_carte_grise_recap(
    *,
    departement: Optional[str] = None,
    demarche: Optional[str] = None,
) -> Dict[str, Any]:
    """Return a safe recap: portal + disclaimer (no fabricated fee)."""
    dep = (departement or "").strip()
    dem = (demarche or "certificat d'immatriculation").strip()
    lines = [
        f"Pour « {dem} » (carte grise), la démarche se fait en ligne sur l'ANTS : {ANTS_IMMAT_URL}",
        "Ce n'est plus un dépôt systématique en préfecture (téléprocédures).",
        "Le coût dépend du département, du type de véhicule, de la puissance et des taxes en vigueur.",
        "Je n'invente pas de montant : utilisez le simulateur / parcours officiel ANTS / service-public.fr.",
        f"Fiche orientation : {SERVICE_PUBLIC_CG}",
    ]
    if dep:
        lines.insert(1, f"Département indiqué : {dep} (les taxes régionales varient).")
    return {
        "portal_url": ANTS_IMMAT_URL,
        "service_public_url": SERVICE_PUBLIC_CG,
        "departement": dep or None,
        "demarche": dem,
        "amount_eur": None,
        "amount_source": "official_simulator_only",
        "message": "\n".join(lines),
        "submit_allowed": False,
    }
