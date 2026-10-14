"""User data erasure — DELETE /ai/users/{user_id}/data.

Called by the frontend when an account is deleted (RGPD, droit à l'effacement).
Restricted to the frontend server by the shared internal token.
"""

from fastapi import APIRouter, Depends
from loguru import logger

from app.core.security import require_internal_caller
from app.models.database import delete_user_conversations

router = APIRouter(tags=["users"], dependencies=[Depends(require_internal_caller)])


@router.delete("/users/{user_id}/data")
async def erase_user_data(user_id: str) -> dict:
    """Erase every conversation, and its messages, owned by the account."""
    deleted = await delete_user_conversations(user_id)
    logger.info(f"🗑️  Erased {deleted} conversation(s) for a deleted account.")
    return {"deleted_conversations": deleted}
