"""User data erasure — DELETE /ai/users/{user_id}/data.

Called by the frontend when an account is deleted (RGPD, droit à l'effacement).
Needs a frontend token carrying the account:erase scope for that very account.
"""

from fastapi import APIRouter, Depends
from loguru import logger

from app.core.security import frontend_claims, require_erase_right
from app.models.database import delete_user_conversations

router = APIRouter(tags=["users"])


@router.delete("/users/{user_id}/data")
async def erase_user_data(user_id: str, claims: dict = Depends(frontend_claims)) -> dict:
    """Erase every conversation, and its messages, owned by the account."""
    require_erase_right(user_id, claims)
    deleted = await delete_user_conversations(user_id)
    logger.info(f"🗑️  Erased {deleted} conversation(s) for a deleted account.")
    return {"deleted_conversations": deleted}
