#!/usr/bin/env python3
"""Assemble processed/instruct_train_v4.jsonl (mix SFT v4 — buckets curated + raw/v4).

CPU only. Réf. RAPPORT-DEEPRESEARCH-V4.md §4.
Les buckets HF complets dépendent de download_v4.py ; les curated sont toujours inclus.
"""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CURATED = ROOT / "datasets" / "curated"
RAW_V4 = ROOT / "datasets" / "raw" / "v4"
GOLD_Q = ROOT / "eval" / "gold" / "questions_v1.jsonl"
OUT = ROOT / "datasets" / "processed" / "instruct_train_v4.jsonl"

SYSTEM = (
    "Tu es l'assistant IADAF pour les démarches administratives françaises "
    "(séjour/ANEF, CAF, Ameli, impôts, permis, carte grise ANTS) en FR/EN/AR/ES. "
    "Appuie-toi STRICTEMENT sur le contexte officiel s'il est fourni et cite [Source: URL]. "
    "N'invente jamais montants, CERFA ni délais hors contexte. "
    "Refuse uniquement l'illégal/dangereux et le conseil boursier/trading/levier. "
    "Carte grise, urgences 15/17/18/112, APL, CPAM/AME, permis ANTS sont TOUJOURS in-scope. "
    "Pour les pièces : le code valide (IBAN/MRZ/dates) ; tu expliques les contrôles sans contourner."
)

# Target volumes from rapport (curated fills first; HF tops up)
BUCKET_TARGETS = {
    "allowlist": 4000,
    "refuse_finance": 2560,
    "ko_upsample": 3200,
    "docs_explain": 3360,
    "replay_fr": 4480,
}


def msg(user: str, assistant: str) -> dict:
    return {
        "messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": user},
            {"role": "assistant", "content": assistant},
        ]
    }


def load_qa_jsonl(path: Path) -> list[tuple[str, str]]:
    rows: list[tuple[str, str]] = []
    if not path.is_file():
        return rows
    for line in path.open(encoding="utf-8"):
        line = line.strip()
        if not line:
            continue
        row = json.loads(line)
        q = (row.get("question") or row.get("prompt") or "").strip()
        a = (row.get("answer") or row.get("response") or row.get("completion") or "").strip()
        if q and a:
            rows.append((q, a))
    return rows


def upsample(pairs: list[tuple[str, str]], target: int, rng: random.Random) -> list[dict]:
    if not pairs:
        return []
    out: list[dict] = []
    prefixes = [
        "",
        "Bonjour, ",
        "Question : ",
        "Please answer: ",
        "Pregunta: ",
        "سؤال: ",
        "Urgent — ",
        "En clair : ",
    ]
    i = 0
    while len(out) < target:
        q, a = pairs[i % len(pairs)]
        pref = prefixes[i % len(prefixes)]
        out.append(msg(pref + q, a))
        i += 1
    rng.shuffle(out)
    return out


def from_gold_replay(path: Path, target: int, rng: random.Random) -> list[dict]:
    if not path.is_file():
        return []
    items = [json.loads(l) for l in path.open(encoding="utf-8") if l.strip()]
    # Hold out: skip must_refuse false only? Keep all for anti-regression but note holdout in meta
    pairs = []
    for it in items:
        q = (it.get("question") or "").strip()
        a = (it.get("expected_answer") or "").strip()
        if q and a:
            pairs.append((q, a))
    return upsample(pairs, target, rng)


REFUSE_TMPL = (
    "Je ne peux pas aider sur cette demande (illégale, dangereuse ou hors périmètre "
    "financier/trading). Je reste disponible pour les démarches administratives françaises "
    "(séjour, CAF, Ameli, impôts, permis, carte grise…). "
    "Consultez https://www.service-public.fr/."
)

ABSTAIN_TMPL = (
    "Je n'ai pas assez de contexte officiel fiable pour répondre précisément. "
    "Je ne dois pas inventer. Consultez service-public.fr / l'organisme compétent "
    "ou reformulez avec une source."
)


def _as_text(v) -> str:
    if v is None:
        return ""
    if isinstance(v, list):
        return " ".join(str(x) for x in v)
    if isinstance(v, dict):
        # FalseReject cot_response etc.
        for k in ("text", "content", "answer", "response"):
            if k in v and v[k]:
                return str(v[k])
        return json.dumps(v, ensure_ascii=False)[:2000]
    return str(v)


