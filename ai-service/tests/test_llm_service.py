"""LLM calls never block the event loop, and degrade instead of crashing."""

import asyncio
import time
from types import SimpleNamespace

from app.services.llm_service import (
    GENERATION_ERROR_MESSAGE,
    UNAVAILABLE_MESSAGE,
    LLMService,
)


class SlowLLM:
    """Answers after a delay, like a remote model."""

    async def ainvoke(self, prompt):
        await asyncio.sleep(0.3)
        return SimpleNamespace(content=f"réponse à {prompt}")

    async def astream(self, prompt):
        for piece in ("Bon", "", "jour"):
            await asyncio.sleep(0.01)
            yield SimpleNamespace(content=piece)


class BrokenLLM:
    async def ainvoke(self, prompt):
        raise RuntimeError("quota exceeded")


def service(llm):
    llm_service = LLMService()
    llm_service._llm = llm
    return llm_service


async def collect(stream):
    return [piece async for piece in stream]


def test_concurrent_answers_do_not_wait_for_each_other():
    llm_service = service(SlowLLM())

    async def three_at_once():
        return await asyncio.gather(*(llm_service.agenerate(str(i)) for i in range(3)))

    started = time.perf_counter()
    answers = asyncio.run(three_at_once())
    # Serialised, three 0.3 s calls would take 0.9 s.
    assert time.perf_counter() - started < 0.6
    assert answers == ["réponse à 0", "réponse à 1", "réponse à 2"]


def test_stream_yields_the_pieces_and_skips_empty_ones():
    assert asyncio.run(collect(service(SlowLLM()).astream("q"))) == ["Bon", "jour"]


def test_without_a_backend_the_user_gets_a_message_not_an_error():
    assert asyncio.run(service(None).agenerate("q")) == UNAVAILABLE_MESSAGE
    assert asyncio.run(collect(service(None).astream("q"))) == [UNAVAILABLE_MESSAGE]


def test_a_backend_failure_is_reported_politely():
    assert asyncio.run(service(BrokenLLM()).agenerate("q")) == GENERATION_ERROR_MESSAGE
