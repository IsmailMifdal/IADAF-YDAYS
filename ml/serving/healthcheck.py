#!/usr/bin/env python3
"""Ping Strata (or any OpenAI-compatible server): /v1/models + one chat completion."""

from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "eval"))
from openai_compat import chat_payload, completion_text  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--base-url",
        default=os.environ.get("OPENAI_BASE_URL", "http://127.0.0.1:8080/v1"),
    )
    parser.add_argument(
        "--api-key",
        default=os.environ.get("OPENAI_API_KEY")
        or os.environ.get("STRATA_API_KEY")
        or "iadaf-dev-local-key",
    )
    parser.add_argument("--model", default=os.environ.get("OPENAI_MODEL", ""))
    parser.add_argument("--timeout", type=float, default=120.0)
    args = parser.parse_args()
    base = args.base_url.rstrip("/")
    headers = {"Authorization": f"Bearer {args.api_key}"}

    with httpx.Client(timeout=args.timeout, headers=headers) as client:
        t0 = time.perf_counter()
        r = client.get(f"{base}/models")
        r.raise_for_status()
        models = r.json()
        ids = [m.get("id") for m in models.get("data", []) if m.get("id")]
        print(f"OK  GET /models ({(time.perf_counter() - t0) * 1000:.0f} ms) → {ids or models}")

        model = args.model or (ids[0] if ids else "")
        if not model:
            print("FAIL no model id", file=sys.stderr)
            return 1

        t1 = time.perf_counter()
        chat = client.post(
            f"{base}/chat/completions",
            json=chat_payload(
                model,
                [{"role": "user", "content": "Réponds en une phrase: qu'est-ce que la CPAM ?"}],
                max_tokens=256,
            ),
        )
        chat.raise_for_status()
        body = chat.json()
        content = completion_text(body)
        if not content:
            print(f"FAIL empty content — raw choice: {body.get('choices')}", file=sys.stderr)
            return 1
        print(
            f"OK  chat/completions model={model} "
            f"({(time.perf_counter() - t1) * 1000:.0f} ms)\n{content[:300]}"
        )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except httpx.HTTPError as exc:
        print(f"FAIL {exc}", file=sys.stderr)
        raise SystemExit(1)
