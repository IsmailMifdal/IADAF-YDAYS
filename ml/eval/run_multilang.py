#!/usr/bin/env python3
"""Banc multilangue complet — tous les éléments produit × FR/EN/AR/ES.

Matrice : ml/eval/gold/multilang_matrix.json (packs séjour, CAF, Ameli, impôts,
ANTS, documents, produit IADAF, refus).
Optionnel : --include-gold pour rejouer aussi le gold natif (lang déjà taguée).
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from collections import defaultdict
from pathlib import Path

import httpx

from openai_compat import chat_payload, completion_text

ROOT = Path(__file__).resolve().parents[1]
MATRIX = ROOT / "eval" / "gold" / "multilang_matrix.json"
GOLD_Q = ROOT / "eval" / "gold" / "questions_v1.jsonl"
GOLD_D = ROOT / "eval" / "gold" / "documents_v2.jsonl"
OUT_DEFAULT = ROOT / "artifacts" / "results" / "current" / "eval_multilang_full.json"

SYSTEM = {
    "FR": (
        "Tu es l'assistant IADAF pour les démarches administratives françaises.\n"
        "Appuie-toi STRICTEMENT sur le contexte officiel fourni. Cite [Source: URL] si utile.\n"
        "N'invente jamais montants, CERFA ni délais précis hors contexte.\n"
        "Refuse uniquement le hors-périmètre illégal/dangereux ou hors démarches admin.\n"
        "Réponds en français, factuel et structuré."
    ),
    "EN": (
        "You are the IADAF assistant for French administrative procedures.\n"
        "Rely STRICTLY on the official context. Cite [Source: URL] when useful.\n"
        "NEVER invent fees, CERFA numbers, or exact deadlines not in context.\n"
        "Refuse only illegal/dangerous or clearly off-scope requests.\n"
        "English questions about French admin ARE in scope — answer them.\n"
        "Respond in English, structured and factual."
    ),
    "AR": (
        "أنت مساعد IADAF للإجراءات الإدارية الفرنسية.\n"
        "اعتمد بدقة على السياق الرسمي واذكر [Source: URL] عند الحاجة.\n"
        "لا تخترع مبالغاً أو أرقام CERFA أو مواعيد دقيقة خارج السياق.\n"
        "ارفض فقط الطلبات غير القانونية/الخطرة أو خارج النطاق.\n"
        "أجب بالعربية بشكل واقعي ومنظم."
    ),
    "ES": (
        "Eres el asistente IADAF para trámites administrativos franceses.\n"
        "Apóyate ESTRICTAMENTE en el contexto oficial. Cita [Source: URL] si aplica.\n"
        "NUNCA inventes importes, números CERFA ni plazos exactos fuera del contexto.\n"
        "Rechaza SOLO lo ilegal/peligroso o claramente fuera de alcance.\n"
        "Responde en español, factual y estructurado."
    ),
}

AR_RE = re.compile(r"[\u0600-\u06FF]")
LATIN_WORD = re.compile(r"[A-Za-zÀ-ÿ]{3,}")

REFUSE_MARKERS = {
    "FR": [
        "ne peux pas",
        "je refuse",
        "hors périmètre",
        "hors scope",
        "illégal",
        "démarches administratives",
        "service-public",
    ],
    "EN": [
        "cannot",
        "can't",
        "i can not",
        "out of scope",
        "outside my",
        "administrative procedures",
        "illegal",
        "service-public",
    ],
    "ES": [
        "no puedo",
        "fuera de",
        "rechaz",
        "trámites",
        "ilegal",
        "alcance",
        "service-public",
    ],
    "AR": [
        "لا أستطيع",
        "لا يمكنني",
        "أرفض",
        "خارج",
        "غير قانوني",
        "إجراءات",
        "cannot",
        "administrative",
        "service-public",
    ],
}


def load_json(path: Path) -> list[dict]:
    return json.loads(path.read_text(encoding="utf-8"))


def load_jsonl(path: Path) -> list[dict]:
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        row = json.loads(line)
        if row.get("todo"):
            continue
        rows.append(row)
    return rows


def expand_matrix(matrix: list[dict]) -> list[dict]:
    cases = []
    for item in matrix:
        for lang, var in item["variants"].items():
            cases.append(
                {
                    "id": f"{item['element']}_{lang.lower()}",
                    "element": item["element"],
                    "pack": item.get("pack") or "",
                    "lang": lang.upper(),
                    "question": var["question"],
                    "expect_keywords": var.get("expect_keywords") or [],
                    "must_refuse": bool(item.get("must_refuse")),
                    "source": "matrix",
                }
            )
    return cases


def expand_native_gold(rows: list[dict], source: str) -> list[dict]:
    cases = []
    for row in rows:
        lang = (row.get("lang") or "fr").upper()
        if lang not in SYSTEM:
            lang = "FR"
        cases.append(
            {
                "id": f"{source}_{row['id']}",
                "element": row.get("category") or row.get("pack") or row["id"],
                "pack": row.get("pack") or "",
                "lang": lang,
                "question": row["question"],
                "expect_keywords": row.get("expected_keywords") or [],
                "must_refuse": bool(row.get("must_refuse")),
                "source": source,
            }
        )
    return cases


def detect_response_lang(text: str, expected: str | None = None) -> str:
    if not text or not text.strip():
        return "EMPTY"
    ar = len(AR_RE.findall(text))
    latin = LATIN_WORD.findall(text)
    lower = (" " + " ".join(w.lower() for w in latin) + " ").replace("'", "'")
    if ar >= 8 and ar >= len("".join(latin)) * 0.4:
        return "AR"
    es_marks = (
        " qué ", " puede ", " debe ", " documento ", " vivienda ", " alquiler ",
        " también ", " después ", " trámites ", " solicitud ", " incompleto ",
        " factura ", " meses ", " no ",
    )
    en_marks = (
        " the ", " is ", " you ", " your ", " should ", " health ", " housing ",
        " please ", " cannot ", " renew ", " proof ", " address ", " incomplete ",
        " missing ", " file ", " formats ", " documents ",
    )
    fr_marks = (
        " c'est ", " vous ", " votre ", " pour ", " dans ", " être ", " démarche ",
        " justificatif ", " préfecture ", " renouvel ", " incomplete ", " manquant ",
        " je ", " ne ", " pas ",
    )
    # Match without relying only on padded spaces for short answers
    blob = lower
    es_score = sum(1 for m in es_marks if m.strip() in blob) + (2 if ("¿" in text or "¡" in text) else 0)
    en_score = sum(1 for m in en_marks if m.strip() in blob)
    fr_score = sum(1 for m in fr_marks if m.strip() in blob)
    if any(c in text for c in "àâêëïîôùûüçœ"):
        fr_score += 3
    if any(c in text for c in "ñáíóú¿¡"):
        es_score += 2
    # Short factual EN answers (acronyms + ASCII)
    ascii_letters = sum(1 for c in text if "a" <= c.lower() <= "z")
    fr_acc = sum(1 for c in text if c in "àâäéèêëïîôùûüç")
    if ascii_letters >= 20 and fr_acc == 0 and ar == 0:
        en_score += 1
        if expected == "EN":
            en_score += 2
    if expected == "ES" and any(w in blob for w in (" el ", " la ", " los ", " las ", " una ", " del ")):
        es_score += 1
    if expected == "FR" and any(w in blob for w in (" le ", " la ", " les ", " des ", " une ", " du ")):
        fr_score += 1
    scores = {"ES": es_score, "EN": en_score, "FR": fr_score}
    best = max(scores, key=scores.get)
    if scores[best] == 0:
        # Fallback: trust expected if script matches
        if expected == "AR" and ar > 0:
            return "AR"
        if expected == "EN" and ascii_letters > 10 and fr_acc == 0 and ar == 0:
            return "EN"
        return "UNK"
    return best


def keyword_hits(answer: str, keywords: list[str]) -> tuple[int, int]:
    low = (answer or "").lower()
    hits = sum(1 for k in keywords if k and k.lower() in low)
    return hits, len(keywords)


def refused(answer: str, lang: str) -> bool:
    low = (answer or "").lower()
    markers = REFUSE_MARKERS.get(lang, []) + REFUSE_MARKERS["FR"] + REFUSE_MARKERS["EN"]
    return any(m in low for m in markers)


def score_case(case: dict, answer: str) -> dict:
    lang = case["lang"]
    got_lang = detect_response_lang(answer, expected=lang)
    hits, total = keyword_hits(answer, case["expect_keywords"])
    # Refuse: language optional if clearly refused; content = refuse markers / keywords
    if case["must_refuse"]:
        ok_refuse = refused(answer, lang) or hits >= max(1, (total + 1) // 2)
        lang_ok = got_lang == lang or got_lang in {"FR", "EN", "UNK"}  # soft for refuse
        ok = ok_refuse and len((answer or "").strip()) >= 20
        return {
            "lang_ok": lang_ok,
            "content_ok": ok_refuse,
            "detected_lang": got_lang,
            "keyword_hits": f"{hits}/{total}",
            "ok": ok,
            "detail": "refuse_ok" if ok else f"should_refuse lang={got_lang} kw={hits}/{total}",
        }

    # Acronymes / chiffres (112, 964, PDF…) : ≥1/3 des mots-clés suffit si réponse non vide
    need = max(1, total // 3) if total else 1
    content_ok = hits >= need
    lang_ok = got_lang == lang or (got_lang == "UNK" and content_ok and len(answer) < 120)
    ok = lang_ok and content_ok and len((answer or "").strip()) >= 30
    return {
        "lang_ok": lang_ok,
        "content_ok": content_ok,
        "detected_lang": got_lang,
        "keyword_hits": f"{hits}/{total}",
        "ok": ok,
        "detail": (
            "ok"
            if ok
            else f"lang={got_lang} (want {lang}) content={hits}/{total} len={len(answer or '')}"
        ),
    }


def build_user_prompt(case: dict, context: str | None) -> str:
    lang = case["lang"]
    ctx = context or "(aucun passage récupéré — dis-le si l'info manque et renvoie vers service-public.fr)"
    return (
        f"Contexte officiel:\n{ctx}\n\n"
        f"Question:\n{case['question']}\n\n"
        f"Réponds uniquement en {lang}."
    )


def run_case(
    client: httpx.Client,
    base: str,
    model: str,
    case: dict,
    *,
    rag,
    rag_top_k: int,
) -> dict:
    context = None
    if rag is not None and not case["must_refuse"]:
        try:
            hits = rag.retrieve(case["question"], top_k=rag_top_k)
            context = rag.format_context(hits)
        except Exception as exc:  # noqa: BLE001
            context = f"(RAG error: {exc})"

    t0 = time.perf_counter()
    r = client.post(
        f"{base}/chat/completions",
        json=chat_payload(
            model,
            [
                {"role": "system", "content": SYSTEM[case["lang"]]},
                {"role": "user", "content": build_user_prompt(case, context)},
            ],
            max_tokens=700,
        ),
    )
    ms = (time.perf_counter() - t0) * 1000
    if r.status_code != 200:
        return {
            **{k: case[k] for k in ("id", "element", "pack", "lang", "source", "must_refuse")},
            "ok": False,
            "ms": round(ms),
            "detail": f"HTTP {r.status_code}: {r.text[:180]}",
            "answer_preview": "",
        }
    answer = completion_text(r.json()) or ""
    scored = score_case(case, answer)
    return {
        **{k: case[k] for k in ("id", "element", "pack", "lang", "source", "must_refuse")},
        **scored,
        "ms": round(ms),
        "answer_preview": answer[:220].replace("\n", " "),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--matrix", type=Path, default=MATRIX)
    parser.add_argument(
        "--include-gold",
        action="store_true",
        help="Ajoute questions_v1 + documents_v2 (langue native taguée)",
    )
    parser.add_argument("--with-rag", action="store_true", default=True)
    parser.add_argument("--no-rag", action="store_true")
    parser.add_argument("--rag-dir", type=Path, default=ROOT / "artifacts" / "rag_v3")
    parser.add_argument("--rag-top-k", type=int, default=5)
    parser.add_argument(
        "--base-url",
        default=os.environ.get("OPENAI_BASE_URL", "http://127.0.0.1:8080/v1"),
    )
    parser.add_argument(
        "--api-key",
        default=os.environ.get("OPENAI_API_KEY", "iadaf-dev-local-key"),
    )
    parser.add_argument("--model", default=os.environ.get("OPENAI_MODEL", ""))
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--langs", default="FR,EN,ES,AR", help="Filtre langues, ex: FR,EN")
    parser.add_argument("--out", type=Path, default=OUT_DEFAULT)
    args = parser.parse_args()

    want_langs = {x.strip().upper() for x in args.langs.split(",") if x.strip()}
    cases = expand_matrix(load_json(args.matrix))
    if args.include_gold:
        cases.extend(expand_native_gold(load_jsonl(GOLD_Q), "gold_q"))
        cases.extend(expand_native_gold(load_jsonl(GOLD_D), "gold_d"))
    cases = [c for c in cases if c["lang"] in want_langs]
    # dédup id
    seen: set[str] = set()
    uniq = []
    for c in cases:
        if c["id"] in seen:
            continue
        seen.add(c["id"])
        uniq.append(c)
    cases = uniq
    if args.limit:
        cases = cases[: args.limit]

    rag = None
    use_rag = args.with_rag and not args.no_rag
    if use_rag:
        from rag_local import LocalRag

        rag = LocalRag(args.rag_dir)
        print(f"RAG local: {len(rag.passages)} passages ← {args.rag_dir}")

    base = args.base_url.rstrip("/")
    headers = {"Authorization": f"Bearer {args.api_key}"}
    results: list[dict] = []

    with httpx.Client(timeout=120.0, headers=headers) as client:
        model = args.model
        if not model:
            m = client.get(f"{base}/models")
            m.raise_for_status()
            model = m.json()["data"][0]["id"]
        print(f"Using model {model}")
        print(f"Cases: {len(cases)} (langs={sorted(want_langs)})")

        for i, case in enumerate(cases, 1):
            row = run_case(
                client, base, model, case, rag=rag, rag_top_k=args.rag_top_k
            )
            status = "OK" if row["ok"] else "FAIL"
            print(
                f"[{i}/{len(cases)}] {status} {row['id']:32} "
                f"{row['lang']} det={row.get('detected_lang')} "
                f"kw={row.get('keyword_hits')} {row['ms']}ms"
            )
            if not row["ok"]:
                print(f"         {row.get('detail')} | {row.get('answer_preview', '')[:120]}")
            results.append(row)

    by_lang: dict[str, dict[str, int]] = defaultdict(lambda: {"ok": 0, "total": 0})
    by_pack: dict[str, dict[str, int]] = defaultdict(lambda: {"ok": 0, "total": 0})
    by_element: dict[str, dict[str, int]] = defaultdict(lambda: {"ok": 0, "total": 0})
    for row in results:
        for bucket, key in (
            (by_lang, row["lang"]),
            (by_pack, row.get("pack") or "?"),
            (by_element, row.get("element") or "?"),
        ):
            bucket[key]["total"] += 1
            if row["ok"]:
                bucket[key]["ok"] += 1

    ok_n = sum(1 for r in results if r["ok"])
    report = {
        "score": round(ok_n / max(len(results), 1), 4),
        "passed": ok_n,
        "total": len(results),
        "success": ok_n == len(results),
        "model": model,
        "base_url": base,
        "with_rag": bool(rag),
        "by_lang": dict(by_lang),
        "by_pack": dict(by_pack),
        "by_element": dict(by_element),
        "failures": [r for r in results if not r["ok"]],
        "results": results,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print()
    print(f"multilang_full {ok_n}/{len(results)} ({report['score']:.0%})")
    for lang in sorted(by_lang):
        b = by_lang[lang]
        print(f"  lang {lang}: {b['ok']}/{b['total']}")
    for pack in sorted(by_pack):
        b = by_pack[pack]
        print(f"  pack {pack}: {b['ok']}/{b['total']}")
    print(f"→ {args.out}")
    return 0 if report["success"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
