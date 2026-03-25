"""Health-check routes.

GET  /ai/health         → basic UP response
GET  /actuator/health   → same, for Spring/Eureka compatibility
"""

from fastapi import APIRouter

from app.models.schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/ai/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Return service health status."""
    return HealthResponse()


@router.get("/actuator/health", response_model=HealthResponse)
async def actuator_health() -> HealthResponse:
    """Eureka-compatible health endpoint (mirrors /ai/health)."""
    return HealthResponse()
