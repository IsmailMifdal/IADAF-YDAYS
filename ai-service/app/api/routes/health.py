"""Health-check routes.

GET  /ai/health         → UP when the RAG pipeline is ready, otherwise 503
GET  /actuator/health   → same, for Spring/Eureka compatibility
"""

from fastapi import APIRouter, HTTPException, status

from app.models.schemas import HealthResponse
from app.services.rag_service import rag_service

router = APIRouter(tags=["health"])


@router.get("/ai/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Return service health status."""
    if not rag_service.is_ready:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="RAG pipeline is not ready",
        )
    return HealthResponse()


@router.get("/actuator/health", response_model=HealthResponse)
async def actuator_health() -> HealthResponse:
    """Eureka-compatible health endpoint (mirrors /ai/health)."""
    return await health()
