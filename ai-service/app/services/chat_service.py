"""Chat service — manages conversation sessions and delegates to RAG."""

import uuid
from typing import Dict, List, Optional

from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database import Conversation, Message
from app.services.rag_service import rag_service


class ChatService:
    """Handles multi-turn conversations using RAG for answer generation."""

    async def chat(
        self,
        session: AsyncSession,
        message: str,
        conversation_id: Optional[str],
        language: str = "FR",
    ) -> Dict[str, object]:
        """Process a user message and return the assistant response.

        Args:
            session: Async SQLAlchemy session.
            message: The user's message.
            conversation_id: Existing conversation ID or ``None`` for a new one.
            language: Desired response language.

        Returns:
            dict with ``response`` (str), ``conversation_id`` (str),
            and ``sources`` (list[str]).
        """
        # Retrieve or create conversation
        conversation = await self._get_or_create_conversation(
            session, conversation_id, language
        )

        # Persist user message
        user_msg = Message(
            id=str(uuid.uuid4()),
            conversation_id=conversation.id,
            role="user",
            content=message,
        )
        session.add(user_msg)

        # Generate answer via RAG
        result = rag_service.query(question=message, language=language)
        answer: str = result["answer"]
        sources: List[str] = result.get("sources", [])

        # Persist assistant message
        assistant_msg = Message(
            id=str(uuid.uuid4()),
            conversation_id=conversation.id,
            role="assistant",
            content=answer,
        )
        session.add(assistant_msg)
        await session.commit()

        logger.debug(f"Chat — conversation={conversation.id} sources={sources}")

        return {
            "response": answer,
            "conversation_id": conversation.id,
            "sources": sources,
        }

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    async def _get_or_create_conversation(
        session: AsyncSession,
        conversation_id: Optional[str],
        language: str,
    ) -> Conversation:
        """Return an existing conversation or create a new one."""
        if conversation_id:
            result = await session.execute(
                select(Conversation).where(Conversation.id == conversation_id)
            )
            conversation = result.scalar_one_or_none()
            if conversation:
                return conversation

        # Create a new conversation
        conversation = Conversation(
            id=str(uuid.uuid4()),
            language=language,
        )
        session.add(conversation)
        await session.flush()
        return conversation


# Module-level singleton
chat_service = ChatService()
