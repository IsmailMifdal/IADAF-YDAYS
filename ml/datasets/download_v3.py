#!/usr/bin/env python3
"""Télécharge les datasets ML v3 (P0/P1) dans ml/datasets/raw/v3/ — CPU only.

N'utilise pas le GPU. Sûr à lancer pendant un train v2 QLoRA.
Ne touche pas raw/ legacy ni processed/ (artefacts v2).

Réf. : SOURCES.md · RAPPORT-DEEPRESEARCH-V3.md
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]  # ml/
RAW_V3 = ROOT / "datasets" / "raw" / "v3"
UA = "iadaf-ml-download-v3/1.0"

# Langues Aya / Flores cibles IADAF
# Noms « language » Aya retenus (dialectes AR utiles IADAF inclus)
AYA_LANGUAGE_NAMES = {
    "French",
    "English",
    "Spanish",
    "Standard Arabic",
    "Moroccan Arabic",
    "Egyptian Arabic",
}
AYA_LIMIT_PER = {
    "French": 2500,
    "English": 2500,
    "Spanish": 2500,
    "Standard Arabic": 2500,
    "Moroccan Arabic": 1500,
    "Egyptian Arabic": 1000,
}
FLORES_LANGS = ("fra_Latn", "eng_Latn", "arb_Arab", "spa_Latn")


def _http_get(url: str, dest: Path, timeout: int = 300) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".part")
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as resp, tmp.open("wb") as out:
        shutil.copyfileobj(resp, out)
    tmp.replace(dest)


def _hub_tree(repo: str) -> list[dict]:
    api = f"https://huggingface.co/api/datasets/{repo}/tree/main?recursive=true&expand=false"
    req = urllib.request.Request(api, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _resolve(repo: str, rel: str) -> str:
    return f"https://huggingface.co/datasets/{repo}/resolve/main/{rel}"


def _parquet_to_jsonl(
    parquet_path: Path,
    out: Path,
    *,
    limit: int | None = None,
    row_filter=None,
) -> int:
    import pyarrow.parquet as pq

    table = pq.read_table(parquet_path)
    keep = [
        name
        for name in table.column_names
        if name.lower() not in {"embedding", "embeddings", "vector"}
    ]
    table = table.select(keep)
    written = 0
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", encoding="utf-8") as f:
        for i in range(table.num_rows):
            if limit is not None and written >= limit:
                break
            row = {col: table.column(col)[i].as_py() for col in table.column_names}
            if row_filter is not None and not row_filter(row):
                continue
            f.write(json.dumps(row, ensure_ascii=False, default=str) + "\n")
            written += 1
    return written


def _latest_parquet(tree: list[dict], prefix: str = "data/") -> str | None:
    parts = [
        item["path"]
        for item in tree
        if item.get("type") == "file"
        and str(item.get("path", "")).endswith(".parquet")
        and str(item.get("path", "")).startswith(prefix)
    ]
    if not parts:
        return None
    return sorted(parts)[-1]


def _write_source_meta(dest_dir: Path, meta: dict) -> None:
    dest_dir.mkdir(parents=True, exist_ok=True)
    (dest_dir / "SOURCE.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def download_single_parquet(
    *,
    source_id: str,
    repo: str,
    rel_path: str,
    dest_name: str,
    limit: int | None,
    row_filter=None,
    license_name: str,
    usage: str,
) -> dict:
    dest_dir = RAW_V3 / dest_name
    pq_local = dest_dir / Path(rel_path).name
    out = dest_dir / "data.jsonl"
    meta = {
        "id": source_id,
        "repo": repo,
        "path": rel_path,
        "license": license_name,
        "usage": usage,
        "url": _resolve(repo, rel_path),
    }
    _write_source_meta(dest_dir, meta)
    if not pq_local.is_file() or pq_local.stat().st_size < 1000:
        print(f"[{source_id}] download {rel_path} …")
        _http_get(_resolve(repo, rel_path), pq_local)
    else:
        print(f"[{source_id}] parquet déjà présent → {pq_local.name}")
    n = _parquet_to_jsonl(pq_local, out, limit=limit, row_filter=row_filter)
    print(f"[{source_id}] OK → {out} ({n} rows)")
    return {**meta, "rows": n, "jsonl": str(out.relative_to(ROOT))}


def download_aya(limit: int) -> dict:
    """S03 — échantillon équilibré FR/EN/ES/AR (+ dialectes AR)."""
    dest_dir = RAW_V3 / "aya"
    dest_dir.mkdir(parents=True, exist_ok=True)
    rel = "data/train-00000-of-00001.parquet"
    pq_local = dest_dir / Path(rel).name
    out = dest_dir / "data.jsonl"
    meta = {
        "id": "S03",
        "repo": "CohereLabs/aya_dataset",
        "path": rel,
        "license": "Apache-2.0",
        "usage": "SFT multilingue FR/EN/AR/ES",
        "url": _resolve("CohereLabs/aya_dataset", rel),
        "languages": sorted(AYA_LANGUAGE_NAMES),
    }
    _write_source_meta(dest_dir, meta)
    if not pq_local.is_file() or pq_local.stat().st_size < 1000:
        print(f"[S03] download {rel} …")
        _http_get(_resolve("CohereLabs/aya_dataset", rel), pq_local)
    else:
        print(f"[S03] parquet déjà présent → {pq_local.name}")

    import pyarrow.parquet as pq
    from collections import defaultdict

    table = pq.read_table(pq_local)
    keep = [
        name
        for name in table.column_names
        if name.lower() not in {"embedding", "embeddings", "vector"}
    ]
    table = table.select(keep)
    buckets: dict[str, list] = defaultdict(list)
    for i in range(table.num_rows):
        if all(len(buckets[k]) >= AYA_LIMIT_PER[k] for k in AYA_LIMIT_PER):
            break
        row = {col: table.column(col)[i].as_py() for col in table.column_names}
        lang = str(row.get("language") or "").strip()
        if lang not in AYA_LIMIT_PER or len(buckets[lang]) >= AYA_LIMIT_PER[lang]:
            continue
        buckets[lang].append(row)

    written = 0
    with out.open("w", encoding="utf-8") as f:
        for lang in sorted(buckets.keys()):
            for row in buckets[lang]:
                if written >= limit:
                    break
                f.write(json.dumps(row, ensure_ascii=False, default=str) + "\n")
                written += 1
            if written >= limit:
                break
    per_lang = {k: len(v) for k, v in buckets.items()}
    print(f"[S03] OK → {out} ({written} rows) {per_lang}")
    return {
        **meta,
        "rows": written,
        "jsonl": str(out.relative_to(ROOT)),
        "per_lang": per_lang,
    }


def download_aegis_refusals(limit: int) -> dict:
    """S11b — fallback public si WildGuard (S11) est gated (401 sans token HF)."""
    dest_dir = RAW_V3 / "aegis_safety"
    dest_dir.mkdir(parents=True, exist_ok=True)
    base = (
        "https://huggingface.co/datasets/nvidia/"
        "Aegis-AI-Content-Safety-Dataset-2.0/resolve/main"
    )
    name = "refusals_train.json"
    local = dest_dir / name
    if not local.is_file() or local.stat().st_size < 1000:
        print(f"[S11b] download {name} …")
        _http_get(f"{base}/{name}", local)
    data = json.loads(local.read_text(encoding="utf-8"))
    rows = data if isinstance(data, list) else data.get("data", [])
    out = dest_dir / "data.jsonl"
    n = 0
    with out.open("w", encoding="utf-8") as f:
        for row in rows:
            if n >= limit:
                break
            f.write(json.dumps(row, ensure_ascii=False, default=str) + "\n")
            n += 1
    meta = {
        "id": "S11b",
        "repo": "nvidia/Aegis-AI-Content-Safety-Dataset-2.0",
        "license": "voir carte HF",
        "usage": "SFT safety refusals EN (à adapter FR)",
        "fallback_for": "S11 allenai/wildguardmix (gated)",
        "rows": n,
        "jsonl": str(out.relative_to(ROOT)),
    }
    _write_source_meta(dest_dir, meta)
    print(f"[S11b] OK → {out} ({n} rows)")
    return meta


def copy_curated_safety_v3() -> dict:
    src = Path(__file__).resolve().parent / "curated" / "safety_refusals_v3.jsonl"
    dest_dir = RAW_V3 / "curated_safety"
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / "safety_refusals_v3.jsonl"
    if src.is_file():
        shutil.copy2(src, dest)
        n = sum(1 for _ in dest.open(encoding="utf-8"))
    else:
        n = 0
        print("WARN: curated safety_refusals_v3.jsonl manquant", file=sys.stderr)
    meta = {
        "id": "curated_safety_v3",
        "usage": "SFT refus conseil juridique FR/EN/AR/ES",
        "rows": n,
        "jsonl": str(dest.relative_to(ROOT)) if dest.is_file() else None,
    }
    _write_source_meta(dest_dir, meta)
    print(f"[curated_safety] OK → {dest} ({n} rows)")
    return meta


def download_legalkit(limit: int) -> dict:
    return download_single_parquet(
        source_id="S06",
        repo="louisbrulenaudet/legalkit",
        rel_path="data/train-00000-of-00001.parquet",
        dest_name="legalkit",
        limit=limit,
        license_name="MIT / Etalab",
        usage="RAG/SFT CESEDA + codes",
    )


def download_agentpublic_latest(source_id: str, repo: str, dest_name: str, limit: int) -> dict:
    tree = _hub_tree(repo)
    rel = _latest_parquet(tree)
    if not rel:
        raise RuntimeError(f"Aucun parquet dans {repo}")
    return download_single_parquet(
        source_id=source_id,
        repo=repo,
        rel_path=rel,
        dest_name=dest_name,
        limit=limit,
        license_name="Etalab 2.0",
        usage="RAG/SFT",
    )


def download_wildguard(limit: int) -> dict:
    return download_single_parquet(
        source_id="S11",
        repo="allenai/wildguardmix",
        rel_path="train/wildguard_train.parquet",
        dest_name="wildguardmix",
        limit=limit,
        license_name="ODC-BY / Apache",
        usage="SFT safety (à traduire FR)",
    )


def download_piaf(limit: int) -> dict:
    tree = _hub_tree("AgentPublic/piaf")
    # Prefer a train parquet if present
    parts = [
        i["path"]
        for i in tree
        if i.get("type") == "file" and str(i.get("path", "")).endswith(".parquet")
    ]
    if not parts:
        # json fallback
        jsons = [
            i["path"]
            for i in tree
            if i.get("type") == "file" and str(i.get("path", "")).endswith((".json", ".jsonl"))
        ]
        if not jsons:
            raise RuntimeError("AgentPublic/piaf: aucun fichier data")
        rel = sorted(jsons)[0]
        dest_dir = RAW_V3 / "piaf"
        local = dest_dir / Path(rel).name
        _write_source_meta(
            dest_dir,
            {
                "id": "S12",
                "repo": "AgentPublic/piaf",
                "path": rel,
                "license": "Etalab 2.0",
                "usage": "SFT grounded QA",
            },
        )
        if not local.is_file():
            print(f"[S12] download {rel} …")
            _http_get(_resolve("AgentPublic/piaf", rel), local)
        out = dest_dir / "data.jsonl"
        n = 0
        with out.open("w", encoding="utf-8") as f:
            if local.suffix == ".jsonl":
                for line in local.open(encoding="utf-8"):
                    if limit is not None and n >= limit:
                        break
                    f.write(line if line.endswith("\n") else line + "\n")
                    n += 1
            else:
                data = json.loads(local.read_text(encoding="utf-8"))
                rows = data if isinstance(data, list) else data.get("data", [data])
                for row in rows:
                    if limit is not None and n >= limit:
                        break
                    f.write(json.dumps(row, ensure_ascii=False, default=str) + "\n")
                    n += 1
        print(f"[S12] OK → {out} ({n} rows)")
        return {
            "id": "S12",
            "repo": "AgentPublic/piaf",
            "rows": n,
            "jsonl": str(out.relative_to(ROOT)),
            "license": "Etalab 2.0",
            "usage": "SFT grounded QA",
        }
    rel = sorted(parts)[-1]
    return download_single_parquet(
        source_id="S12",
        repo="AgentPublic/piaf",
        rel_path=rel,
        dest_name="piaf",
        limit=limit,
        license_name="Etalab 2.0",
        usage="SFT grounded QA",
    )


def download_fquad(limit: int) -> dict:
    tree = _hub_tree("manu/fquad2_test")
    parts = [
        i["path"]
        for i in tree
        if i.get("type") == "file" and str(i.get("path", "")).endswith(".parquet")
    ]
    if not parts:
        raise RuntimeError("manu/fquad2_test: pas de parquet")
    rel = sorted(parts)[0]
    return download_single_parquet(
        source_id="S13",
        repo="manu/fquad2_test",
        rel_path=rel,
        dest_name="fquad",
        limit=limit,
        license_name="CC-BY-SA 4.0",
        usage="SFT/eval unanswerable QA",
    )


def download_flores() -> dict:
    """S25 — 4 langues uniquement (devtest)."""
    dest_dir = RAW_V3 / "flores"
    dest_dir.mkdir(parents=True, exist_ok=True)
    rows_out = dest_dir / "data.jsonl"
    meta = {
        "id": "S25",
        "repo": "facebook/flores",
        "license": "CC-BY-SA 4.0",
        "usage": "Eval multilingue non-régression",
        "languages": list(FLORES_LANGS),
    }
    _write_source_meta(dest_dir, meta)
    written = 0
    with rows_out.open("w", encoding="utf-8") as f:
        for lang in FLORES_LANGS:
            rel = f"data/language/{lang}/devtest-00000-of-00001.parquet"
            local = dest_dir / f"{lang}_devtest.parquet"
            try:
                if not local.is_file() or local.stat().st_size < 500:
                    print(f"[S25] download {rel} …")
                    _http_get(_resolve("facebook/flores", rel), local)
                tmp = dest_dir / f"_{lang}.jsonl"
                n = _parquet_to_jsonl(local, tmp)
                with tmp.open(encoding="utf-8") as tin:
                    for line in tin:
                        row = json.loads(line)
                        row["flores_lang"] = lang
                        f.write(json.dumps(row, ensure_ascii=False, default=str) + "\n")
                        written += 1
                tmp.unlink(missing_ok=True)
                print(f"[S25] {lang} → {n} rows")
            except Exception as exc:  # noqa: BLE001
                print(f"[S25] SKIP {lang}: {exc}", file=sys.stderr)
    print(f"[S25] OK → {rows_out} ({written} rows)")
    return {**meta, "rows": written, "jsonl": str(rows_out.relative_to(ROOT))}


def download_bsard_sample(limit: int) -> dict:
    tree = _hub_tree("maastrichtlawtech/bsard")
    parts = [
        i["path"]
        for i in tree
        if i.get("type") == "file"
        and any(str(i.get("path", "")).endswith(ext) for ext in (".parquet", ".csv", ".jsonl", ".json"))
    ]
    if not parts:
        raise RuntimeError("bsard: aucun fichier")
    # Prefer smaller questions file if named
    prefer = [p for p in parts if re.search(r"question", p, re.I)]
    rel = sorted(prefer or parts, key=len)[0]
    dest_dir = RAW_V3 / "bsard"
    local = dest_dir / Path(rel).name
    _write_source_meta(
        dest_dir,
        {
            "id": "S23",
            "repo": "maastrichtlawtech/bsard",
            "path": rel,
            "license": "CC-BY 4.0",
            "usage": "Eval retrieval (pas train produit)",
        },
    )
    if not local.is_file():
        print(f"[S23] download {rel} …")
        _http_get(_resolve("maastrichtlawtech/bsard", rel), local)
    out = dest_dir / "data.jsonl"
    if local.suffix == ".parquet":
        n = _parquet_to_jsonl(local, out, limit=limit)
    elif local.suffix == ".csv":
        import csv

        n = 0
        with local.open(encoding="utf-8", newline="") as cin, out.open("w", encoding="utf-8") as f:
            for row in csv.DictReader(cin):
                if limit is not None and n >= limit:
                    break
                f.write(json.dumps(row, ensure_ascii=False) + "\n")
                n += 1
    else:
        n = 0
        with out.open("w", encoding="utf-8") as f:
            if local.suffix == ".jsonl":
                for line in local.open(encoding="utf-8"):
                    if limit is not None and n >= limit:
                        break
                    f.write(line if line.endswith("\n") else line + "\n")
                    n += 1
            else:
                data = json.loads(local.read_text(encoding="utf-8"))
                rows = data if isinstance(data, list) else [data]
                for row in rows:
                    if limit is not None and n >= limit:
                        break
                    f.write(json.dumps(row, ensure_ascii=False, default=str) + "\n")
                    n += 1
    print(f"[S23] OK → {out} ({n} rows)")
    return {
        "id": "S23",
        "repo": "maastrichtlawtech/bsard",
        "rows": n,
        "jsonl": str(out.relative_to(ROOT)),
        "license": "CC-BY 4.0",
        "usage": "Eval retrieval",
    }


def download_doc_albert_readme() -> dict:
    """S20 — clone léger: README + docs markdown via raw GitHub (pas le repo entier)."""
    dest_dir = RAW_V3 / "doc_albert_api"
    dest_dir.mkdir(parents=True, exist_ok=True)
    files = {
        "README.md": "https://raw.githubusercontent.com/betagouv/doc.albert-api/main/README.md",
    }
    # Try common doc paths; skip failures
    extras = [
        "docs/README.md",
        "documentation/README.md",
        "openapi.yaml",
        "openapi.json",
    ]
    ok = []
    for name, url in files.items():
        local = dest_dir / name
        try:
            _http_get(url, local, timeout=60)
            ok.append(name)
            print(f"[S20] OK → {local}")
        except Exception as exc:  # noqa: BLE001
            print(f"[S20] SKIP {name}: {exc}", file=sys.stderr)
    for rel in extras:
        url = f"https://raw.githubusercontent.com/betagouv/doc.albert-api/main/{rel}"
        local = dest_dir / Path(rel).name
        try:
            _http_get(url, local, timeout=60)
            if local.stat().st_size > 50:
                ok.append(rel)
                print(f"[S20] OK → {local}")
            else:
                local.unlink(missing_ok=True)
        except Exception:
            local.unlink(missing_ok=True)
    meta = {
        "id": "S20",
        "repo": "betagouv/doc.albert-api",
        "license": "MIT",
        "usage": "SFT tool-calling / specs API",
        "files": ok,
        "project": "https://github.com/betagouv/doc.albert-api",
    }
    _write_source_meta(dest_dir, meta)
    return meta


def link_v2_reuse() -> dict:
    """Pointeurs vers raw v2 déjà présents (pas de recopie lourde)."""
    dest = RAW_V3 / "from_v2"
    dest.mkdir(parents=True, exist_ok=True)
    raw = ROOT / "datasets" / "raw"
    links = {
        "S01_service_public_hf": raw / "service_public_hf" / "chunks.jsonl",
        "S02_dila_fiches": raw / "service_public_dila" / "fiches_iadaf.jsonl",
        "S02_dila_cerfa": raw / "service_public_dila" / "formulaires_cerfa.jsonl",
        "S14_document_ia": raw / "document_ia" / "catalog.json",
        "ceseda": raw / "ceseda" / "articles.jsonl",
        "kb_iadaf": raw / "kb_iadaf",
    }
    present = {}
    for key, path in links.items():
        present[key] = {"path": str(path), "exists": path.exists()}
    meta = {
        "id": "reuse_v2",
        "note": "Sources déjà téléchargées pour v2 — réutiliser sans re-download",
        "entries": present,
    }
    (dest / "REUSE.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[reuse_v2] manifest → {dest / 'REUSE.json'}")
    return meta


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit-aya", type=int, default=8000, help="Max lignes Aya filtrées")
    parser.add_argument("--limit-legalkit", type=int, default=15000)
    parser.add_argument("--limit-travail", type=int, default=5000)
    parser.add_argument("--limit-dole", type=int, default=5000)
    parser.add_argument("--limit-wildguard", type=int, default=4000)
    parser.add_argument("--limit-piaf", type=int, default=5000)
    parser.add_argument("--limit-fquad", type=int, default=3000)
    parser.add_argument("--limit-bsard", type=int, default=2000)
    parser.add_argument(
        "--skip",
        nargs="*",
        default=[],
        help="IDs à sauter: S03 S06 S08 S09 S11 S12 S13 S20 S23 S25 reuse",
    )
    args = parser.parse_args()
    skip_n = {s.upper() for s in args.skip}

    RAW_V3.mkdir(parents=True, exist_ok=True)
    results: list[dict] = []

    steps = [
        ("reuse", lambda: link_v2_reuse()),
        ("S03", lambda: download_aya(args.limit_aya)),
        ("S06", lambda: download_legalkit(args.limit_legalkit)),
        (
            "S08",
            lambda: download_agentpublic_latest(
                "S08", "AgentPublic/travail-emploi", "travail_emploi", args.limit_travail
            ),
        ),
        (
            "S09",
            lambda: download_agentpublic_latest(
                "S09", "AgentPublic/dole", "dole", args.limit_dole
            ),
        ),
        ("S11", lambda: download_wildguard(args.limit_wildguard)),
        ("S11b", lambda: download_aegis_refusals(args.limit_wildguard)),
        ("curated_safety", lambda: copy_curated_safety_v3()),
        ("S12", lambda: download_piaf(args.limit_piaf)),
        ("S13", lambda: download_fquad(args.limit_fquad)),
        ("S20", lambda: download_doc_albert_readme()),
        ("S23", lambda: download_bsard_sample(args.limit_bsard)),
        ("S25", lambda: download_flores()),
    ]

    for sid, fn in steps:
        if sid.upper() in skip_n or sid in skip_n:
            print(f"SKIP {sid}")
            continue
        try:
            results.append(fn())
        except Exception as exc:  # noqa: BLE001
            print(f"FAIL {sid}: {exc}", file=sys.stderr)
            results.append({"id": sid, "error": str(exc)})

    manifest = {
        "version": "v3",
        "raw_root": str(RAW_V3.relative_to(ROOT)),
        "note": "Téléchargement CPU parallèle au train v2 — builders SFT/RAG v3 à brancher ensuite",
        "sources": results,
    }
    man_path = RAW_V3 / "MANIFEST.json"
    man_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nMANIFEST → {man_path}")
    ok = sum(1 for r in results if "error" not in r)
    print(f"Done. {ok}/{len(results)} OK")
    return 0 if ok == len(results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
