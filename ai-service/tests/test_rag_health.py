import asyncio
import sys
from contextlib import asynccontextmanager
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

import app.services.rag_service as rag_service_module
from app.main import create_app
from app.services.rag_service import RAGService


@pytest.fixture
def client(monkeypatch):
    @asynccontextmanager
    async def no_startup(app):
        yield

    app = create_app()
    monkeypatch.setattr(app.router, "lifespan_context", no_startup)
    with TestClient(app) as test_client:
        yield test_client


def test_rag_initialisation_failure_marks_service_unready(monkeypatch):
    service = RAGService()

    def fail_setup():
        raise RuntimeError("embedding model unavailable")

    monkeypatch.setattr(service, "_setup_embeddings", fail_setup)
    service.initialise()

    assert service.is_ready is False


def test_rag_initialisation_success_marks_service_ready(monkeypatch):
    service = RAGService()
    monkeypatch.setattr(service, "_setup_embeddings", lambda: setattr(service, "_embedder", object()))
    monkeypatch.setattr(service, "_setup_vectorstore", lambda: setattr(service, "_collection", object()))

    service.initialise()

    assert service.is_ready is True


def test_indexing_failure_after_collection_opened_marks_service_unready(monkeypatch):
    service = RAGService()
    monkeypatch.setattr(service, "_setup_embeddings", lambda: setattr(service, "_embedder", object()))

    def open_then_fail():
        service._collection = object()
        raise RuntimeError("indexing failed")

    monkeypatch.setattr(service, "_setup_vectorstore", open_then_fail)
    service.initialise()

    assert service.is_ready is False
    assert asyncio.run(service.prepare("question")) == ("question", [])


def test_empty_knowledge_base_marks_service_unready(monkeypatch, tmp_path):
    class EmptyCollection:
        def count(self):
            return 0

    class FakeClient:
        def get_or_create_collection(self, *args, **kwargs):
            return EmptyCollection()

    knowledge_base = tmp_path / "knowledge_base"
    knowledge_base.mkdir()
    (knowledge_base / "invalid.json").write_text("{", encoding="utf-8")
    monkeypatch.setattr(rag_service_module, "_DATA_DIR", knowledge_base)
    monkeypatch.setattr(rag_service_module, "_VECTORSTORE_DIR", tmp_path / "vectorstore")
    monkeypatch.setitem(
        sys.modules,
        "chromadb",
        SimpleNamespace(
            Settings=lambda **kwargs: object(),
            PersistentClient=lambda **kwargs: FakeClient(),
        ),
    )

    service = RAGService()
    monkeypatch.setattr(service, "_setup_embeddings", lambda: setattr(service, "_embedder", object()))
    service.initialise()

    assert service.is_ready is False


def test_ai_health_route_returns_503_when_rag_is_unavailable(monkeypatch, client):
    monkeypatch.setattr(RAGService, "is_ready", property(lambda self: False))

    response = client.get("/ai/health")

    assert response.status_code == 503
    assert response.json()["status"] == "DOWN"


def test_actuator_health_route_returns_503_when_rag_is_unavailable(monkeypatch, client):
    monkeypatch.setattr(RAGService, "is_ready", property(lambda self: False))

    response = client.get("/actuator/health")

    assert response.status_code == 503
    assert response.json()["status"] == "DOWN"


def test_ai_health_route_returns_200_when_rag_is_ready(monkeypatch, client):
    monkeypatch.setattr(RAGService, "is_ready", property(lambda self: True))

    response = client.get("/ai/health")

    assert response.status_code == 200
    assert response.json()["status"] == "UP"


def test_actuator_health_route_returns_200_when_rag_is_ready(monkeypatch, client):
    monkeypatch.setattr(RAGService, "is_ready", property(lambda self: True))

    response = client.get("/actuator/health")

    assert response.status_code == 200
    assert response.json()["status"] == "UP"
