"""Anonymous counts of pre-check outcomes, kept by analytics-service.

Only the document category and each check's id and status are sent — no
user, no document, no extracted value — so the counts are statistics, not
personal data. Best effort: a failure never affects the user's result.
"""

import httpx
from loguru import logger

from app.core.config import settings
from app.documents.analyzer import Analysis


async def record(result: Analysis, authorization: str) -> None:
    payload = {
        "category": result.category,
        "checks": [{"id": c.id, "status": c.status} for c in result.checks],
    }
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.post(
                f"{settings.gateway_url}/api/analytics/document-checks",
                headers={"Authorization": authorization},
                json=payload,
            )
            response.raise_for_status()
    except httpx.HTTPError as exc:
        logger.warning(f"Could not record document-check stats ({type(exc).__name__}).")
