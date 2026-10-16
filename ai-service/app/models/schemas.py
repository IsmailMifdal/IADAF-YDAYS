"""Pydantic request / response schemas for the AI service."""

from typing import List, Optional

from pydantic import BaseModel, Field

# Every text below ends up in an LLM prompt, paid per token: without a bound,
# one request within the rate limits could still cost as much as thousands.
# The chat limit leaves room for the context the welcome chat prepends.
MAX_CHAT_MESSAGE = 4_000
MAX_TRANSLATION_TEXT = 5_000
MAX_DOCUMENT_CONTENT = 20_000
LANGUAGE_PATTERN = r"^(?i:fr|en|ar|es)$"


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------


class ChatRequest(BaseModel):
    """Request body for the chat endpoint."""

    message: str = Field(..., min_length=1, max_length=MAX_CHAT_MESSAGE, description="User message")
    conversation_id: Optional[str] = Field(
        None, max_length=64, description="Existing conversation ID (optional)"
    )
    language: str = Field(
        "FR", pattern=LANGUAGE_PATTERN, description="Response language code (FR, EN, AR, ES)"
    )


class ChatResponse(BaseModel):
    """Response body for the chat endpoint."""

    response: str
    conversation_id: str
    sources: List[str] = []


# ---------------------------------------------------------------------------
# Translation
# ---------------------------------------------------------------------------


class TranslationRequest(BaseModel):
    """Request body for the translation endpoint."""

    text: str = Field(..., min_length=1, max_length=MAX_TRANSLATION_TEXT, description="Text to translate")
    target_language: str = Field(..., description="Target language code (FR, EN, AR, ES)")
    source_language: str = Field("FR", description="Source language code")


class TranslationResponse(BaseModel):
    """Response body for the translation endpoint."""

    translated_text: str
    source_language: str
    target_language: str


# ---------------------------------------------------------------------------
# Document analysis
# ---------------------------------------------------------------------------


class DocumentAnalysisRequest(BaseModel):
    """Request body for the document analysis endpoint."""

    document_content: str = Field(
        ..., min_length=1, max_length=MAX_DOCUMENT_CONTENT, description="Raw text content of the document"
    )
    document_type: str = Field(
        ..., min_length=1, max_length=100, description="Type of document (e.g. 'titre_sejour')"
    )
    language: str = Field("FR", pattern=LANGUAGE_PATTERN, description="Language of the response")


class DocumentAnalysisResponse(BaseModel):
    """Response body for the document analysis endpoint."""

    analysis: str
    missing_info: List[str] = []
    recommendations: List[str] = []


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------


class HealthResponse(BaseModel):
    """Standard health-check response."""

    status: str = "UP"
    service: str = "ai-service"
    version: str = "1.0.0"
