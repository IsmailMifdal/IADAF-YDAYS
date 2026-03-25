"""Translation route — POST /ai/translate."""

from fastapi import APIRouter, HTTPException, status

from app.models.schemas import TranslationRequest, TranslationResponse
from app.services.translation_service import translation_service

router = APIRouter(tags=["translation"])

_SUPPORTED = translation_service.SUPPORTED_LANGUAGES


@router.post("/translate", response_model=TranslationResponse)
async def translate(request: TranslationRequest) -> TranslationResponse:
    """Translate text between supported languages (FR, EN, AR, ES).

    The source and target language codes must be one of FR, EN, AR, ES.
    """
    src = request.source_language.upper()
    tgt = request.target_language.upper()

    for code, label in [(src, "source_language"), (tgt, "target_language")]:
        if code not in _SUPPORTED:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Unsupported {label}: '{code}'. Supported: {sorted(_SUPPORTED)}",
            )

    translated = translation_service.translate(
        text=request.text,
        target_language=tgt,
        source_language=src,
    )

    return TranslationResponse(
        translated_text=translated,
        source_language=src,
        target_language=tgt,
    )
