"""Document analysis route — POST /ai/analyze-document.

Completeness is computed deterministically from dossier_state; the LLM only
rephrases the user-facing message when needed.
"""

from fastapi import APIRouter

from app.models.schemas import DocumentAnalysisRequest, DocumentAnalysisResponse
from app.services.llm_service import llm_service
from app.skills.dossier_state import build_dossier_state

router = APIRouter(tags=["document"])


def _deterministic_completeness(request: DocumentAnalysisRequest) -> DocumentAnalysisResponse:
    provided = list(request.provided_documents or [])
    missing_hint = list(request.missing_documents or [])
    # Parse legacy free-text summary if structured fields absent
    if not provided and not missing_hint and request.document_content:
        for line in request.document_content.splitlines():
            line = line.strip()
            if line.startswith("- ") and "manqu" not in (request.document_content[:200].lower()):
                pass

    state = build_dossier_state(
        chemin_id=request.chemin_id,
        pack_slug=request.pack_slug or request.document_type,
        provided_documents=provided or _parse_provided(request.document_content),
        piece_statuses=request.piece_statuses,
        extracted_fields=request.extracted_fields,
        anomalies=_parse_flagged(request.document_content),
    )
    missing = list(state.get("missing") or missing_hint)
    recommendations = []
    if missing:
        recommendations.append(
            "Ajoutez les pièces manquantes listées, puis relancez la pré-vérification."
        )
    if state.get("anomalies"):
        recommendations.append(
            "Corrigez les alertes de pré-vérification (qualité, MRZ, IBAN, dates) avant dépôt."
        )
    recommendations.append(state.get("disclaimer") or "")
    if state.get("portal_url"):
        recommendations.append(f"Portail officiel : {state['portal_url']}")

    title = state.get("title") or request.document_type
    if missing:
        analysis = (
            f"Dossier « {title} » incomplet : {len(missing)} pièce(s) manquante(s). "
            "Complétez la checklist avant de déposer auprès de l'administration."
        )
    elif state.get("anomalies"):
        analysis = (
            f"Pièces présentes pour « {title} », mais des alertes de pré-vérification restent ouvertes."
        )
    else:
        analysis = (
            f"Checklist « {title} » : pièces requises présentes. "
            "Vérifiez encore chaque contrôle pièce à pièce — seule l'administration décide."
        )

    return DocumentAnalysisResponse(
        analysis=analysis,
        missing_info=missing,
        recommendations=[r for r in recommendations if r],
        dossier_state=state,
        deterministic=True,
    )


def _parse_provided(content: str) -> list[str]:
    items: list[str] = []
    section = None
    for line in (content or "").splitlines():
        low = line.lower().strip()
        if low.startswith("pièces fournies") or low.startswith("pieces fournies"):
            section = "provided"
            continue
        if low.startswith("pièces encore manquantes") or low.startswith("pieces encore"):
            section = "missing"
            continue
        if section == "provided" and line.strip().startswith("- "):
            label = line.strip()[2:].strip()
            if label and label.lower() != "aucune":
                items.append(label)
    return items


def _parse_flagged(content: str) -> list[str]:
    flags: list[str] = []
    capture = False
    for line in (content or "").splitlines():
        if "pré-vérification" in line.lower() or "pre-verification" in line.lower():
            capture = True
            continue
        if capture and line.strip().startswith("- "):
            flags.append(line.strip()[2:].strip())
    return flags


@router.post("/analyze-document", response_model=DocumentAnalysisResponse)
async def analyze_document(request: DocumentAnalysisRequest) -> DocumentAnalysisResponse:
    """Return structured completeness feedback.

    Primary path: deterministic dossier_state. Optional LLM polish when
    language is not FR and the caller wants a short paraphrase.
    """
    base = _deterministic_completeness(request)

    if request.language.upper() == "FR":
        return base

    lang_instruction = {
        "EN": "Please respond in English.",
        "AR": "يرجى الرد باللغة العربية.",
        "ES": "Por favor responde en español.",
    }.get(request.language.upper(), "")

    prompt = (
        f"{lang_instruction}\n\n"
        "Reformule brièvement ce diagnostic de dossier administratif sans ajouter de faits :\n"
        f"Analyse: {base.analysis}\n"
        f"Manques: {base.missing_info}\n"
        f"Reco: {base.recommendations}\n"
        "Réponds en JSON avec keys analysis, missing_info, recommendations."
    )
    try:
        raw = await llm_service.agenerate(prompt)
        import json

        cleaned = raw
        if "```" in raw:
            parts = raw.split("```")
            for part in parts:
                part = part.strip()
                if part.startswith("json"):
                    part = part.removeprefix("json").strip()
                if part.startswith("{"):
                    cleaned = part
                    break
        parsed = json.loads(cleaned)
        return DocumentAnalysisResponse(
            analysis=parsed.get("analysis", base.analysis),
            missing_info=parsed.get("missing_info", base.missing_info),
            recommendations=parsed.get("recommendations", base.recommendations),
            dossier_state=base.dossier_state,
            deterministic=True,
        )
    except Exception:  # noqa: BLE001
        return base
