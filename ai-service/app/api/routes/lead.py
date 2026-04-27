"""Lead email collection endpoint."""

import re
import uuid

from fastapi import APIRouter, Depends
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database import LeadEmail, get_pg_session
from app.models.schemas import LeadEmailRequest, LeadEmailResponse

router = APIRouter(tags=["lead"])

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


@router.post("/lead-email", response_model=LeadEmailResponse)
async def save_lead_email(
    req: LeadEmailRequest,
    session: AsyncSession = Depends(get_pg_session),
) -> LeadEmailResponse:
    """Save a lead email collected from the accueil chat."""

    if not EMAIL_RE.match(req.email):
        return LeadEmailResponse(success=False, message="Adresse e-mail invalide.")

    # Check for duplicate
    result = await session.execute(
        select(LeadEmail).where(
            LeadEmail.email == req.email,
            LeadEmail.source == req.source,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        logger.info(f"📧 Lead email already exists: {req.email}")
        return LeadEmailResponse(success=True, message="Email déjà enregistré.")

    lead = LeadEmail(
        id=str(uuid.uuid4()),
        email=req.email,
        source=req.source,
    )
    session.add(lead)
    await session.commit()
    logger.info(f"📧 Lead email saved to PostgreSQL: {req.email} (source={req.source})")

    return LeadEmailResponse(success=True, message="Email enregistré avec succès.")