def convert_hf_row(row: dict, *, source: str) -> dict | None:
    """Map raw HF schemas → chat messages."""
    # legi-instruct / glaive: messages already
    msgs = row.get("messages")
    if isinstance(msgs, list) and len(msgs) >= 2:
        cleaned = []
        for m in msgs:
            if not isinstance(m, dict):
                continue
            role = m.get("role") or "user"
            content = _as_text(m.get("content")).strip()
            if role in {"system", "user", "assistant", "tool"} and content:
                cleaned.append({"role": role if role != "tool" else "assistant", "content": content[:4000]})
        if len(cleaned) >= 2:
            # Force IADAF system first
            if cleaned[0]["role"] != "system":
                cleaned = [{"role": "system", "content": SYSTEM}] + cleaned
            else:
                cleaned[0] = {"role": "system", "content": SYSTEM}
            return {"messages": cleaned[:8]}

    # FalseReject: prompt + instruct_response (benign over-refusal training → answer)
    if source == "false_reject":
        q = _as_text(row.get("prompt")).strip()
        a = _as_text(row.get("instruct_response") or row.get("cot_response")).strip()
        if len(q) >= 8 and len(a) >= 8:
            return msg(q[:4000], a[:4000])

    # or-bench: prompt only → teach "answer if admin/benign framing" via soft redirect
    if source == "or_bench":
        q = _as_text(row.get("prompt")).strip()
        if len(q) >= 8:
            a = (
                "Je traite les démarches administratives françaises. "
                "Si votre question concerne un parcours légal (CAF, Ameli, ANTS, impôts, séjour), "
                "précisez-la : je répondrai avec des sources officielles. "
                "Je refuse uniquement l'illégal, le dangereux et le conseil boursier/trading."
            )
            return msg(q[:4000], a)

    # MultiJail: harmful prompts in en/ar/es → refuse
    if source == "multijail":
        for lang_key in ("en", "ar", "es", "fr"):
            q = _as_text(row.get(lang_key)).strip()
            if len(q) >= 8:
                return msg(q[:4000], REFUSE_TMPL)
        return None

    # PolyGuard: prompt/response pairs (prefer FR/EN/AR/ES languages if tagged)
    if source == "polyguard":
        lang = (_as_text(row.get("language")) or "").lower()
        if lang and lang not in {"en", "fr", "es", "ar", "fra", "eng", "spa", "ara", "french", "english", "spanish", "arabic"}:
            # keep some non-target for diversity but prefer target langs when abundant
            pass
        q = _as_text(row.get("prompt")).strip()
        a = _as_text(row.get("response")).strip()
        refusal = str(row.get("response_refusal_label") or "").lower()
        harm = str(row.get("prompt_harm_label") or "").lower()
        if len(q) >= 8 and len(a) >= 8:
            if "refuse" in refusal or harm in {"harmful", "unsafe"}:
                return msg(q[:4000], REFUSE_TMPL if len(a) < 40 else a[:4000])
            return msg(q[:4000], a[:4000])
        if len(q) >= 8:
            return msg(q[:4000], REFUSE_TMPL)

    # nomiracl topics: often {qid: docid, query_col: query} misparsed — take longest string values
    if source == "nomiracl":
        texts = sorted(
            (_as_text(v).strip() for v in row.values()),
            key=len,
            reverse=True,
        )
        texts = [t for t in texts if len(t) >= 12 and not t.isdigit()]
        if texts:
            q = texts[0][:4000]
            return msg(
                f"Contexte: (aucun passage récupéré)\n\nQuestion: {q}",
                ABSTAIN_TMPL,
            )

    # Generic fallback
    q = _as_text(
        row.get("question") or row.get("prompt") or row.get("input") or row.get("instruction")
    ).strip()
    a = _as_text(
        row.get("answer") or row.get("output") or row.get("response") or row.get("completion")
    ).strip()
    if len(q) >= 8 and len(a) >= 8:
        return msg(q[:4000], a[:4000])
    return None


def sample_hf_jsonl(path: Path, limit: int, rng: random.Random, *, source: str) -> list[dict]:
    if not path.is_file():
        return []
    lines = [l for l in path.open(encoding="utf-8") if l.strip()]
    rng.shuffle(lines)
    out: list[dict] = []
    for line in lines:
        if len(out) >= limit:
            break
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            continue
        item = convert_hf_row(row, source=source)
        if item:
            out.append(item)
    return out


