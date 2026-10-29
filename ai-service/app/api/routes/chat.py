"""Chat routes — POST /ai/chat, and POST /ai/chat/stream for the same answer
streamed as Server-Sent Events."""

import json
from typing import AsyncIterator, Dict, Optional, Tuple

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import current_user_id
from app.models.database import get_session
from app.models.schemas import ChatRequest, ChatResponse
from app.services.chat_service import chat_service

router = APIRouter(tags=["chat"])

# no-transform: no proxy may compress, hence buffer, the stream (Next.js and
# Caddy both honour it). X-Accel-Buffering: the same for nginx, should one
# ever sit in front.
SSE_HEADERS = {"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"}


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
        chemin_id=request.chemin_id,
        pack_slug=request.pack_slug,
        provided_documents=request.provided_documents,
        skill=request.skill,
    )
    return ChatResponse(**result)


@router.post("/chat/stream")
async def chat_stream(
    request: ChatRequest,
    user_id: Optional[str] = Depends(current_user_id),
) -> StreamingResponse:
    """Same as ``/chat``, the answer sent as it is generated.

    ``text/event-stream``: one ``meta`` event (``conversation_id``), then
    ``token`` events (``text``, to append), then ``done`` (``sources``) — or
    ``error`` (``message``) if the answer broke off.
    """
    events = chat_service.chat_stream(
        message=request.message,
        conversation_id=request.conversation_id,
        language=request.language,
        user_id=user_id,
        chemin_id=request.chemin_id,
        pack_slug=request.pack_slug,
        provided_documents=request.provided_documents,
        skill=request.skill,
    )
    return StreamingResponse(_sse(events), media_type="text/event-stream", headers=SSE_HEADERS)


async def _sse(events: AsyncIterator[Tuple[str, Dict[str, object]]]) -> AsyncIterator[str]:
    async for event, data in events:
        # JSON keeps newlines in the text from breaking the SSE framing.
        yield f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
