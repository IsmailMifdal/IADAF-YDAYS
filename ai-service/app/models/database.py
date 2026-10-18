"""Conversation persistence — PostgreSQL, schema ``ai``.

The schema is owned by Alembic migrations (``ai-service/alembic``), applied at
startup by :func:`run_migrations`. These models describe it; they never create
or alter tables themselves.
"""

import asyncio
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import Column, DateTime, ForeignKey, MetaData, String, Text, delete, func
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, relationship

from app.core.config import settings

SCHEMA = "ai"

# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------

engine = create_async_engine(settings.database_url, echo=False, pool_pre_ping=True)


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class Base(DeclarativeBase):
    """Shared declarative base, bound to the ``ai`` schema."""

    metadata = MetaData(schema=SCHEMA)


class Conversation(Base):
    """Represents a chat conversation session."""

    __tablename__ = "conversations"

    id = Column(String(36), primary_key=True)
    # Account that owns the conversation, NULL for anonymous chats (accueil).
    # Only set from a verified frontend token — see app.core.security.
    user_id = Column(String(36), nullable=True, index=True)
    language = Column(String(5), server_default="FR")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())

    messages = relationship(
        "Message", back_populates="conversation", cascade="all, delete-orphan", passive_deletes=True
    )


class Message(Base):
    """A single message within a conversation."""

    __tablename__ = "messages"

    id = Column(String(36), primary_key=True)
    conversation_id = Column(
        String(36), ForeignKey(Conversation.id, ondelete="CASCADE"), nullable=False, index=True
    )
    role = Column(String(20), nullable=False)  # 'user' | 'assistant'
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    conversation = relationship("Conversation", back_populates="messages")


# ---------------------------------------------------------------------------
# Migrations
# ---------------------------------------------------------------------------

_ALEMBIC_DIR = Path(__file__).resolve().parents[2] / "alembic"


def _upgrade_to_head() -> None:
    from alembic import command
    from alembic.config import Config

    config = Config()
    config.set_main_option("script_location", str(_ALEMBIC_DIR))
    config.set_main_option("sqlalchemy.url", settings.database_url)
    command.upgrade(config, "head")


async def run_migrations() -> None:
    """Bring the schema up to date (idempotent).

    Run in a thread: Alembic's async environment starts its own event loop,
    which cannot nest inside the application's.
    """
    await asyncio.to_thread(_upgrade_to_head)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def get_session() -> AsyncSession:  # type: ignore[return]
    """Yield an async SQLAlchemy session."""
    async with AsyncSession(engine, expire_on_commit=False) as session:
        yield session


async def _delete_conversations(session: AsyncSession, condition) -> int:
    """Delete the conversations matching ``condition``; messages cascade."""
    result = await session.execute(delete(Conversation).where(condition))
    await session.commit()
    return result.rowcount or 0


async def delete_user_conversations(user_id: str) -> int:
    """Erase every conversation owned by ``user_id``. Returns how many."""
    async with AsyncSession(engine, expire_on_commit=False) as session:
        return await _delete_conversations(session, Conversation.user_id == user_id)


async def purge_expired_conversations(retention_days: int) -> int:
    """Erase conversations inactive for more than ``retention_days``."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    async with AsyncSession(engine, expire_on_commit=False) as session:
        return await _delete_conversations(session, Conversation.updated_at < cutoff)

