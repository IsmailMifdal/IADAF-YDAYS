#!/usr/bin/env python3
"""Bench architecture multi-user (1→512) pour comparer engines NVIDIA.

Mesure par niveau de concurrence :
  - débit agrégé (agg_tok_s)
  - tok/s médian par requête (= proxy tok/s/user sous burst)
  - latence p50/p95
  - taux d'erreur

Profils : short (chat) | docs (extrait + precheck en contexte).
Append une ligne dans arch_scale_matrix.jsonl + rapport JSON détaillé.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import os
import ssl
import statistics
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

import certifi
import httpx
import yaml

ROOT = Path(__file__).resolve().parents[1]
RESULTS = ROOT / "artifacts" / "results" / "current"
MATRIX = RESULTS / "arch_scale_matrix.jsonl"
THRESHOLDS = ROOT / "eval" / "thresholds.yaml"

PROMPT_SHORT = (
    "Tu es assistant IADAF. Explique en sections courtes : affiliation CPAM, "
    "demande CAF/APL, renouvellement titre ANEF, justificatif de domicile. "
    "Cite des sources officielles sans inventer de montants."
)

PROMPT_DOCS = (
    "Document utilisateur (extrait OCR):\n"
    "---\n"
    "Justificatif de domicile — Facture énergie\n"
    "Nom: Dupont Marie\n"
    "Adresse: 12 rue de la Paix, 75002 Paris\n"
    "Date facture: 15/09/2026\n"
    "---\n"
    "Contrôle code: {\"valid\": true, \"errors\": []}\n\n"
    "Question: ce justificatif est-il PRÊT pour une demande ANEF / préfecture ? "
    "Liste aussi 2 pièces souvent manquantes. Réponse structurée, sans inventer de CERFA."
)

_SSL_CTX = ssl.create_default_context(cafile=certifi.where())
_TLS = threading.local()


def _load_sla() -> tuple[float, float]:
    min_tps, target = 50.0, 60.0
    if THRESHOLDS.is_file():
        thr = yaml.safe_load(THRESHOLDS.read_text(encoding="utf-8")) or {}
        perf = thr.get("performance") or {}
        min_tps = float(perf.get("min_tok_per_s_per_user", min_tps))
        target = float(perf.get("target_tok_per_s_per_user", target))
    return min_tps, target


def _resolve_model(client: httpx.Client, base: str, model: str) -> str:
    if model and model != "auto":
        return model
    r = client.get(f"{base.rstrip('/')}/models")
    r.raise_for_status()
    ids = [x.get("id") for x in r.json().get("data", []) if x.get("id")]
    if not ids:
        raise SystemExit("Aucun modèle exposé sur /v1/models")
    return ids[0]


def one(
    client: httpx.Client,
    base: str,
    model: str,
    prompt: str,
    max_tokens: int,
) -> dict:
    t0 = time.perf_counter()
    try:
        r = client.post(
            f"{base.rstrip('/')}/chat/completions",
            json={
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": max_tokens,
                "temperature": 0.1,
            },
        )
        dt = time.perf_counter() - t0
        r.raise_for_status()
        body = r.json()
        u = body.get("usage") or {}
        ct = int(u.get("completion_tokens") or 0)
        # fallback rough if usage missing
        if ct <= 0:
            text = ((body.get("choices") or [{}])[0].get("message") or {}).get("content") or ""
            ct = max(1, len(text.split()))
        pt = int(u.get("prompt_tokens") or 0)
        return {
            "dt": dt,
            "ct": ct,
            "pt": pt,
            "tps": (ct / dt) if dt and ct else 0.0,
            "ok": True,
        }
    except Exception as exc:  # noqa: BLE001
        dt = time.perf_counter() - t0
        return {
            "dt": dt,
            "ct": 0,
            "pt": 0,
            "tps": 0.0,
            "ok": False,
            "error": f"{type(exc).__name__}: {exc}",
        }


def _pct(xs: list[float], p: float) -> float:
    if not xs:
        return 0.0
    ys = sorted(xs)
    idx = min(len(ys) - 1, max(0, int(round((p / 100.0) * (len(ys) - 1)))))
    return ys[idx]


def main() -> int:
    sla50, sla60 = _load_sla()
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--base-url", default=os.environ.get("OPENAI_BASE_URL", "http://127.0.0.1:8000/v1"))
    p.add_argument("--api-key", default=os.environ.get("OPENAI_API_KEY", "iadaf-dev-local-key"))
    p.add_argument("--model", default=os.environ.get("OPENAI_MODEL", "auto"))
    p.add_argument("--track", default="unknown", help="v5a | v5b | v3_1 | …")
    p.add_argument("--engine", default="unknown", help="vllm | trtllm | llama.cpp")
    p.add_argument("--quant", default="unknown", help="fp8 | nvfp4 | q4_k_m | …")
    p.add_argument("--profile", choices=("short", "docs"), default="short")
    p.add_argument(
        "--levels",
        default="1,2,4,8,16,32,64,128,256,512",
        help="CSV concurrence (défaut jusqu'à 512)",
    )
    p.add_argument("--max-tokens", type=int, default=128)
    p.add_argument("--timeout", type=float, default=600.0)
    p.add_argument("--warmup", type=int, default=1)
    p.add_argument(
        "--out",
        type=Path,
        default=None,
        help="Rapport JSON (défaut artifacts/results/current/bench_arch_scale_<tags>.json)",
    )
    p.add_argument("--matrix", type=Path, default=MATRIX)
    args = p.parse_args()

    levels = [int(x.strip()) for x in args.levels.split(",") if x.strip()]
    prompt = PROMPT_DOCS if args.profile == "docs" else PROMPT_SHORT
    # sous forte C, borner un peu la génération pour limiter la queue
    tokens_hi = min(args.max_tokens, 64)

    tag = f"{args.track}_{args.engine}_{args.quant}_{args.profile}"
    out = args.out or (RESULTS / f"bench_arch_scale_{tag}.json")

    headers = {"Authorization": f"Bearer {args.api_key}"}
    with httpx.Client(timeout=args.timeout, headers=headers, verify=_SSL_CTX) as client:
        model = _resolve_model(client, args.base_url, args.model)
        for _ in range(max(1, args.warmup)):
            one(client, args.base_url, model, "ping IADAF", 8)

        singles = [one(client, args.base_url, model, prompt, args.max_tokens) for _ in range(3)]

    def _thread_client() -> httpx.Client:
        c = getattr(_TLS, "client", None)
        if c is None:
            c = httpx.Client(timeout=args.timeout, headers=headers, verify=_SSL_CTX)
            _TLS.client = c
        return c

    def job(_: int) -> dict:
        return one(_thread_client(), args.base_url, model, prompt, tokens_hi)

    conc_rows: list[dict] = []
    for conc in levels:
        print(f"[{tag}] concurrency={conc} …", flush=True)
        t0 = time.perf_counter()
        with concurrent.futures.ThreadPoolExecutor(max_workers=conc) as ex:
            outs = list(ex.map(job, range(conc)))
        wall = time.perf_counter() - t0
        ok_outs = [o for o in outs if o.get("ok") and o["ct"] > 0]
        total_ct = sum(o["ct"] for o in outs)
        tps_list = [o["tps"] for o in ok_outs]
        lat_list = [o["dt"] for o in ok_outs]
        row = {
            "concurrency": conc,
            "ok": len(ok_outs),
            "err": conc - len(ok_outs),
            "success_rate": round(len(ok_outs) / conc, 4) if conc else 0.0,
            "wall_s": round(wall, 3),
            "agg_tok_s": round(total_ct / wall, 2) if wall else 0.0,
            "per_user_median_tps": round(statistics.median(tps_list), 2) if tps_list else 0.0,
            "per_user_p95_tps": round(_pct(tps_list, 5), 2) if tps_list else 0.0,  # low tail
            "per_user_p50_lat_s": round(statistics.median(lat_list), 3) if lat_list else 0.0,
            "per_user_p95_lat_s": round(_pct(lat_list, 95), 3) if lat_list else 0.0,
            "mean_completion_tokens": round(statistics.mean(o["ct"] for o in ok_outs), 1) if ok_outs else 0.0,
        }
        conc_rows.append(row)
        print(json.dumps(row, ensure_ascii=False), flush=True)

    def max_c_sla(thr: float) -> int:
        best = 0
        for r in conc_rows:
            if r["ok"] == r["concurrency"] and r["per_user_median_tps"] >= thr:
                best = r["concurrency"]
        return best

    by_c = {r["concurrency"]: r for r in conc_rows}
    summary = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "track": args.track,
        "engine": args.engine,
        "quant": args.quant,
        "profile": args.profile,
        "base_url": args.base_url,
        "model": model,
        "sla_min_tps": sla50,
        "sla_target_tps": sla60,
        "max_C_sla50": max_c_sla(sla50),
        "max_C_sla60": max_c_sla(sla60),
        "agg_at_256": (by_c.get(256) or {}).get("agg_tok_s"),
        "agg_at_512": (by_c.get(512) or {}).get("agg_tok_s"),
        "ok_at_256": (by_c.get(256) or {}).get("ok"),
        "ok_at_512": (by_c.get(512) or {}).get("ok"),
        "single_median_tps": round(
            statistics.median(r["tps"] for r in singles if r.get("ok")), 2
        )
        if any(r.get("ok") for r in singles)
        else 0.0,
        "concurrency_levels": conc_rows,
    }

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")

    args.matrix.parent.mkdir(parents=True, exist_ok=True)
    matrix_line = {
        k: summary[k]
        for k in (
            "ts",
            "track",
            "engine",
            "quant",
            "profile",
            "model",
            "single_median_tps",
            "max_C_sla50",
            "max_C_sla60",
            "agg_at_256",
            "agg_at_512",
            "ok_at_256",
            "ok_at_512",
        )
    }
    with args.matrix.open("a", encoding="utf-8") as f:
        f.write(json.dumps(matrix_line, ensure_ascii=False) + "\n")

    print(
        f"DONE {tag} single={summary['single_median_tps']} "
        f"maxC@50={summary['max_C_sla50']} maxC@60={summary['max_C_sla60']} "
        f"agg256={summary['agg_at_256']} agg512={summary['agg_at_512']} → {out}",
        flush=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
