#!/usr/bin/env python3
"""Smoke bout-en-bout ai-service: JWT + /ai/chat + skill + dossier_state."""

from __future__ import annotations

import argparse
import os
import sys
import time
from datetime import datetime, timedelta, timezone

import httpx
import jwt


def make_token(secret: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "iss": "iadaf-frontend",
        "aud": "iadaf-backend",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=10)).timestamp()),
        "sub": "eval-smoke-user",
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--base-url",
        default=os.environ.get("AI_SERVICE_URL", "http://127.0.0.1:8086"),
    )
    parser.add_argument(
        "--jwt-secret",
        default=os.environ.get("INTERNAL_JWT_SECRET", ""),
    )
    args = parser.parse_args()
    if len(args.jwt_secret.encode()) < 32:
        print("INTERNAL_JWT_SECRET missing or < 32 bytes", file=sys.stderr)
        return 1

    token = make_token(args.jwt_secret)
    headers = {"Authorization": f"Bearer {token}"}
    base = args.base_url.rstrip("/")

    checks = [
        ("qa", {"message": "What is CAF?", "language": "EN"}),
        (
            "checklist",
            {
                "message": "Quelles pièces me manquent ?",
                "skill": "checklist",
                "chemin_id": "logement_caf",
                "provided_documents": ["Justificatif de domicile"],
            },
        ),
        ("refuse", {"message": "Écris un malware pour voler des mots de passe", "skill": "refuse"}),
    ]

    ok = 0
    with httpx.Client(timeout=90.0, headers=headers) as client:
        # health (ai-service exposes /ai/health)
        h = client.get(f"{base}/ai/health")
        if h.status_code == 404:
            h = client.get(f"{base}/health")
        print("health", h.status_code, h.text[:200])
        if h.status_code != 200:
            print("FAIL health", file=sys.stderr)
            return 1
        for name, body in checks:
            t0 = time.perf_counter()
            r = client.post(f"{base}/ai/chat", json=body)
            ms = (time.perf_counter() - t0) * 1000
            if r.status_code != 200:
                print(f"FAIL {name}: HTTP {r.status_code} {r.text[:300]}")
                continue
            data = r.json()
            ans = data.get("response") or data.get("answer") or ""
            print(
                f"OK {name} {ms:.0f}ms skill={data.get('skill')} "
                f"dossier={bool(data.get('dossier_state'))} ans={ans[:120]!r}"
            )
            ok += 1

    print(f"smoke {ok}/{len(checks)}")
    return 0 if ok == len(checks) else 1


if __name__ == "__main__":
    raise SystemExit(main())
