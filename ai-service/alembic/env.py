"""Alembic environment — async (asyncpg), schema ``ai``.

Invoked at startup by ``app.models.database.run_migrations``, or by hand:

    alembic -c alembic.ini upgrade head
    alembic -c alembic.ini revision -m "describe the change"
"""

import asyncio

from alembic import context
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings
from app.models.database import SCHEMA, Base

target_metadata = Base.metadata


def _url() -> str:
    return context.config.get_main_option("sqlalchemy.url") or settings.database_url


def _configure(connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        # Keeps Alembic's bookkeeping in our schema, not in `public`.
        version_table_schema=SCHEMA,
        include_schemas=True,
    )


def create_schema_if_missing(name: str) -> str:
    """DDL creating schema ``name`` only if it is missing.

    Not ``CREATE SCHEMA IF NOT EXISTS``: PostgreSQL checks the right to create
    schemas before looking, and the service's own account has none
    (docker/postgres/provision.sql creates its schema for it). The CREATE is
    reached only on a bare database, by an account allowed to run it — the
    test database, for instance.
    """
    return f"DO $$ BEGIN IF to_regnamespace('{name}') IS NULL THEN CREATE SCHEMA {name}; END IF; END $$"


def _run(connection) -> None:
    # The version table lives in the schema, so it must exist first.
    connection.execute(text(create_schema_if_missing(SCHEMA)))
    _configure(connection)
    with context.begin_transaction():
        context.run_migrations()


async def _run_online() -> None:
    engine = create_async_engine(_url())
    async with engine.begin() as connection:
        await connection.run_sync(_run)
    await engine.dispose()


if context.is_offline_mode():
    context.configure(url=_url(), target_metadata=target_metadata, version_table_schema=SCHEMA)
    with context.begin_transaction():
        context.run_migrations()
else:
    asyncio.run(_run_online())
