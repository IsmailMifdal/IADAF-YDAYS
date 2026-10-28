"""Helpers for OpenAI-compatible APIs (Strata / Qwen thinking models)."""

from __future__ import annotations

from typing import Any


def message_text(message: dict[str, Any] | None) -> str:
    """Extract assistant text; tolerate null content + reasoning_content (Qwen3)."""
    if not message:
        return ""
    content = message.get("content")
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict):
                parts.append(str(block.get("text") or block.get("content") or ""))
        content = "".join(parts)
    if isinstance(content, str) and content.strip():
        return content
    # Thinking models may spend the whole budget on reasoning and leave content null
    for key in ("reasoning_content", "reasoning", "refusal"):
        alt = message.get(key)
        if isinstance(alt, str) and alt.strip():
            return alt
    return ""


def completion_text(body: dict[str, Any]) -> str:
    choices = body.get("choices") or []
    if not choices:
        return ""
    choice = choices[0] or {}
    msg = choice.get("message") or choice.get("delta") or {}
    text = message_text(msg if isinstance(msg, dict) else {})
    if text:
        return text
    # rare: plain text completion
    t = choice.get("text")
    return t if isinstance(t, str) else ""


def chat_payload(
    model: str,
    messages: list[dict[str, str]],
    *,
    temperature: float = 0.1,
    max_tokens: int = 600,
    disable_thinking: bool = True,
) -> dict[str, Any]:
    """Build a chat/completions body; try to disable Qwen thinking when possible."""
    body: dict[str, Any] = {
        "model": model,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "messages": messages,
    }
    if disable_thinking:
        # Accepted by several Qwen3 OpenAI-compatible servers; ignored if unknown
        body["chat_template_kwargs"] = {"enable_thinking": False}
        body["enable_thinking"] = False
    return body
