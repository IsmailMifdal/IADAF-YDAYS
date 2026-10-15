"""Chat route — POST /ai/chat."""

from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import current_user_id
from app.models.database import get_session
from app.models.schemas import ChatRequest, ChatResponse
from app.services.chat_service import chat_service

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    session: AsyncSession = Depends(get_session),
    user_id: Optional[str] = Depends(current_user_id),
) -> ChatResponse:
    """Process a user chat message and return the AI response.

    Maintains conversation context across multiple turns using
    the optional ``conversation_id`` field.
    """
    result = await chat_service.chat(
        session=session,
        message=request.message,
        conversation_id=request.conversation_id,
        language=request.language,
        user_id=user_id,
    )
    return ChatResponse(**result)
