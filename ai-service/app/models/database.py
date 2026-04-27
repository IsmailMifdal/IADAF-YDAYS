"""SQLAlchemy async models for conversation persistence.

Uses SQLite (via aiosqlite) for conversations.
Uses PostgreSQL (via asyncpg) for lead emails.
"""

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, relationship

from app.core.config import settings

# ---------------------------------------------------------------------------
# Engines
# ---------------------------------------------------------------------------

# SQLite engine for conversations/messages
engine = create_async_engine(settings.database_url, echo=False)

# PostgreSQL engine for lead emails
pg_engine = create_async_engine(settings.postgres_url, echo=False)


# ---------------------------------------------------------------------------
# Base declarative classes
# ---------------------------------------------------------------------------


class Base(DeclarativeBase):
    """Shared declarative base for SQLite models."""


class PgBase(DeclarativeBase):
    """Declarative base for PostgreSQL models."""


# ---------------------------------------------------------------------------
# SQLite models (conversations)
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
# PostgreSQL models (lead emails)
# ---------------------------------------------------------------------------


class LeadEmail(PgBase):
    """Stores lead emails collected from the accueil chat."""

    __tablename__ = "lead_emails"

    id = Column(String(36), primary_key=True)
    email = Column(String(255), nullable=False)
    source = Column(String(50), default="accueil_chat")
    created_at = Column(DateTime, default=func.now())

    __table_args__ = (
        UniqueConstraint("email", "source", name="uq_lead_email_source"),
    )


# ---------------------------------------------------------------------------
# Helper: initialise tables
# ---------------------------------------------------------------------------


async def init_db() -> None:
    """Create all database tables (idempotent)."""
    # SQLite tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # PostgreSQL tables
    async with pg_engine.begin() as conn:
        await conn.run_sync(PgBase.metadata.create_all)


async def get_session() -> AsyncSession:  # type: ignore[return]
    """Yield an async SQLAlchemy session for SQLite."""
    async with AsyncSession(engine, expire_on_commit=False) as session:
        yield session


async def get_pg_session() -> AsyncSession:  # type: ignore[return]
    """Yield an async SQLAlchemy session for PostgreSQL."""
    async with AsyncSession(pg_engine, expire_on_commit=False) as session:
        yield session
