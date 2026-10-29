"""Structured dossier_state — checklist + piece statuses (deterministic)."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from app.skills.chemins import resolve_chemin


def build_dossier_state(
    *,
    chemin_id: Optional[str] = None,
    pack_slug: Optional[str] = None,
    provided_documents: Optional[List[str]] = None,
    piece_statuses: Optional[Dict[str, str]] = None,
    extracted_fields: Optional[Dict[str, Any]] = None,
    anomalies: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Build a dossier_state JSON for chat injection / API.

    ``piece_statuses`` maps document label → ok|warning|error|missing|unknown.
    """
    chemin = resolve_chemin(chemin_id=chemin_id, pack_slug=pack_slug)
    provided = list(provided_documents or [])
    provided_norm = {p.strip().lower() for p in provided}
    statuses = dict(piece_statuses or {})
    required = list((chemin or {}).get("required_documents") or [])

    pieces: List[Dict[str, Any]] = []
    missing: List[str] = []
    for label in required:
        key = label.strip().lower()
        if label in statuses:
            st = statuses[label]
        elif key in {s.strip().lower() for s in statuses}:
            st = next(v for k, v in statuses.items() if k.strip().lower() == key)
        elif key in provided_norm or any(key in p for p in provided_norm):
            st = "uploaded"
        else:
            st = "missing"
            missing.append(label)
        pieces.append({"label": label, "status": st})

    for label, st in statuses.items():
        if not any(p["label"] == label for p in pieces):
            pieces.append({"label": label, "status": st})

    complete = len(missing) == 0 and all(
        p["status"] in ("ok", "uploaded", "warning") for p in pieces if p["label"] in required
    )

    return {
        "chemin_id": (chemin or {}).get("chemin_id") or chemin_id,
        "pack_slug": (chemin or {}).get("pack_slug") or pack_slug,
        "title": (chemin or {}).get("title"),
        "organism": (chemin or {}).get("organism"),
        "portal_url": (chemin or {}).get("portal_url"),
        "steps": list((chemin or {}).get("steps") or []),
        "pieces": pieces,
        "missing": missing,
        "provided": provided,
        "extracted_fields": dict(extracted_fields or {}),
        "anomalies": list(anomalies or []),
        "complete": complete,
        "disclaimer": (
            "Pré-vérification indicative IADAF — seule l'administration décide. "
            "Aucun dépôt automatique sur les portails officiels."
        ),
    }


def format_state_for_prompt(state: Dict[str, Any]) -> str:
    """Compact block injected into the RAG / chat system context."""
    lines = [
        "=== ÉTAT DU DOSSIER (source de vérité — ne pas inventer d'autres pièces) ===",
        f"Chemin: {state.get('title') or state.get('chemin_id')} ({state.get('chemin_id')})",
        f"Organisme: {state.get('organism') or '—'}",
        f"Complet: {'oui' if state.get('complete') else 'non'}",
    ]
    if state.get("missing"):
        lines.append("Pièces manquantes: " + "; ".join(state["missing"]))
    if state.get("provided"):
        lines.append("Pièces fournies: " + "; ".join(state["provided"]))
    for p in state.get("pieces") or []:
        lines.append(f"- {p['label']}: {p['status']}")
    if state.get("anomalies"):
        lines.append("Anomalies: " + "; ".join(state["anomalies"]))
    if state.get("extracted_fields"):
        lines.append("Champs extraits (à confirmer): " + ", ".join(
            f"{k}={v}" for k, v in state["extracted_fields"].items() if v is not None
        ))
    lines.append(state.get("disclaimer") or "")
    lines.append("=== FIN ÉTAT DOSSIER ===")
    return "\n".join(lines)
