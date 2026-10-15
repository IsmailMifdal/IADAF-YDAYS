"""Pre-check of a filed document — POST /ai/documents/{id}/analyze.

The document is fetched from document-service with the caller's own token,
so that service enforces ownership: a user can only analyse their own
documents, and no file transits through the frontend.
"""

from typing import Optional
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, status
from loguru import logger
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.security import current_user_id
from app.documents import analyzer, stats

router = APIRouter(tags=["document-analysis"])

MAX_BYTES = 10 * 1024 * 1024


class AnalyzeRequest(BaseModel):
    document_type: str = Field(..., alias="documentType", min_length=1, max_length=200)


class CheckOut(BaseModel):
    id: str
    status: str
    message: str


class AnalysisOut(BaseModel):
    document_id: UUID = Field(serialization_alias="documentId")
    category: str
    status: str
    text_read: bool = Field(serialization_alias="textRead")
    checks: list[CheckOut]


@router.post("/documents/{document_id}/analyze", response_model=AnalysisOut, response_model_by_alias=True)
async def analyze_document(
    document_id: UUID,
    body: AnalyzeRequest,
    authorization: str = Header(...),
    user_id: Optional[str] = Depends(current_user_id),
) -> AnalysisOut:
    if not settings.document_analysis_enabled:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="Automated document check is disabled.")
    if not user_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Signed-in user required.")

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                f"{settings.gateway_url}/api/documents/{document_id}/content",
                headers={"Authorization": authorization},
            )
    except httpx.HTTPError as exc:
        logger.error(f"document-service unreachable: {type(exc).__name__}")
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail="Document service unreachable.") from None
    if response.status_code == 404:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Document not found.")
    if response.status_code != 200 or len(response.content) > MAX_BYTES:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail="Document could not be fetched.")

    content_type = response.headers.get("content-type", "").split(";")[0].strip()
    result = await analyzer.analyze(response.content, content_type, body.document_type)

    # Anonymous counts only — category and check outcomes, no user, no document.
    await stats.record(result, authorization)

    return AnalysisOut(
        document_id=document_id,
        category=result.category,
        status=result.status,
        text_read=result.text_read,
        checks=[CheckOut(id=c.id, status=c.status, message=c.message) for c in result.checks],
    )