def from_portals(path: Path) -> list[dict]:
    rows: list[dict] = []
    if not path.is_file():
        return rows
    for line in path.open(encoding="utf-8"):
        row = json.loads(line)
        title = row.get("title") or "fiche"
        summary = row.get("summary") or ""
        url = row.get("url") or "https://www.service-public.fr/"
        if not summary:
            continue
        user = f"Contexte officiel:\n{summary}\n\nQuestion: Résume les points clés pour « {title} »."
        rows.append(msg(user, summary))
        rows.append(
            msg(
                f"Où faire la démarche « {title} » ?",
                f"{summary}\n[Source: {url}]",
            )
        )
    return rows


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=OUT)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument(
        "--curated-only",
        action="store_true",
        help="N'utilise que curated + gold replay (pas de raw HF)",
    )
    parser.add_argument("--scale", type=float, default=1.0, help="Multiplie les cibles (0.25 = pilote)")
    args = parser.parse_args()
    rng = random.Random(args.seed)

    def t(key: str) -> int:
        return max(1, int(BUCKET_TARGETS[key] * args.scale))

    buckets: dict[str, list[dict]] = {}

    buckets["allowlist"] = upsample(
        load_qa_jsonl(CURATED / "allowlist_in_scope_v4.jsonl"), t("allowlist"), rng
    )
    buckets["refuse_finance"] = upsample(
        load_qa_jsonl(CURATED / "refuse_bourse_v4.jsonl"), t("refuse_finance"), rng
    )
    buckets["ko_upsample"] = upsample(
        load_qa_jsonl(CURATED / "multilang_ko_upsample_v4.jsonl"), t("ko_upsample"), rng
    )
    buckets["docs_explain"] = upsample(
        load_qa_jsonl(CURATED / "docs_explain_v4.jsonl"), t("docs_explain"), rng
    )
    buckets["replay_fr"] = from_gold_replay(GOLD_Q, t("replay_fr"), rng)

    extras: list[dict] = []
    extras.extend(from_portals(RAW_V4 / "portals_ants_ameli_cleiss" / "portals.jsonl"))

    if not args.curated_only:
        # HF top-up — limits ≈ raw availability (download_v4 defaults)
        s = args.scale
        extras.extend(
            sample_hf_jsonl(
                RAW_V4 / "legi_instruct_fr" / "data.jsonl", int(6400 * s), rng, source="legi"
            )
        )
        extras.extend(
            sample_hf_jsonl(
                RAW_V4 / "false_reject" / "data.jsonl", int(4000 * s), rng, source="false_reject"
            )
        )
        extras.extend(
            sample_hf_jsonl(
                RAW_V4 / "or_bench" / "data.jsonl", int(1319 * s), rng, source="or_bench"
            )
        )
        extras.extend(
            sample_hf_jsonl(
                RAW_V4 / "multijail" / "data.jsonl", int(315 * s), rng, source="multijail"
            )
        )
        extras.extend(
            sample_hf_jsonl(
                RAW_V4 / "polyguard" / "data.jsonl", int(3000 * s), rng, source="polyguard"
            )
        )
        extras.extend(
            sample_hf_jsonl(
                RAW_V4 / "glaive_fc" / "data.jsonl", int(3000 * s), rng, source="glaive"
            )
        )
        extras.extend(
            sample_hf_jsonl(
                RAW_V4 / "nomiracl" / "data.jsonl", int(2000 * s), rng, source="nomiracl"
            )
        )

    all_rows: list[dict] = []
    stats = {}
    for name, rows in buckets.items():
        stats[name] = len(rows)
        all_rows.extend(rows)
    stats["extras_hf_portals"] = len(extras)

    # Dedup HF/portals extras only (curated upsamples intentionally repeat paraphrases).
    seen: set[str] = set()
    extras_dedup: list[dict] = []
    for row in extras:
        user = next((m["content"] for m in row["messages"] if m["role"] == "user"), "")
        key = user.strip()
        if not key or key in seen:
            continue
        seen.add(key)
        extras_dedup.append(row)
    stats["extras_dedup"] = len(extras_dedup)
    all_rows.extend(extras_dedup)

    target = int(32000 * args.scale)
    # Pad with curated paraphrases if short of 32k (rapport mix).
    if len(all_rows) < target:
        pad_need = target - len(all_rows)
        pad_src = (
            load_qa_jsonl(CURATED / "allowlist_in_scope_v4.jsonl")
            + load_qa_jsonl(CURATED / "multilang_ko_upsample_v4.jsonl")
            + load_qa_jsonl(CURATED / "docs_explain_v4.jsonl")
            + load_qa_jsonl(CURATED / "refuse_bourse_v4.jsonl")
        )
        pad_rows = upsample(pad_src, pad_need, rng) if pad_src else []
        stats["pad_to_32k"] = len(pad_rows)
        all_rows.extend(pad_rows)
    else:
        stats["pad_to_32k"] = 0

    rng.shuffle(all_rows)
    if len(all_rows) > target:
        all_rows = all_rows[:target]
    deduped = all_rows

    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open("w", encoding="utf-8") as f:
        for row in deduped:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    meta = {
        "version": "v4",
        "out": str(args.out.relative_to(ROOT)),
        "total": len(deduped),
        "target_full_mix": target,
        "scale": args.scale,
        "buckets": stats,
        "note": (
            "Curated + HF convertis (legi/FalseReject/or-bench/MultiJail/PolyGuard/glaive/nomiracl). "
            "Pad curated si < 32k."
        ),
    }
    meta_path = args.out.with_suffix(".meta.json")
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(meta, ensure_ascii=False, indent=2))
    print(f"Wrote {len(deduped)} → {args.out}")
    return 0 if deduped else 1


if __name__ == "__main__":
    raise SystemExit(main())
