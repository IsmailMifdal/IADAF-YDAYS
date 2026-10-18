"""LLM calls never block the event loop, degrade instead of crashing, and a
stream abandoned by its reader closes the upstream request."""

import asyncio
import time
from types import SimpleNamespace

from app.services.llm_service import (
    GENERATION_ERROR_MESSAGE,
    UNAVAILABLE_MESSAGE,
    LLMService,
)


class FakeStream:
    """Stands in for the SDK's AsyncStream of completion chunks."""

    def __init__(self, pieces):
        self.pieces = pieces
        self.closed = False

    async def _chunks(self):
        for piece in self.pieces:
            await asyncio.sleep(0.01)
            yield SimpleNamespace(choices=[SimpleNamespace(delta=SimpleNamespace(content=piece))])

    def __aiter__(self):
        return self._chunks()

    async def close(self):
        self.closed = True


class FakeCompletions:
    """Stands in for ``client.chat.completions``: answers after a delay, like a remote model."""

    def __init__(self, fail=False):
        self.fail = fail
        self.requests = []
        self.stream = FakeStream(["Bon", "", "jour", None, "!"])

    async def create(self, **request):
        self.requests.append(request)
        if self.fail:
            raise RuntimeError("quota exceeded")
        if request["stream"]:
            return self.stream
        await asyncio.sleep(0.3)
        prompt = request["messages"][0]["content"]
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=f"réponse à {prompt}"))])


def service(completions):
    llm_service = LLMService()
    llm_service._client = None if completions is None else SimpleNamespace(chat=SimpleNamespace(completions=completions))
    llm_service._model = "test-model"
    return llm_service


async def collect(stream):
    return [piece async for piece in stream]


def test_concurrent_answers_do_not_wait_for_each_other():
    llm_service = service(FakeCompletions())

    async def three_at_once():
        return await asyncio.gather(*(llm_service.agenerate(str(i)) for i in range(3)))

    started = time.perf_counter()
    answers = asyncio.run(three_at_once())
    # Serialised, three 0.3 s calls would take 0.9 s.
    assert time.perf_counter() - started < 0.6
    assert answers == ["réponse à 0", "réponse à 1", "réponse à 2"]


def test_the_prompt_is_sent_as_one_user_message_with_the_settings():
    completions = FakeCompletions()
    asyncio.run(service(completions).agenerate("Carte vitale ?"))
    request = completions.requests[0]
    assert request["model"] == "test-model"
    assert request["messages"] == [{"role": "user", "content": "Carte vitale ?"}]
    assert request["stream"] is False
    assert {"temperature", "max_tokens"} <= request.keys()


def test_stream_yields_the_pieces_and_skips_empty_ones():
    completions = FakeCompletions()
    assert asyncio.run(collect(service(completions).astream("q"))) == ["Bon", "jour", "!"]
    assert completions.requests[0]["stream"] is True
    assert completions.stream.closed


def test_a_stream_abandoned_by_its_reader_closes_the_request():
    completions = FakeCompletions()

    async def read_one_piece():
        stream = service(completions).astream("q")
        first = await stream.__anext__()
        await stream.aclose()  # what Starlette does when the visitor leaves
        return first

    assert asyncio.run(read_one_piece()) == "Bon"
    assert completions.stream.closed


def test_without_a_backend_the_user_gets_a_message_not_an_error():
    assert asyncio.run(service(None).agenerate("q")) == UNAVAILABLE_MESSAGE
    assert asyncio.run(collect(service(None).astream("q"))) == [UNAVAILABLE_MESSAGE]


def test_a_backend_failure_is_reported_politely():
    assert asyncio.run(service(FakeCompletions(fail=True)).agenerate("q")) == GENERATION_ERROR_MESSAGE
