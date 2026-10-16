"""POST /ai/chat/stream framing and request limits, the chat service faked.

The stored conversation is covered by test_conversations_pg.py.
"""

import json
import time

import jwt as pyjwt
import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.api.routes import chat
from app.core.security import frontend_claims
from app.models.schemas import MAX_CHAT_MESSAGE

SECRET = "test-secret-at-least-32-bytes-long-0123456789"


def token(sub=None):
    claims = {"iss": "iadaf-frontend", "aud": "iadaf-backend", "exp": int(time.time()) + 60}
    if sub:
        claims["sub"] = sub
    return {"Authorization": "Bearer " + pyjwt.encode(claims, SECRET, algorithm="HS256")}


def events(body: str):
    """(event, data) pairs of a text/event-stream body."""
    parsed = []
    for block in body.strip().split("\n\n"):
        fields = dict(line.split(": ", 1) for line in block.split("\n"))
        parsed.append((fields["event"], json.loads(fields["data"])))
    return parsed


@pytest.fixture
def client(monkeypatch):
    calls = []

    async def fake_stream(message, conversation_id, language="FR", user_id=None):
        calls.append({"message": message, "language": language, "user_id": user_id})
        yield "meta", {"conversation_id": "c-1"}
        yield "token", {"text": "## Étapes\n1. "}
        yield "token", {"text": "Prendre rendez-vous"}
        yield "done", {"sources": ["demarches.json"]}

    monkeypatch.setattr(chat.chat_service, "chat_stream", fake_stream)
    app = FastAPI()
    app.include_router(chat.router, prefix="/ai", dependencies=[Depends(frontend_claims)])
    with TestClient(app) as test_client:
        test_client.calls = calls
        yield test_client


def stream(client, body, headers):
    return client.post("/ai/chat/stream", json=body, headers=headers)


def test_answer_is_streamed_as_server_sent_events(client):
    response = stream(client, {"message": "Carte vitale ?"}, token("u-1"))

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    # No proxy may compress — hence buffer — the stream.
    assert "no-transform" in response.headers["cache-control"]
    assert events(response.text) == [
        ("meta", {"conversation_id": "c-1"}),
        # Newlines inside the text survive the SSE framing.
        ("token", {"text": "## Étapes\n1. "}),
        ("token", {"text": "Prendre rendez-vous"}),
        ("done", {"sources": ["demarches.json"]}),
    ]


def test_the_account_comes_from_the_token(client):
    stream(client, {"message": "q"}, token("u-1"))
    stream(client, {"message": "q"}, token())
    assert [call["user_id"] for call in client.calls] == ["u-1", None]


def test_without_a_token_nothing_is_generated(client):
    assert stream(client, {"message": "q"}, {}).status_code == 401
    assert client.calls == []


@pytest.mark.parametrize(
    "body",
    [
        {"message": ""},
        {"message": "x" * (MAX_CHAT_MESSAGE + 1)},
        {"message": "q", "language": "de"},
        {"message": "q", "conversation_id": "c" * 65},
    ],
    ids=["empty", "too-long", "unsupported-language", "oversized-id"],
)
def test_requests_that_would_cost_for_nothing_are_rejected(client, body):
    assert stream(client, body, token("u-1")).status_code == 422
    assert client.calls == []


def test_language_codes_are_case_insensitive(client):
    for language in ("fr", "AR"):
        assert stream(client, {"message": "q", "language": language}, token()).status_code == 200
