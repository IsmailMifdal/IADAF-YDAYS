"""Chat service — manages conversation sessions and delegates to RAG."""

import uuid
from typing import AsyncIterator, Dict, List, Optional, Tuple

from loguru import logger
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import database
from app.models.database import Conversation, Message
from app.services.llm_service import llm_service
from app.services.rag_service import rag_service
from app.skills.service import run_skill

STREAM_ERROR_MESSAGE = (
    "La réponse a été interrompue par une erreur. Veuillez réessayer ; "
    "si le problème persiste, consultez service-public.fr."
)


class ChatService:
    """Handles multi-turn conversations using RAG for answer generation."""

    async def chat(
        self,
        session: AsyncSession,
        message: str,
        conversation_id: Optional[str],
        language: str = "FR",
        user_id: Optional[str] = None,
        *,
        chemin_id: Optional[str] = None,
        pack_slug: Optional[str] = None,
        provided_documents: Optional[List[str]] = None,
        skill: Optional[str] = None,
    ) -> Dict[str, object]:
        """Process a user message and return the assistant response.

        Args:
            session: Async SQLAlchemy session.
            message: The user's message.
            conversation_id: Existing conversation ID or ``None`` for a new one.
            language: Desired response language.
            user_id: Verified account id, or ``None`` for an anonymous chat.

        Returns:
            dict with ``response`` (str), ``conversation_id`` (str),
            and ``sources`` (list[str]).
        """
        conversation = await self._start_turn(session, message, conversation_id, language, user_id)

        skill_result = run_skill(
            message,
            skill=skill,  # type: ignore[arg-type]
            chemin_id=chemin_id,
            pack_slug=pack_slug,
            provided_documents=provided_documents,
        )
        sources: List[str] = []
        if skill_result.get("needs_llm"):
            question = message
            state_block = skill_result.get("prompt_state")
            if state_block:
                question = f"{state_block}\n\nQuestion: {message}"
            result = await rag_service.aquery(question=question, language=language)
            answer = result["answer"]
            sources = result.get("sources", [])
        else:
            answer = skill_result.get("response") or ""

        self._add_answer(session, conversation, answer)
        await session.commit()

        logger.debug(
            f"Chat — conversation={conversation.id} skill={skill_result.get('skill')} sources={sources}"
        )

        return {
            "response": answer,
            "conversation_id": conversation.id,
            "sources": sources,
            "skill": skill_result.get("skill"),
            "dossier_state": skill_result.get("dossier_state"),
        }

    async def chat_stream(
        self,
        message: str,
        conversation_id: Optional[str],
        language: str = "FR",
        user_id: Optional[str] = None,
        *,
        chemin_id: Optional[str] = None,
        pack_slug: Optional[str] = None,
        provided_documents: Optional[List[str]] = None,
        skill: Optional[str] = None,
    ) -> AsyncIterator[Tuple[str, Dict[str, object]]]:
        """Same as :meth:`chat`, the answer streamed as it is generated.

        Yields ``(event, data)`` pairs: ``meta`` (conversation id) first, then
        one ``token`` per piece of text, then ``done`` (sources) — or
        ``error`` if the answer broke off. The answer is stored once complete;
        an interrupted one is not.

        Opens its own session: the stream outlives the request handler, and
        with it any session the handler's dependencies provided.
        """
        async with AsyncSession(database.engine, expire_on_commit=False) as session:
            conversation = await self._start_turn(
                session, message, conversation_id, language, user_id
            )
            # The question is kept even if the answer fails, as in chat().
            await session.commit()
            yield "meta", {"conversation_id": conversation.id}

            skill_result = run_skill(
                message,
                skill=skill,  # type: ignore[arg-type]
                chemin_id=chemin_id,
                pack_slug=pack_slug,
                provided_documents=provided_documents,
            )
            if not skill_result.get("needs_llm"):
                answer = skill_result.get("response") or ""
                self._add_answer(session, conversation, answer)
                await session.commit()
                yield "token", {"text": answer}
                yield "done", {
                    "sources": [],
                    "skill": skill_result.get("skill"),
                    "dossier_state": skill_result.get("dossier_state"),
                }
                return

            pieces: List[str] = []
            try:
                question = message
                state_block = skill_result.get("prompt_state")
                if state_block:
                    question = f"{state_block}\n\nQuestion: {message}"
                prompt, sources = await rag_service.prepare(question, language)
                async for piece in llm_service.astream(prompt):
                    pieces.append(piece)
                    yield "token", {"text": piece}
            except Exception as exc:  # noqa: BLE001
                logger.error(f"Chat stream error — conversation={conversation.id}: {exc}")
                yield "error", {"message": STREAM_ERROR_MESSAGE}
                return

            self._add_answer(session, conversation, "".join(pieces))
            await session.commit()
            logger.debug(f"Chat stream — conversation={conversation.id} sources={sources}")
            yield "done", {
                "sources": sources,
                "skill": skill_result.get("skill"),
                "dossier_state": skill_result.get("dossier_state"),
            }

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _start_turn(
        self,
        session: AsyncSession,
        message: str,
        conversation_id: Optional[str],
        language: str,
        user_id: Optional[str],
    ) -> Conversation:
        """The caller's conversation, with the user's message added."""
        conversation = await self._get_or_create_conversation(
            session, conversation_id, language, user_id
        )
        # Adding messages doesn't touch the conversation row, so bump it by
        # hand: the retention purge measures inactivity from this timestamp.
        conversation.updated_at = func.now()
        session.add(
            Message(
                id=str(uuid.uuid4()),
                conversation_id=conversation.id,
                role="user",
                content=message,
            )
        )
        return conversation

    @staticmethod
    def _add_answer(session: AsyncSession, conversation: Conversation, answer: str) -> None:
        conversation.updated_at = func.now()
        session.add(
            Message(
                id=str(uuid.uuid4()),
                conversation_id=conversation.id,
                role="assistant",
                content=answer,
            )
        )

    @staticmethod
    async def _get_or_create_conversation(
        session: AsyncSession,
        conversation_id: Optional[str],
        language: str,
        user_id: Optional[str],
    ) -> Conversation:
        """Return the caller's existing conversation or create a new one.

        A conversation is only resumed by its owner (or, for an anonymous one,
        by another anonymous caller): knowing an id is not enough to read into
        or append to someone else's history.
        """
        if conversation_id:
            result = await session.execute(
                select(Conversation).where(Conversation.id == conversation_id)
            )
            conversation = result.scalar_one_or_none()
            if conversation and conversation.user_id == user_id:
                return conversation

        # Create a new conversation
        conversation = Conversation(
            id=str(uuid.uuid4()),
            language=language,
            user_id=user_id,
        )
        session.add(conversation)
        await session.flush()
        return conversation


# Module-level singleton
chat_service = ChatService()
