#!/usr/bin/env python3
"""Coherence bench: same question × K runs → embedding similarity + keyword stability."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

import httpx
import numpy as np
import yaml

from openai_compat import chat_payload, completion_text

ROOT = Path(__file__).resolve().parents[1]
GOLD = ROOT / "eval" / "gold" / "questions_v1.jsonl"
THRESHOLDS = ROOT / "eval" / "thresholds.yaml"


def load_sample(path: Path, n: int) -> list[dict]:
    rows = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            row = json.loads(line)
            if row.get("todo") or row.get("must_refuse"):
                continue
            rows.append(row)
            if len(rows) >= n:
                break
    return rows


def cosine(a: np.ndarray, b: np.ndarray) -> float:
    na, nb = np.linalg.norm(a), np.linalg.norm(b)
    if na == 0 or nb == 0:
        return 0.0
    return float(np.dot(a, b) / (na * nb))


def keyword_stability(answers: list[str], keywords: list[str]) -> float:
    if not keywords:
        return 1.0
    scores = []
    for a in answers:
        t = a.lower()
        hits = sum(1 for k in keywords if k.lower() in t)
        scores.append(hits / len(keywords))
    return float(np.mean(scores))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--gold", type=Path, default=GOLD)
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
    parser.add_argument("--sample", type=int, default=8, help="Number of gold questions")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Use expected_answer repeated (no server) to validate the pipeline",
    )
    args = parser.parse_args()

    th = yaml.safe_load(args.thresholds.read_text(encoding="utf-8"))["coherence"]
    runs = int(th.get("runs_per_question", 5))
    min_sim = float(th.get("min_mean_similarity", 0.75))
    temp = float(th.get("temperature", 0.1))
    items = load_sample(args.gold, args.sample)

    embedder = None
    try:
        from sentence_transformers import SentenceTransformer

        embedder = SentenceTransformer(
            "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
        )
    except ImportError:
        print(
            "WARN: sentence-transformers absent — fallback Jaccard tokens "
            "(pip install -r ml/requirements-eval.txt for MiniLM).",
            file=sys.stderr,
        )

    def pairwise_sim(answers: list[str]) -> float:
        if embedder is not None:
            embs = embedder.encode(answers)
            sims = []
            for i in range(len(embs)):
                for j in range(i + 1, len(embs)):
                    sims.append(cosine(np.asarray(embs[i]), np.asarray(embs[j])))
            return float(np.mean(sims)) if sims else 1.0
        # Token Jaccard fallback
        def toks(s: str) -> set[str]:
            return set(re.findall(r"\w{3,}", s.lower(), flags=re.UNICODE))

        sims = []
        for i in range(len(answers)):
            for j in range(i + 1, len(answers)):
                a, b = toks(answers[i]), toks(answers[j])
                sims.append(len(a & b) / max(len(a | b), 1))
        return float(np.mean(sims)) if sims else 1.0

    base = args.base_url.rstrip("/")
    headers = {"Authorization": f"Bearer {args.api_key}"}

    per_q = []
    with httpx.Client(timeout=120.0, headers=headers) as client:
        model = args.model
        if not args.dry_run:
            if not model:
                m = client.get(f"{base}/models")
                m.raise_for_status()
                ids = [x.get("id") for x in m.json().get("data", []) if x.get("id")]
                model = ids[0]

        for item in items:
            answers = []
            for _ in range(runs):
                if args.dry_run:
                    answers.append(item.get("expected_answer") or "")
                    continue
                r = client.post(
                    f"{base}/chat/completions",
                    json=chat_payload(
                        model,
                        [{"role": "user", "content": item["question"]}],
                        temperature=temp,
                        max_tokens=800,
                    ),
                )
                r.raise_for_status()
                answers.append(completion_text(r.json()) or "")

            # Drop empty answers so embeddings never see None/empty-only batches
            answers = [a for a in answers if a.strip()]
            if len(answers) < 2:
                per_q.append(
                    {
                        "id": item["id"],
                        "mean_similarity": 0.0,
                        "keyword_stability": 0.0,
                        "doc_mention_std": 0.0,
                        "ok": False,
                        "error": "not_enough_non_empty_answers",
                    }
                )
                print(f"{item['id']}: FAIL empty answers from model")
                continue

            mean_sim = pairwise_sim(answers)
            kw = keyword_stability(answers, item.get("expected_keywords") or [])
            # Flag contradictory document lists: high variance in "passeport|RIB|…" counts
            doc_pat = re.compile(
                r"\b(passeport|rib|iban|vitale|cerfa|bail|domicile)\b", re.I
            )
            counts = [len(doc_pat.findall(a)) for a in answers]
            count_std = float(np.std(counts)) if counts else 0.0

            per_q.append(
                {
                    "id": item["id"],
                    "mean_similarity": round(mean_sim, 4),
                    "keyword_stability": round(kw, 4),
                    "doc_mention_std": round(count_std, 4),
                    "ok": mean_sim >= min_sim,
                }
            )
            print(
                f"{item['id']}: sim={mean_sim:.3f} kw_stab={kw:.3f} "
                f"doc_std={count_std:.2f} ok={mean_sim >= min_sim}"
            )

    mean_all = float(np.mean([x["mean_similarity"] for x in per_q])) if per_q else 0.0
    success = mean_all >= min_sim and all(x["ok"] for x in per_q)
    report = {
        "mean_similarity": round(mean_all, 4),
        "threshold": min_sim,
        "questions": per_q,
        "success": success,
        "dry_run": args.dry_run,
    }
    out = ROOT / "artifacts" / "eval_coherence.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"coherence_mean={mean_all:.3f} threshold={min_sim} success={success}")
    print(f"Report → {out}")
    return 0 if success else 1


if __name__ == "__main__":
    raise SystemExit(main())
