"""SQLAlchemy async models for conversation persistence (SQLite via aiosqlite)."""

from datetime import datetime, timedelta, timezone

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, delete, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, relationship

from app.core.config import settings

# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------

engine = create_async_engine(settings.database_url, echo=False)


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class Base(DeclarativeBase):
    """Shared declarative base."""


class Conversation(Base):
    """Represents a chat conversation session."""

    __tablename__ = "conversations"

    id = Column(String(36), primary_key=True)
    # Account that owns the conversation, NULL for anonymous chats (accueil).
    # Only set from a frontend-verified identity — see app.core.security.
    user_id = Column(String(36), nullable=True, index=True)
    language = Column(String(5), default="FR")
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    """A single message within a conversation."""

    __tablename__ = "messages"

    id = Column(String(36), primary_key=True)
    conversation_id = Column(String(36), ForeignKey("conversations.id"), nullable=False)
    role = Column(String(20), nullable=False)  # 'user' | 'assistant'
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=func.now())

    conversation = relationship("Conversation", back_populates="messages")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def init_db() -> None:
    """Create all database tables (idempotent)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        # create_all never alters an existing table: databases created before
        # conversations were tied to accounts need the column added by hand.
        columns = await conn.execute(text("PRAGMA table_info(conversations)"))
        if "user_id" not in {row[1] for row in columns}:
            await conn.execute(text("ALTER TABLE conversations ADD COLUMN user_id VARCHAR(36)"))
            await conn.execute(
                text("CREATE INDEX IF NOT EXISTS ix_conversations_user_id ON conversations (user_id)")
            )


async def get_session() -> AsyncSession:  # type: ignore[return]
    """Yield an async SQLAlchemy session."""
    async with AsyncSession(engine, expire_on_commit=False) as session:
        yield session


async def _delete_conversations(session: AsyncSession, condition) -> int:
    """Delete the conversations matching ``condition`` and their messages."""
    ids = select(Conversation.id).where(condition)
    await session.execute(delete(Message).where(Message.conversation_id.in_(ids)))
    result = await session.execute(delete(Conversation).where(condition))
    await session.commit()
    return result.rowcount or 0


async def delete_user_conversations(user_id: str) -> int:
    """Erase every conversation owned by ``user_id``. Returns how many."""
    async with AsyncSession(engine, expire_on_commit=False) as session:
        return await _delete_conversations(session, Conversation.user_id == user_id)


async def purge_expired_conversations(retention_days: int) -> int:
    """Erase conversations inactive for more than ``retention_days``."""
    # SQLite stores naive UTC timestamps (func.now() → CURRENT_TIMESTAMP).
    cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=retention_days)
    async with AsyncSession(engine, expire_on_commit=False) as session:
        return await _delete_conversations(session, Conversation.updated_at < cutoff)
