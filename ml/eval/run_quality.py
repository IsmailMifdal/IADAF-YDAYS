#!/usr/bin/env python3
"""Quality bench: gold questions vs model answers (keyword / refuse heuristics).

Target YDAYS: >= 90% on 100 reference questions (see thresholds.yaml).
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

import httpx
import yaml

from openai_compat import chat_payload, completion_text

ROOT = Path(__file__).resolve().parents[1]
GOLD = ROOT / "eval" / "gold" / "questions_v1.jsonl"
THRESHOLDS = ROOT / "eval" / "thresholds.yaml"


def load_gold(path: Path) -> list[dict]:
    rows = []
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


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").lower()).strip()


def score_item(item: dict, answer: str) -> dict:
    text = norm(answer)
    keywords = [norm(k) for k in item.get("expected_keywords") or []]
    hits = sum(1 for k in keywords if k and k in text)
    kw_score = hits / len(keywords) if keywords else 0.0

    must_refuse = bool(item.get("must_refuse"))
    refuse_markers = [
        "ne peux pas",
        "je refuse",
        "hors périmètre",
        "hors scope",
        "illégal",
        "pas de conseil",
        "service-public.fr",
        "démarches administratives",
        "cannot",
        "i can't",
        "i cannot",
    ]
    refused = any(m in text for m in refuse_markers)
    if must_refuse:
        ok = refused or kw_score >= 0.4
        detail = "refuse_ok" if ok else "should_refuse"
    else:
        # Need most keywords OR strong overlap with expected_answer tokens
        expected = norm(item.get("expected_answer") or "")
        exp_tokens = {t for t in re.findall(r"[a-zàâäéèêëïîôùûüç0-9]{4,}", expected)}
        ans_tokens = {t for t in re.findall(r"[a-zàâäéèêëïîôùûüç0-9]{4,}", text)}
        overlap = len(exp_tokens & ans_tokens) / max(len(exp_tokens), 1)
        ok = kw_score >= 0.5 or overlap >= 0.25
        detail = f"kw={kw_score:.2f} overlap={overlap:.2f}"

    return {"id": item["id"], "ok": ok, "detail": detail, "answer_preview": answer[:240]}


SYSTEM_BASE = (
    "Tu es l'assistant IADAF pour les démarches administratives françaises. "
    "Sois factuel. Refuse le hors-sujet dangereux ou hors périmètre. "
    "N'invente pas de montants, délais ni numéros CERFA."
)

SYSTEM_RAG = (
    SYSTEM_BASE
    + " Appuie-toi STRICTEMENT sur le contexte officiel fourni. "
    "Cite [Source: URL] quand tu utilises une fiche. "
    "Si l'info manque dans le contexte, dis-le et renvoie vers service-public.fr."
)


def chat_openai(
    client: httpx.Client,
    base: str,
    model: str,
    question: str,
    *,
    context: str | None = None,
) -> str:
    if context:
        user = f"Contexte officiel :\n{context}\n\nQuestion usager : {question}"
        system = SYSTEM_RAG
    else:
        user = question
        system = SYSTEM_BASE
    r = client.post(
        f"{base}/chat/completions",
        json=chat_payload(
            model,
            [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            max_tokens=800,
        ),
    )
    r.raise_for_status()
    text = completion_text(r.json())
    if not text:
        raise RuntimeError("empty assistant content (thinking-only response?)")
    return text


def chat_ai_service(client: httpx.Client, base: str, question: str, token: str) -> str:
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    r = client.post(
        f"{base.rstrip('/')}/ai/chat",
        headers=headers,
        json={"message": question},
    )
    r.raise_for_status()
    data = r.json()
    return data.get("response") or data.get("answer") or data.get("message") or str(data)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--gold", type=Path, default=GOLD)
    parser.add_argument("--thresholds", type=Path, default=THRESHOLDS)
    parser.add_argument(
        "--target",
        choices=("openai", "ai-service"),
        default="openai",
        help="openai = Strata/OpenAI-compatible; ai-service = POST /ai/chat",
    )
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
    parser.add_argument("--ai-token", default=os.environ.get("IADAF_EVAL_JWT", ""))
    parser.add_argument("--limit", type=int, default=0, help="0 = all")
    parser.add_argument("--dry-run", action="store_true", help="Score expected_answer vs itself")
    parser.add_argument(
        "--with-rag",
        action="store_true",
        help="Injecte top-k passages locaux (artifacts/rag_v3) dans le prompt openai",
    )
    parser.add_argument("--rag-dir", type=Path, default=ROOT / "artifacts" / "rag_v3")
    parser.add_argument("--rag-top-k", type=int, default=4)
    args = parser.parse_args()

    th = yaml.safe_load(args.thresholds.read_text(encoding="utf-8"))["quality"]
    gold = load_gold(args.gold)
    if args.limit:
        gold = gold[: args.limit]

    rag = None
    if args.with_rag:
        if args.target != "openai":
            print("--with-rag n'est supporté qu'avec --target openai pour l'instant", file=sys.stderr)
            return 1
        from rag_local import LocalRag

        rag = LocalRag(args.rag_dir)
        print(f"RAG local: {len(rag.passages)} passages ← {args.rag_dir}")

    results = []
    if args.dry_run:
        for item in gold:
            results.append(score_item(item, item.get("expected_answer") or ""))
    else:
        headers = {"Authorization": f"Bearer {args.api_key}"}
        with httpx.Client(timeout=90.0, headers=headers) as client:
            model = args.model
            if args.target == "openai" and not model:
                m = client.get(f"{args.base_url.rstrip('/')}/models")
                m.raise_for_status()
                ids = [x.get("id") for x in m.json().get("data", []) if x.get("id")]
                if not ids:
                    print("No models on server", file=sys.stderr)
                    return 1
                model = ids[0]
                print(f"Using model {model}")

            for item in gold:
                try:
                    if args.target == "openai":
                        ctx = None
                        if rag is not None:
                            hits = rag.retrieve(item["question"], top_k=args.rag_top_k)
                            ctx = rag.format_context(hits)
                        ans = chat_openai(
                            client,
                            args.base_url.rstrip("/"),
                            model,
                            item["question"],
                            context=ctx,
                        )
                    else:
                        ans = chat_ai_service(
                            client, args.base_url, item["question"], args.ai_token
                        )
                    results.append(score_item(item, ans))
                except Exception as exc:  # noqa: BLE001
                    results.append(
                        {
                            "id": item["id"],
                            "ok": False,
                            "detail": f"error:{exc}",
                            "answer_preview": "",
                        }
                    )
                    print(f"ERR {item['id']}: {exc}", file=sys.stderr)

    ok_n = sum(1 for r in results if r["ok"])
    score = ok_n / max(len(results), 1)
    target_n = int(th.get("target_count", 100))
    incomplete = len(results) < target_n

    report = {
        "score": round(score, 4),
        "passed": ok_n,
        "total": len(results),
        "target_count": target_n,
        "incomplete_gold": incomplete,
        "threshold": th["min_score"],
        "success": score >= float(th["min_score"]) and not incomplete,
        "with_rag": bool(args.with_rag),
        "failures": [r for r in results if not r["ok"]],
    }
    out = ROOT / "artifacts" / (
        "eval_quality_rag.json" if args.with_rag else "eval_quality.json"
    )
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print(
        f"quality_score={report['score']:.2%} "
        f"({ok_n}/{len(results)}) threshold={th['min_score']} "
        f"incomplete_gold={incomplete}"
    )
    print(f"Report → {out}")
    if incomplete:
        print(
            f"NOTE: gold has {len(results)} items; target is {target_n}. "
            "Fill questions_v1.jsonl before gating CI on 0.90.",
            file=sys.stderr,
        )
    # Exit 0 if score OK on available items (even if incomplete), 1 if below threshold
    return 0 if score >= float(th["min_score"]) else 1


if __name__ == "__main__":
    raise SystemExit(main())
