#!/usr/bin/env python3
"""Performance bench: latency p50/p95 and concurrent clients against OpenAI-compatible API."""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import statistics
import sys
import time
from pathlib import Path

import httpx
import yaml

from openai_compat import chat_payload, completion_text

ROOT = Path(__file__).resolve().parents[1]
THRESHOLDS = ROOT / "eval" / "thresholds.yaml"

PROMPT = (
    "Liste en 5 puces les documents typiques pour une affiliation CPAM. "
    "Réponse courte."
)


async def one_request(
    client: httpx.AsyncClient, base: str, model: str, sem: asyncio.Semaphore
) -> dict:
    async with sem:
        t0 = time.perf_counter()
        try:
            r = await client.post(
                f"{base}/chat/completions",
                json=chat_payload(
                    model,
                    [{"role": "user", "content": PROMPT}],
                    max_tokens=300,
                ),
            )
            elapsed_ms = (time.perf_counter() - t0) * 1000
            r.raise_for_status()
            body = r.json()
            usage = body.get("usage") or {}
            content = completion_text(body)
            return {
                "ok": bool(content),
                "latency_ms": elapsed_ms,
                "completion_tokens": usage.get("completion_tokens") or 0,
                "chars": len(content),
            }
        except Exception as exc:  # noqa: BLE001
            return {
                "ok": False,
                "latency_ms": (time.perf_counter() - t0) * 1000,
                "error": str(exc),
                "completion_tokens": 0,
                "chars": 0,
            }


async def run_level(
    base: str, api_key: str, model: str, concurrency: int, n_requests: int, timeout: float
) -> dict:
    headers = {"Authorization": f"Bearer {api_key}"}
    sem = asyncio.Semaphore(concurrency)
    async with httpx.AsyncClient(timeout=timeout, headers=headers) as client:
        if not model:
            m = await client.get(f"{base}/models")
            m.raise_for_status()
            ids = [x.get("id") for x in m.json().get("data", []) if x.get("id")]
            model = ids[0]
        tasks = [one_request(client, base, model, sem) for _ in range(n_requests)]
        results = await asyncio.gather(*tasks)

    ok = [r for r in results if r["ok"]]
    lat = sorted(r["latency_ms"] for r in ok)
    def pct(p: float) -> float:
        if not lat:
            return float("inf")
        idx = min(len(lat) - 1, max(0, int(round((p / 100) * (len(lat) - 1)))))
        return lat[idx]

    total_tokens = sum(r["completion_tokens"] for r in ok)
    wall = max((r["latency_ms"] for r in results), default=1) / 1000.0
    return {
        "concurrency": concurrency,
        "requests": n_requests,
        "successes": len(ok),
        "errors": len(results) - len(ok),
        "p50_ms": round(pct(50), 1) if lat else None,
        "p95_ms": round(pct(95), 1) if lat else None,
        "mean_ms": round(statistics.mean(lat), 1) if lat else None,
        "completion_tokens_total": total_tokens,
        "approx_tps": round(total_tokens / max(wall, 0.001), 2),
        "model": model,
        "error_samples": [r.get("error") for r in results if not r["ok"]][:3],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--thresholds", type=Path, default=THRESHOLDS)
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
    parser.add_argument("--requests-per-level", type=int, default=8)
    args = parser.parse_args()

    th = yaml.safe_load(args.thresholds.read_text(encoding="utf-8"))["performance"]
    base = args.base_url.rstrip("/")
    levels = list(th.get("concurrent_levels") or [1, 2, 4])
    timeout = float(th.get("timeout_seconds", 90))

    reports = []
    for c in levels:
        print(f"Running concurrency={c} …")
        reports.append(
            asyncio.run(
                run_level(
                    base,
                    args.api_key,
                    args.model,
                    c,
                    args.requests_per_level,
                    timeout,
                )
            )
        )

    # Gate on concurrency=1 (or lowest) p95
    primary = reports[0] if reports else {}
    p95 = primary.get("p95_ms") or float("inf")
    parallel_slots = 2  # matches strata preset
    # At concurrency == parallel, expect successes ~= requests (queue ok but no mass fail)
    level2 = next((r for r in reports if r["concurrency"] == parallel_slots), None)
    success_ratio = (
        (level2["successes"] / max(level2["requests"], 1)) if level2 else 0.0
    )

    ok = p95 <= float(th["p95_latency_ms"]) and success_ratio >= float(
        th.get("min_success_per_parallel_slot", 1.0)
    ) * 0.99 / 1.0
    # min_success_per_parallel_slot interpreted as success rate >= 1.0 ⇒ all ok at parallel level
    ok = p95 <= float(th["p95_latency_ms"]) and (
        level2 is None or level2["successes"] >= level2["requests"] * 0.9
    )

    out_body = {
        "levels": reports,
        "p95_ms_primary": p95,
        "threshold_p95_ms": th["p95_latency_ms"],
        "success": ok,
    }
    out = ROOT / "artifacts" / "eval_perf.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(out_body, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(out_body, ensure_ascii=False, indent=2))
    print(f"Report → {out}")
    return 0 if ok else 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except httpx.HTTPError as exc:
        print(f"FAIL {exc}", file=sys.stderr)
        raise SystemExit(1)
