"""SQLAlchemy async models for conversation persistence.

Uses SQLite (via aiosqlite) for development.
Switch to PostgreSQL for production by changing DATABASE_URL.
"""

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, func
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, relationship

from app.core.config import settings

# ---------------------------------------------------------------------------
# Engine & session factory
# ---------------------------------------------------------------------------

engine = create_async_engine(settings.database_url, echo=False)


# ---------------------------------------------------------------------------
# Base declarative class
# ---------------------------------------------------------------------------


class Base(DeclarativeBase):
    """Shared declarative base."""


# ---------------------------------------------------------------------------
# ORM models
# ---------------------------------------------------------------------------


class Conversation(Base):
    """Represents a chat conversation session."""

    __tablename__ = "conversations"

    id = Column(String(36), primary_key=True)
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
# Helper: initialise tables
# ---------------------------------------------------------------------------


async def init_db() -> None:
    """Create all database tables (idempotent)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_session() -> AsyncSession:  # type: ignore[return]
    """Yield an async SQLAlchemy session (for use as a FastAPI dependency)."""
    async with AsyncSession(engine, expire_on_commit=False) as session:
        yield session
