"""Conversations and messages in PostgreSQL (schema ``ai``).

Replaces the SQLite file the service used to keep inside its container, which
was lost at every redeploy. Earlier conversations are not carried over: they
are kept 30 days at most, and the old file did not survive redeploys anyway.

Revision ID: 0001
Revises:
Create Date: 2026-10-15
"""

import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

SCHEMA = "ai"


def upgrade() -> None:
    # env.py has created the schema already (the version table lives there).

    op.create_table(
        "conversations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), nullable=True),
        sa.Column("language", sa.String(5), server_default="FR"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        schema=SCHEMA,
    )
    op.create_index("ix_conversations_user_id", "conversations", ["user_id"], schema=SCHEMA)
    # The retention purge scans by inactivity.
    op.create_index("ix_conversations_updated_at", "conversations", ["updated_at"], schema=SCHEMA)

    op.create_table(
        "messages",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "conversation_id",
            sa.String(36),
            sa.ForeignKey(f"{SCHEMA}.conversations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        schema=SCHEMA,
    )
    op.create_index("ix_messages_conversation_id", "messages", ["conversation_id"], schema=SCHEMA)


def downgrade() -> None:
    op.drop_table("messages", schema=SCHEMA)
    op.drop_table("conversations", schema=SCHEMA)
