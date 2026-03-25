"""Document analysis route — POST /ai/analyze-document."""

from fastapi import APIRouter

from app.models.schemas import DocumentAnalysisRequest, DocumentAnalysisResponse
from app.services.llm_service import llm_service

router = APIRouter(tags=["document"])


@router.post("/analyze-document", response_model=DocumentAnalysisResponse)
async def analyze_document(request: DocumentAnalysisRequest) -> DocumentAnalysisResponse:
    """Analyse an administrative document and provide structured feedback.

    The response includes:
    - A plain-language analysis of the document content
    - A list of missing information / required fields
    - Actionable recommendations for the user
    """
    lang_instruction = {
        "EN": "Please respond in English.",
        "AR": "يرجى الرد باللغة العربية.",
        "ES": "Por favor responde en español.",
    }.get(request.language.upper(), "")

    prompt = (
        f"{lang_instruction}\n\n" if lang_instruction else ""
    ) + (
        f"Tu es un expert administratif français. Analyse le document suivant de type "
        f"'{request.document_type}' et fournis :\n"
        f"1. Une analyse claire du contenu\n"
        f"2. Les informations manquantes ou incomplètes (liste)\n"
        f"3. Des recommandations concrètes pour compléter ou corriger le dossier\n\n"
        f"Contenu du document :\n{request.document_content}\n\n"
        f"Réponds en JSON avec les clés 'analysis', 'missing_info' (liste) et "
        f"'recommendations' (liste)."
    )

    raw = llm_service.generate(prompt)

    # Try to parse JSON from LLM; fall back to plain-text analysis
    try:
        import json

        # Extract JSON block if surrounded by markdown code fences
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
        analysis = parsed.get("analysis", raw)
        missing_info = parsed.get("missing_info", [])
        recommendations = parsed.get("recommendations", [])
    except Exception:  # noqa: BLE001
        analysis = raw
        missing_info = []
        recommendations = []

    return DocumentAnalysisResponse(
        analysis=analysis,
        missing_info=missing_info,
        recommendations=recommendations,
    )
