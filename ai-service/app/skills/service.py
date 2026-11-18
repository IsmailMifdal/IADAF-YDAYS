"""Orchestrate skills and produce user-facing payloads."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

import re

from app.skills.ants_cost import ants_carte_grise_recap
from app.skills.dossier_state import build_dossier_state, format_state_for_prompt
from app.skills.prefill import build_prefill_recap
from app.skills.router import Skill, route_skill

REFUSE_MESSAGE = (
    "Je ne peux pas aider sur cette demande illégale ou dangereuse. "
    "Je reste disponible pour les démarches administratives françaises "
    "(séjour, CAF, Ameli, impôts, permis, carte grise…) en français ou en anglais. "
    "Consultez aussi https://www.service-public.fr/."
)

REFUSE_FINANCE_MESSAGE = (
    "Je ne fournis pas de conseil boursier, de trading ni d'effet de levier. "
    "Je suis l'assistant IADAF pour les démarches administratives françaises "
    "(séjour, CAF, Ameli, impôts, permis, carte grise…). "
    "Posez une question de démarche ou consultez https://www.service-public.fr/."
)

_FINANCE_HINT = re.compile(
    r"bourse|trading|trader|levier|leverage|apalancamiento|scalping|"
    r"رافعة|تداول|crypto",
    re.I,
)
_CARTE_GRISE_HINT = re.compile(
    r"carte\s*grise|immatriculation|certificat\s+d['']?immatriculation",
    re.I,
)

PRECHECK_HINT = (
    "Un scan flou ou illisible sera en général refusé : reprenez une photo nette, "
    "texte lisible, bien éclairé. Pour la pré-vérification d'une pièce, déposez le "
    "fichier dans votre pack : les contrôles qualité / MRZ / IBAN / dates sont "
    "déterministes (sans LLM). Je ne « valide » pas juridiquement un dossier."
)


def run_skill(
    message: str,
    *,
    skill: Optional[Skill] = None,
    chemin_id: Optional[str] = None,
    pack_slug: Optional[str] = None,
    provided_documents: Optional[List[str]] = None,
    piece_statuses: Optional[Dict[str, str]] = None,
    extracted_fields: Optional[Dict[str, Any]] = None,
    anomalies: Optional[List[str]] = None,
) -> Dict[str, Any]:
    chosen = route_skill(message, forced=skill)
    state = build_dossier_state(
        chemin_id=chemin_id,
        pack_slug=pack_slug,
        provided_documents=provided_documents,
        piece_statuses=piece_statuses,
        extracted_fields=extracted_fields,
        anomalies=anomalies,
    )

    if chosen == "refuse":
        body = REFUSE_FINANCE_MESSAGE if _FINANCE_HINT.search(message or "") else REFUSE_MESSAGE
        return {
            "skill": chosen,
            "dossier_state": state,
            "response": body,
            "prefill": None,
            "needs_llm": False,
            "reason_code": "finance_advice" if _FINANCE_HINT.search(message or "") else "illegal_or_dangerous",
        }

    if chosen == "checklist":
        missing = state.get("missing") or []
        if missing:
            body = (
                f"Pour « {state.get('title') or 'votre démarche'} », il manque encore :\n"
                + "\n".join(f"- {m}" for m in missing)
                + f"\n\nOrganisme : {state.get('organism') or '—'}\n"
                f"Portail : {state.get('portal_url') or 'https://www.service-public.fr/'}\n"
                f"{state.get('disclaimer')}"
            )
        else:
            body = (
                f"Checklist « {state.get('title')} » : toutes les pièces requises sont marquées présentes. "
                "Vérifiez encore les alertes de pré-vérification pièce par pièce avant dépôt.\n"
                f"{state.get('disclaimer')}"
            )
        return {
            "skill": chosen,
            "dossier_state": state,
            "response": body,
            "prefill": None,
            "needs_llm": False,
        }

    if chosen == "precheck":
        return {
            "skill": chosen,
            "dossier_state": state,
            "response": PRECHECK_HINT,
            "prefill": None,
            "needs_llm": False,
        }

    if chosen == "prefill":
        prefill = build_prefill_recap(
            chemin_id=chemin_id or state.get("chemin_id"),
            pack_slug=pack_slug or state.get("pack_slug"),
            extracted_fields=extracted_fields or state.get("extracted_fields"),
        )
        return {
            "skill": chosen,
            "dossier_state": state,
            "response": prefill["message"],
            "prefill": prefill,
            "needs_llm": False,
        }

    # Carte grise / immatriculation — deterministic ANTS portal (no invented fee).
    # Multilingual short recap so we do not false-refuse or invent prefecture routing.
    if _CARTE_GRISE_HINT.search(message or ""):
        ants = ants_carte_grise_recap()
        bilingual = (
            ants["message"]
            + "\n\nEN: Apply online on ANTS https://immatriculation.ants.gouv.fr/ "
            "(not a default prefecture counter process). Do not invent fees."
        )
        return {
            "skill": "qa",
            "dossier_state": state,
            "response": bilingual,
            "prefill": None,
            "needs_llm": False,
            "ants": ants,
            "prompt_state": format_state_for_prompt(state)
            if (chemin_id or pack_slug or provided_documents)
            else None,
        }

    # qa — LLM + RAG, with dossier_state injected by caller
    return {
        "skill": "qa",
        "dossier_state": state,
        "response": None,
        "prefill": None,
        "needs_llm": True,
        "prompt_state": format_state_for_prompt(state) if (chemin_id or pack_slug or provided_documents) else None,
    }
