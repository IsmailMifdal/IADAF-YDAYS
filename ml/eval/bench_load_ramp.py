#!/usr/bin/env python3
"""Charge progressive continue 1→N users (think-time) + spot qualité.

Simule une charge réelle : ramp users virtuels, chaque user boucle
requête → pause jitter → requête. Cibles :
  --target openai      → TRT / llama OpenAI-compatible
  --target ai-service  → /ai/chat (chemin produit)
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import random
import re
import statistics
import threading
import time
from collections import deque
from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx

try:
    import jwt
except ImportError:  # pragma: no cover
    jwt = None

ROOT = Path(__file__).resolve().parents[1]
GOLD = ROOT / "eval" / "gold" / "questions_v1.jsonl"
OUT_DEFAULT = ROOT / "artifacts" / "results" / "current" / "bench_load_ramp.json"

FALLBACK_PROMPTS = [
    "Qu'est-ce que la CAF ?",
    "Comment renouveler mon titre de séjour via ANEF ?",
    "Difference between CAF and CPAM?",
    "Quelles pièces pour une demande d'APL ?",
    "Mon titre expire dans 2 mois, que faire ?",
    "C'est quoi l'AME ?",
    "How do I get a carte Vitale?",
    "Puis-je travailler avec un titre étudiant ?",
]


def load_gold(path: Path) -> list[dict]:
    rows: list[dict] = []
    if not path.is_file():
        return rows
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            if row.get("todo"):
                continue
            rows.append(row)
    return rows


def make_jwt(secret: str) -> str:
    if not jwt:
        raise RuntimeError("PyJWT required for --target ai-service")
    now = datetime.now(timezone.utc)
    payload = {
        "iss": "iadaf-frontend",
        "aud": "iadaf-backend",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=6)).timestamp()),
        "sub": "load-ramp",
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def score_keywords(item: dict, answer: str) -> bool:
    text = re.sub(r"\s+", " ", (answer or "").lower()).strip()
    keywords = [re.sub(r"\s+", " ", (k or "").lower()).strip() for k in item.get("expected_keywords") or []]
    if item.get("must_refuse"):
        markers = ("ne peux pas", "illégal", "hors périmètre", "cannot", "i can't")
        return any(m in text for m in markers)
    if not keywords:
        return bool(text)
    hits = sum(1 for k in keywords if k and k in text)
    return (hits / len(keywords)) >= 0.5


def pct(sorted_vals: list[float], p: float) -> float:
    if not sorted_vals:
        return 0.0
    if len(sorted_vals) == 1:
        return sorted_vals[0]
    k = (len(sorted_vals) - 1) * (p / 100.0)
    f = int(k)
    c = min(f + 1, len(sorted_vals) - 1)
    if f == c:
        return sorted_vals[f]
    return sorted_vals[f] + (sorted_vals[c] - sorted_vals[f]) * (k - f)


class Metrics:
    def __init__(self) -> None:
        self.lock = threading.Lock()
        self.latencies: deque[float] = deque(maxlen=50_000)
        self.window: deque[tuple[float, float, int, bool]] = deque()  # t, dt, ct, ok
        self.ok = 0
        self.err = 0
        self.tokens = 0
        self.quality_ok = 0
        self.quality_n = 0
        self.first_error_at: float | None = None
        self.first_error_users: int | None = None
        self.p95_breach_at: float | None = None
        self.p95_breach_users: int | None = None
        self.req_counter = 0

    def add(
        self,
        *,
        dt: float,
        ct: int,
        ok: bool,
        users: int,
        t0: float,
        quality: bool | None = None,
    ) -> int:
        with self.lock:
            self.req_counter += 1
            n = self.req_counter
            now = time.perf_counter()
            self.latencies.append(dt)
            self.window.append((now, dt, ct, ok))
            if ok:
                self.ok += 1
                self.tokens += ct
            else:
                self.err += 1
                if self.first_error_at is None:
                    self.first_error_at = now - t0
                    self.first_error_users = users
            if quality is not None:
                self.quality_n += 1
                if quality:
                    self.quality_ok += 1
            return n

    def snapshot(self, users: int, t0: float, p95_threshold: float) -> dict:
        with self.lock:
            now = time.perf_counter()
            # 10s sliding window
            while self.window and self.window[0][0] < now - 10.0:
                self.window.popleft()
            win = list(self.window)
            lats = sorted(x[1] for x in win) if win else sorted(self.latencies)
            ok_w = sum(1 for x in win if x[3])
            err_w = sum(1 for x in win if not x[3])
            tok_w = sum(x[2] for x in win if x[3])
            p95 = pct(lats, 95) if lats else 0.0
            if p95_threshold > 0 and p95 > p95_threshold and self.p95_breach_at is None and win:
                self.p95_breach_at = now - t0
                self.p95_breach_users = users
            elapsed = max(now - t0, 1e-6)
            return {
                "t_s": round(now - t0, 2),
                "users": users,
                "ok_total": self.ok,
                "err_total": self.err,
                "rps_10s": round(len(win) / 10.0, 2),
                "error_rate_10s": round(err_w / max(ok_w + err_w, 1), 4),
                "tok_s_10s": round(tok_w / 10.0, 2),
                "p50_s": round(pct(lats, 50), 3),
                "p95_s": round(p95, 3),
                "p99_s": round(pct(lats, 99), 3),
                "median_lat_all_s": round(statistics.median(self.latencies), 3) if self.latencies else 0,
                "quality_ok_rate": round(self.quality_ok / self.quality_n, 4) if self.quality_n else None,
                "quality_n": self.quality_n,
                "agg_tok_s_all": round(self.tokens / elapsed, 2),
            }


def do_openai(
    client: httpx.Client,
    base: str,
    model: str,
    prompt: str,
    max_tokens: int,
) -> tuple[str, int, float]:
    t0 = time.perf_counter()
    r = client.post(
        f"{base.rstrip('/')}/chat/completions",
        json={
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": max_tokens,
            "temperature": 0.1,
            "chat_template_kwargs": {"enable_thinking": False},
        },
    )
    dt = time.perf_counter() - t0
    r.raise_for_status()
    data = r.json()
    u = data.get("usage") or {}
    ct = int(u.get("completion_tokens") or 0)
    choices = data.get("choices") or []
    msg = (choices[0].get("message") or {}) if choices else {}
    text = msg.get("content") or ""
    return text, ct, dt


def do_ai_service(
    client: httpx.Client,
    base: str,
    token: str,
    prompt: str,
    item: dict | None,
) -> tuple[str, int, float]:
    headers = {"Authorization": f"Bearer {token}"}
    body: dict = {"message": prompt}
    if item:
        if item.get("skill"):
            body["skill"] = item["skill"]
        if item.get("chemin_id"):
            body["chemin_id"] = item["chemin_id"]
    t0 = time.perf_counter()
    r = client.post(f"{base.rstrip('/')}/ai/chat", headers=headers, json=body)
    dt = time.perf_counter() - t0
    r.raise_for_status()
    data = r.json()
    text = data.get("response") or data.get("answer") or ""
    # ai-service rarely returns token counts
    ct = max(1, len(text.split()))
    return text, ct, dt


def user_loop(
    uid: int,
    stop: threading.Event,
    get_users,
    metrics: Metrics,
    args: argparse.Namespace,
    gold: list[dict],
    prompts: list[str],
    token: str | None,
    t0: float,
) -> None:
    del uid  # identity only for thread name
    timeout = httpx.Timeout(args.timeout)
    headers = {}
    if args.target == "openai" and args.api_key:
        headers["Authorization"] = f"Bearer {args.api_key}"
    with httpx.Client(timeout=timeout, headers=headers) as client:
        while not stop.is_set():
            item = None
            if gold and random.random() < 0.7:
                item = random.choice(gold)
                prompt = item.get("question") or random.choice(prompts)
            else:
                prompt = random.choice(prompts)
            max_tok = random.randint(args.max_tokens_min, args.max_tokens_max)
            ok = False
            ct = 0
            dt = 0.0
            text = ""
            try:
                if args.target == "openai":
                    text, ct, dt = do_openai(client, args.base_url, args.model, prompt, max_tok)
                else:
                    text, ct, dt = do_ai_service(client, args.base_url, token or "", prompt, item)
                ok = bool(text) or ct > 0
            except Exception:
                ok = False
                dt = args.timeout
                ct = 0
                text = ""

            quality = None
            n = 0
            users = get_users()
            # decide spot before add to get req number after
            with metrics.lock:
                will_spot = (
                    item is not None
                    and args.quality_every > 0
                    and (metrics.req_counter + 1) % args.quality_every == 0
                )
            if will_spot and item is not None and ok:
                quality = score_keywords(item, text)
            n = metrics.add(dt=dt, ct=ct, ok=ok, users=users, t0=t0, quality=quality)

            think = random.uniform(args.think_min, args.think_max)
            if stop.wait(think):
                break


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--target", choices=("openai", "ai-service"), default="openai")
    p.add_argument(
        "--base-url",
        default="",
        help="openai: OPENAI_BASE_URL ; ai-service: AI_SERVICE_URL",
    )
    p.add_argument("--api-key", default=os.environ.get("OPENAI_API_KEY", "iadaf-dev-local-key"))
    p.add_argument("--model", default=os.environ.get("OPENAI_MODEL", "nvidia/Qwen3-8B-NVFP4"))
    p.add_argument("--jwt-secret", default=os.environ.get("INTERNAL_JWT_SECRET", ""))
    p.add_argument("--start-users", type=int, default=1)
    p.add_argument("--max-users", type=int, default=512)
    p.add_argument("--step-users", type=int, default=8)
    p.add_argument("--step-interval", type=float, default=15.0, help="secondes entre ajouts de users")
    p.add_argument("--hold-final", type=float, default=60.0, help="tenir le max N secondes")
    p.add_argument("--think-min", type=float, default=0.5)
    p.add_argument("--think-max", type=float, default=3.0)
    p.add_argument("--max-tokens-min", type=int, default=64)
    p.add_argument("--max-tokens-max", type=int, default=128)
    p.add_argument("--timeout", type=float, default=120.0)
    p.add_argument("--quality-every", type=int, default=25, help="0 = off")
    p.add_argument("--p95-threshold", type=float, default=15.0)
    p.add_argument("--snapshot-every", type=float, default=5.0)
    p.add_argument("--gold", type=Path, default=GOLD)
    p.add_argument("--out", type=Path, default=OUT_DEFAULT)
    p.add_argument("--timeline", type=Path, default=None)
    args = p.parse_args()

    if not args.base_url:
        if args.target == "openai":
            args.base_url = os.environ.get("OPENAI_BASE_URL", "http://127.0.0.1:8000/v1")
        else:
            args.base_url = os.environ.get("AI_SERVICE_URL", "http://127.0.0.1:8086")

    gold = load_gold(args.gold)
    prompts = [g["question"] for g in gold if g.get("question")] or FALLBACK_PROMPTS
    token = None
    if args.target == "ai-service":
        secret = args.jwt_secret or "iadaf-local-eval-jwt-secret-32b-min!!"
        token = make_jwt(secret)

    label = "direct" if args.target == "openai" else "aiservice"
    if args.out == OUT_DEFAULT:
        args.out = ROOT / "artifacts" / "results" / "current" / f"bench_load_ramp_{label}.json"
    timeline_path = args.timeline or args.out.with_suffix(".csv")

    metrics = Metrics()
    stop = threading.Event()
    users_lock = threading.Lock()
    n_users = 0

    def get_users() -> int:
        with users_lock:
            return n_users

    def set_users(n: int) -> None:
        nonlocal n_users
        with users_lock:
            n_users = n

    threads: list[threading.Thread] = []
    t0 = time.perf_counter()
    timeline: list[dict] = []

    print(
        f"ramp target={args.target} base={args.base_url} "
        f"users={args.start_users}→{args.max_users} step=+{args.step_users}/{args.step_interval}s",
        flush=True,
    )

    # warm
    try:
        with httpx.Client(timeout=60.0) as c:
            if args.target == "openai":
                do_openai(c, args.base_url, args.model, "ping", 8)
            else:
                do_ai_service(c, args.base_url, token or "", "ping", None)
        print("warm ok", flush=True)
    except Exception as e:
        print(f"warm FAIL: {e}", flush=True)
        return 1

    def spawn(k: int) -> None:
        for i in range(k):
            uid = len(threads)
            th = threading.Thread(
                target=user_loop,
                args=(uid, stop, get_users, metrics, args, gold, prompts, token, t0),
                daemon=True,
                name=f"vu-{uid}",
            )
            threads.append(th)
            th.start()
        set_users(len(threads))

    spawn(max(1, args.start_users))
    next_snap = time.perf_counter()
    next_step = time.perf_counter() + args.step_interval

    try:
        while get_users() < args.max_users and not stop.is_set():
            now = time.perf_counter()
            if now >= next_step:
                add = min(args.step_users, args.max_users - get_users())
                if add > 0:
                    spawn(add)
                    print(f"[{now - t0:7.1f}s] users={get_users()}", flush=True)
                next_step = now + args.step_interval
            if now >= next_snap:
                snap = metrics.snapshot(get_users(), t0, args.p95_threshold)
                timeline.append(snap)
                print(
                    f"  t={snap['t_s']:7.1f}s u={snap['users']:4d} "
                    f"rps={snap['rps_10s']:6.1f} p95={snap['p95_s']:6.2f}s "
                    f"err={snap['error_rate_10s']:.2%} tok/s={snap['tok_s_10s']:7.1f} "
                    f"q={snap['quality_ok_rate']}",
                    flush=True,
                )
                next_snap = now + args.snapshot_every
            time.sleep(0.2)

        # hold at max
        hold_end = time.perf_counter() + args.hold_final
        print(f"hold {args.hold_final}s at {get_users()} users", flush=True)
        while time.perf_counter() < hold_end and not stop.is_set():
            now = time.perf_counter()
            if now >= next_snap:
                snap = metrics.snapshot(get_users(), t0, args.p95_threshold)
                timeline.append(snap)
                print(
                    f"  t={snap['t_s']:7.1f}s u={snap['users']:4d} "
                    f"rps={snap['rps_10s']:6.1f} p95={snap['p95_s']:6.2f}s "
                    f"err={snap['error_rate_10s']:.2%} tok/s={snap['tok_s_10s']:7.1f} "
                    f"q={snap['quality_ok_rate']}",
                    flush=True,
                )
                next_snap = now + args.snapshot_every
            time.sleep(0.2)
    except KeyboardInterrupt:
        print("interrupted", flush=True)
    finally:
        stop.set()
        for th in threads:
            th.join(timeout=2.0)

    final = metrics.snapshot(get_users(), t0, args.p95_threshold)
    timeline.append(final)

    report = {
        "measured_at": datetime.now(timezone.utc).isoformat(),
        "target": args.target,
        "base_url": args.base_url,
        "model": args.model if args.target == "openai" else "ai-service",
        "ramp": {
            "start_users": args.start_users,
            "max_users": args.max_users,
            "step_users": args.step_users,
            "step_interval_s": args.step_interval,
            "hold_final_s": args.hold_final,
            "think_s": [args.think_min, args.think_max],
            "max_tokens": [args.max_tokens_min, args.max_tokens_max],
        },
        "final": final,
        "breakpoints": {
            "first_error_at_s": metrics.first_error_at,
            "first_error_users": metrics.first_error_users,
            "p95_breach_at_s": metrics.p95_breach_at,
            "p95_breach_users": metrics.p95_breach_users,
            "p95_threshold_s": args.p95_threshold,
        },
        "totals": {
            "ok": metrics.ok,
            "err": metrics.err,
            "tokens": metrics.tokens,
            "quality_ok": metrics.quality_ok,
            "quality_n": metrics.quality_n,
            "quality_ok_rate": round(metrics.quality_ok / metrics.quality_n, 4) if metrics.quality_n else None,
            "duration_s": round(time.perf_counter() - t0, 2),
            "peak_users": get_users(),
        },
        "timeline": timeline,
        "notes": {
            "mode": "continuous_ramp_with_think_time",
            "quality": "keyword spot-checks on gold items under load",
            "lora": "TRT base NVFP4 has no IADAF LoRA — product 100% needs merge",
        },
    }

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    with timeline_path.open("w", encoding="utf-8", newline="") as f:
        fields = [
            "t_s",
            "users",
            "rps_10s",
            "error_rate_10s",
            "tok_s_10s",
            "p50_s",
            "p95_s",
            "p99_s",
            "quality_ok_rate",
            "quality_n",
        ]
        w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        for row in timeline:
            w.writerow(row)

    print(
        f"DONE peak_users={get_users()} ok={metrics.ok} err={metrics.err} "
        f"q_rate={report['totals']['quality_ok_rate']} → {args.out}",
        flush=True,
    )
    print(f"timeline → {timeline_path}", flush=True)
    return 0 if metrics.ok > 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
