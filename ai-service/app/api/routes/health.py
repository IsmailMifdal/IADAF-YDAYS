"""Health-check routes.

GET  /ai/health         → UP when the RAG pipeline is ready, otherwise 503
GET  /actuator/health   → same, for Spring/Eureka compatibility
"""

from fastapi import APIRouter, Response, status

from app.models.schemas import HealthResponse
from app.services.rag_service import rag_service

router = APIRouter(tags=["health"])


def _health_response(response: Response) -> HealthResponse:
    """Set the HTTP status and body from RAG readiness."""
    if not rag_service.is_ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return HealthResponse(status="DOWN")
    return HealthResponse()


@router.get("/ai/health", response_model=HealthResponse)
async def health(response: Response) -> HealthResponse:
    """Return service health status."""
    return _health_response(response)


@router.get("/actuator/health", response_model=HealthResponse)
async def actuator_health(response: Response) -> HealthResponse:
    """Eureka-compatible health endpoint (mirrors /ai/health)."""
    return _health_response(response)
