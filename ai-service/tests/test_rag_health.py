import asyncio

import pytest
from fastapi import HTTPException

from app.api.routes.health import actuator_health, health
from app.services.rag_service import RAGService


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


def test_health_returns_503_when_rag_is_unavailable(monkeypatch):
    monkeypatch.setattr(RAGService, "is_ready", property(lambda self: False))

    with pytest.raises(HTTPException) as raised:
        asyncio.run(health())
    assert raised.value.status_code == 503
    assert raised.value.detail == "RAG pipeline is not ready"

    with pytest.raises(HTTPException) as raised:
        asyncio.run(actuator_health())
    assert raised.value.status_code == 503


def test_health_returns_200_when_rag_is_ready(monkeypatch):
    monkeypatch.setattr(RAGService, "is_ready", property(lambda self: True))

    response = asyncio.run(health())

    assert response.status == "UP"
