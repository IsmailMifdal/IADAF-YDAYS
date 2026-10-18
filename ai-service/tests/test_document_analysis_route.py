"""POST /ai/documents/{id}/analyze, with document-service and analytics faked."""

import time
import uuid

import jwt as pyjwt
import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.api.routes import document_analysis
from app.core.config import settings
from app.core.security import frontend_claims
from tests.test_document_rules import pdf_with_text

SECRET = "test-secret-at-least-32-bytes-long-0123456789"


def token(sub=None):
    claims = {"iss": "iadaf-frontend", "aud": "iadaf-backend", "exp": int(time.time()) + 60}
    if sub:
        claims["sub"] = sub
    return {"Authorization": "Bearer " + pyjwt.encode(claims, SECRET, algorithm="HS256")}


class FakeGateway:
    """Stands in for httpx.AsyncClient: serves one document, records stats posts."""

    documents: dict = {}
    stats_posts: list = []

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def get(self, url, headers):
        doc_id = url.rsplit("/", 2)[-2]
        if doc_id not in self.documents:
            return _Response(404, b"", {})
        return _Response(200, self.documents[doc_id], {"content-type": "application/pdf"})

    async def post(self, url, headers, json):
        self.stats_posts.append(json)
        return _Response(204, b"", {})


class _Response:
    def __init__(self, status_code, content, headers):
        self.status_code, self.content, self.headers = status_code, content, headers

    def raise_for_status(self):
        pass


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(settings, "internal_jwt_secret", SECRET)
    monkeypatch.setattr(settings, "document_analysis_enabled", True)
    monkeypatch.setattr(document_analysis.httpx, "AsyncClient", FakeGateway)
    monkeypatch.setattr("app.documents.stats.httpx.AsyncClient", FakeGateway)
    FakeGateway.documents, FakeGateway.stats_posts = {}, []

    app = FastAPI()
    app.include_router(document_analysis.router, prefix="/ai", dependencies=[Depends(frontend_claims)])
    return TestClient(app)


def analyze(client, doc_id, headers, document_type="Titre de séjour"):
    return client.post(f"/ai/documents/{doc_id}/analyze", json={"documentType": document_type}, headers=headers)


def test_disabled_until_switched_on(client, monkeypatch):
    monkeypatch.setattr(settings, "document_analysis_enabled", False)
    assert analyze(client, uuid.uuid4(), token("u1")).status_code == 503


def test_needs_a_signed_in_user(client):
    assert analyze(client, uuid.uuid4(), {}).status_code == 401
    assert analyze(client, uuid.uuid4(), token()).status_code == 403


def test_someone_elses_document_is_not_found(client):
    # document-service answers 404 for a document the token's user doesn't own.
    assert analyze(client, uuid.uuid4(), token("u1")).status_code == 404


def test_expired_residence_permit(client):
    doc_id = str(uuid.uuid4())
    FakeGateway.documents[doc_id] = pdf_with_text("Titre de sejour", "Date d'expiration : 01/02/2026")

    response = analyze(client, doc_id, token("u1"))

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "error" and body["textRead"] is True
    assert {c["id"]: c["status"] for c in body["checks"]}["expiry"] == "error"


def test_stats_carry_no_identity(client):
    doc_id = str(uuid.uuid4())
    FakeGateway.documents[doc_id] = pdf_with_text("Titre de sejour", "Date d'expiration : 01/02/2031")

    analyze(client, doc_id, token("u1"))

    assert len(FakeGateway.stats_posts) == 1
    sent = FakeGateway.stats_posts[0]
    assert set(sent) == {"category", "checks"}
    assert all(set(check) == {"id", "status"} for check in sent["checks"])
    assert "u1" not in str(sent) and doc_id not in str(sent) and "2031" not in str(sent)
