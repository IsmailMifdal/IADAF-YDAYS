#!/usr/bin/env python3
"""Mesure tok/s mono et multi-utilisateur contre llama-server."""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import os
import ssl
import statistics
import threading
import time
from pathlib import Path

import certifi
import httpx

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "artifacts" / "results" / "current" / "bench_throughput.json"

PROMPT = (
    "Tu es assistant IADAF. Explique pas a pas: affiliation CPAM, demande CAF/APL, "
    "renouvellement titre de sejour ANEF, justificatif de domicile, RIB. "
    "Structure en sections courtes avec sources officielles."
)

# Shared CA context: avoid "Too many open files" when spinning thousands of Clients.
_SSL_CTX = ssl.create_default_context(cafile=certifi.where())
_TLS = threading.local()


def one(client: httpx.Client, base: str, max_tokens: int) -> dict:
    t0 = time.perf_counter()
    r = client.post(
        f"{base.rstrip('/')}/chat/completions",
        json={
            "model": "iadaf",
            "messages": [{"role": "user", "content": PROMPT}],
            "max_tokens": max_tokens,
            "temperature": 0.1,
        },
    )
    dt = time.perf_counter() - t0
    r.raise_for_status()
    u = r.json().get("usage") or {}
    ct = int(u.get("completion_tokens") or 0)
    pt = int(u.get("prompt_tokens") or 0)
    return {
        "dt": dt,
        "ct": ct,
        "pt": pt,
        "tps": (ct / dt) if dt and ct else 0.0,
    }


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--base-url", default=os.environ.get("OPENAI_BASE_URL", "http://127.0.0.1:8080/v1"))
    p.add_argument("--api-key", default=os.environ.get("OPENAI_API_KEY", "iadaf-dev-local-key"))
    p.add_argument("--max-tokens", type=int, default=256)
    p.add_argument(
        "--levels",
        default="1,4,8,16,32",
        help="Niveaux de concurrence CSV (défaut: 1,4,8,16,32)",
    )
    p.add_argument("--timeout", type=float, default=600.0)
    p.add_argument("--engine", default="llama.cpp")
    p.add_argument("--out", type=Path, default=OUT)
    args = p.parse_args()
    conc_levels = [int(x.strip()) for x in args.levels.split(",") if x.strip()]

    headers = {"Authorization": f"Bearer {args.api_key}"}
    with httpx.Client(timeout=args.timeout, headers=headers, verify=_SSL_CTX) as client:
        # warm
        client.post(
            f"{args.base_url.rstrip('/')}/chat/completions",
            json={"model": "x", "messages": [{"role": "user", "content": "ping"}], "max_tokens": 8},
        )
        singles = [one(client, args.base_url, args.max_tokens) for _ in range(3)]

    def _thread_client() -> httpx.Client:
        c = getattr(_TLS, "client", None)
        if c is None:
            c = httpx.Client(timeout=args.timeout, headers=headers, verify=_SSL_CTX)
            _TLS.client = c
        return c

    def job(_: int) -> dict:
        try:
            return one(_thread_client(), args.base_url, min(args.max_tokens, 128))
        except Exception as exc:  # noqa: BLE001 — record failed request at high C
            return {"dt": 0.0, "ct": 0, "pt": 0, "tps": 0.0, "error": f"{type(exc).__name__}: {exc}"}

    levels = []
    for conc in conc_levels:
        print(f"concurrency={conc} …", flush=True)
        t0 = time.perf_counter()
        with concurrent.futures.ThreadPoolExecutor(max_workers=conc) as ex:
            outs = list(ex.map(job, range(conc)))
        wall = time.perf_counter() - t0
        ok_outs = [o for o in outs if o["ct"] > 0]
        total_ct = sum(o["ct"] for o in outs)
        levels.append(
            {
                "concurrency": conc,
                "ok": len(ok_outs),
                "err": conc - len(ok_outs),
                "wall_s": round(wall, 3),
                "agg_tok_s": round(total_ct / wall, 2) if wall else 0,
                "per_user_median_tps": round(statistics.median(o["tps"] for o in ok_outs), 2) if ok_outs else 0.0,
                "per_user_median_lat_s": round(statistics.median(o["dt"] for o in ok_outs), 3) if ok_outs else 0.0,
                "mean_completion_tokens": round(statistics.mean(o["ct"] for o in ok_outs), 1) if ok_outs else 0.0,
            }
        )
        print(json.dumps(levels[-1], ensure_ascii=False), flush=True)

    report = {
        "engine": args.engine,
        "single_stream": {
            "runs": [
                {k: (round(v, 3) if isinstance(v, float) else v) for k, v in r.items()}
                for r in singles
            ],
            "median_tps": round(statistics.median(r["tps"] for r in singles), 2),
            "median_latency_s": round(statistics.median(r["dt"] for r in singles), 3),
            "max_tokens": args.max_tokens,
        },
        "concurrency_levels": levels,
        "notes": {
            "slots": "llama-server --parallel limite les slots utiles",
            "levels": conc_levels,
            "literature_rtx5080_qwen3_8b_q4": "~110-130 tok/s mono @4k ctx (flash-attn)",
        },
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(
        f"median_single_tps={report['single_stream']['median_tps']} → {args.out}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
