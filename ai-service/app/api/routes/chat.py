"""Chat route — POST /ai/chat."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database import get_session
from app.models.schemas import ChatRequest, ChatResponse
from app.services.chat_service import chat_service

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    session: AsyncSession = Depends(get_session),
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
    )
    return ChatResponse(**result)
