"""Conversations in PostgreSQL: migrations, ownership, erasure, retention.

Needs a disposable database: TEST_DATABASE_URL=postgresql+asyncpg://…
Skipped otherwise. The RAG pipeline is stubbed — no model is loaded.
"""

import os
import time

import jwt as pyjwt
import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import text

pytestmark = pytest.mark.skipif(not os.environ.get("TEST_DATABASE_URL"), reason="TEST_DATABASE_URL not set")

SECRET = os.environ["INTERNAL_JWT_SECRET"]


def token(sub=None, scope=None):
    claims = {"iss": "iadaf-frontend", "aud": "iadaf-backend", "exp": int(time.time()) + 60}
    if sub:
        claims["sub"] = sub
    if scope:
        claims["scope"] = scope
    return {"Authorization": "Bearer " + pyjwt.encode(claims, SECRET, algorithm="HS256")}


@pytest.fixture(scope="module")
def env():
    from app.api.routes import chat, users
    from app.core.security import frontend_claims
    from app.models import database
    from app.services import chat_service

    chat_service.rag_service.query = lambda question, language: {"answer": "ok", "sources": []}
    app = FastAPI()
    protected = [Depends(frontend_claims)]
    app.include_router(chat.router, prefix="/ai", dependencies=protected)
    app.include_router(users.router, prefix="/ai", dependencies=protected)

    # One event loop for the whole module, as under uvicorn: pooled
    # connections are bound to the loop that opened them.
    with TestClient(app) as client:
        client.portal.call(database.run_migrations)
        client.portal.call(database.run_migrations)  # idempotent
        yield client, database


def sql(env, statement, **params):
    client, database = env

    async def run():
        async with database.engine.begin() as conn:  # commits writes
            result = await conn.execute(text(statement), params)
            return result.all() if result.returns_rows else []

    return client.portal.call(run)


def chat(client, headers, conversation_id=None):
    return client.post("/ai/chat", json={"message": "q", "conversation_id": conversation_id}, headers=headers)


def test_migrations_create_the_ai_schema(env):
    tables = {row[0] for row in sql(env, "select tablename from pg_tables where schemaname = 'ai'")}
    assert {"conversations", "messages", "alembic_version"} <= tables


def test_conversation_belongs_to_its_user(env):
    client, _ = env
    mine = chat(client, token("pg-u1")).json()["conversation_id"]
    assert chat(client, token("pg-u1"), mine).json()["conversation_id"] == mine
    assert chat(client, token("pg-u2"), mine).json()["conversation_id"] != mine
    anonymous = chat(client, token()).json()["conversation_id"]
    assert sql(env, "select user_id from ai.conversations where id = :id", id=anonymous) == [(None,)]


def test_erasure_cascades_to_messages(env):
    client, _ = env
    mine = chat(client, token("pg-erase")).json()["conversation_id"]
    assert client.delete("/ai/users/pg-erase/data", headers=token("pg-erase")).status_code == 403
    response = client.delete("/ai/users/pg-erase/data", headers=token("pg-erase", "account:erase"))
    assert response.json() == {"deleted_conversations": 1}
    assert sql(env, "select count(*) from ai.messages where conversation_id = :id", id=mine) == [(0,)]


def test_retention_purge(env):
    client, database = env
    stale = chat(client, token("pg-stale")).json()["conversation_id"]
    fresh = chat(client, token("pg-fresh")).json()["conversation_id"]
    sql(env, "update ai.conversations set updated_at = now() - interval '31 days' where id = :id", id=stale)

    assert client.portal.call(database.purge_expired_conversations, 30) >= 1
    remaining = {row[0] for row in sql(env, "select id from ai.conversations where id in (:a, :b)", a=stale, b=fresh)}
    assert remaining == {fresh}
