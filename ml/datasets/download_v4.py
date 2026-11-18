#!/usr/bin/env python3
"""Télécharge les datasets delta ML v4 (P0/P1) dans ml/datasets/raw/v4/ — CPU only.

Réf. : RAPPORT-DEEPRESEARCH-V4.md · SOURCES.md
Ne remplace pas raw/v3. Vérifier licences (SOURCE.json) avant train.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]  # ml/
RAW_V4 = ROOT / "datasets" / "raw" / "v4"
UA = "iadaf-ml-download-v4/1.0"


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
    with urllib.request.urlopen(req, timeout=90) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _resolve(repo: str, rel: str) -> str:
    return f"https://huggingface.co/datasets/{repo}/resolve/main/{rel}"


def _write_source_meta(dest_dir: Path, meta: dict) -> None:
    dest_dir.mkdir(parents=True, exist_ok=True)
    (dest_dir / "SOURCE.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def _parquet_to_jsonl(
    parquet_path: Path,
    out: Path,
    *,
    limit: int | None = None,
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
            f.write(json.dumps(row, ensure_ascii=False, default=str) + "\n")
            written += 1
    return written


_DATA_SUFFIXES = (
    ".parquet",
    ".jsonl",
    ".jsonl.gz",
    ".json",
    ".csv",
    ".tsv",
)


def _pick_data_files(tree: list[dict], *, prefer_substrings: tuple[str, ...] = ()) -> list[str]:
    """Pick downloadable tabular files — never rely on `datasets` (zstd bug)."""
    parts = [
        item["path"]
        for item in tree
        if item.get("type") == "file"
        and any(str(item.get("path", "")).lower().endswith(suf) for suf in _DATA_SUFFIXES)
    ]
    # Skip toxic / infos / huge corpus dumps unless preferred
    parts = [
        p
        for p in parts
        if "toxic" not in p.lower()
        and "dataset_infos" not in p.lower()
        and not p.lower().endswith(".png")
    ]
    if prefer_substrings:
        ranked = [p for p in parts if any(s in p.lower() for s in prefer_substrings)]
        if ranked:
            parts = ranked
    # Prefer train / hard-1k / small splits
    priority = []
    rest = []
    for p in parts:
        low = p.lower()
        if "hard-1k" in low or "train" in low or "topics" in low:
            priority.append(p)
        else:
            rest.append(p)
    ordered = sorted(priority) + sorted(rest)
    # Cap files to avoid multi-GB corpus dumps (e.g. nomiracl *.jsonl.gz)
    capped: list[str] = []
    for p in ordered:
        if p.lower().endswith(".jsonl.gz") and "corpus" in p.lower():
            continue  # too large; topics/tsv are enough for abstention samples
        capped.append(p)
        if len(capped) >= 6:
            break
    return capped


def _rows_from_local(path: Path, limit: int) -> list[dict]:
    """Parse parquet/jsonl/csv/tsv/gz into row dicts (stdlib + pyarrow only)."""
    import csv
    import gzip

    name = path.name.lower()
    rows: list[dict] = []

    if name.endswith(".parquet"):
        import pyarrow.parquet as pq

        table = pq.read_table(path)
        keep = [
            c
            for c in table.column_names
            if c.lower() not in {"embedding", "embeddings", "vector"}
        ]
        table = table.select(keep)
        for i in range(table.num_rows):
            if len(rows) >= limit:
                break
            rows.append({col: table.column(col)[i].as_py() for col in table.column_names})
        return rows

    opener = gzip.open if name.endswith(".gz") else open
    mode = "rt"
    with opener(path, mode, encoding="utf-8", errors="replace") as f:  # type: ignore[arg-type]
        if name.endswith(".jsonl") or name.endswith(".jsonl.gz"):
            for line in f:
                if len(rows) >= limit:
                    break
                line = line.strip()
                if not line:
                    continue
                rows.append(json.loads(line))
            return rows
        if name.endswith(".json"):
            payload = json.load(f)
            if isinstance(payload, list):
                return payload[:limit]
            if isinstance(payload, dict):
                for key in ("data", "rows", "examples", "train"):
                    if isinstance(payload.get(key), list):
                        return payload[key][:limit]
                return [payload]
            return []
        # csv / tsv
        dialect_delim = "\t" if ".tsv" in name else ","
        reader = csv.DictReader(f, delimiter=dialect_delim)
        for row in reader:
            if len(rows) >= limit:
                break
            rows.append(dict(row))
    return rows


def download_hf_sample(
    *,
    source_id: str,
    repo: str,
    dest_name: str,
    license_name: str,
    usage: str,
    limit: int,
    prefer: tuple[str, ...] = (),
) -> dict:
    dest_dir = RAW_V4 / dest_name
    out = dest_dir / "data.jsonl"
    meta = {
        "id": source_id,
        "repo": repo,
        "license": license_name,
        "usage": usage,
        "url": f"https://huggingface.co/datasets/{repo}",
        "limit": limit,
        "license_audit": "verify_before_train",
    }
    try:
        tree = _hub_tree(repo)
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        meta["error"] = f"tree: {exc}"
        _write_source_meta(dest_dir, meta)
        print(f"[{source_id}] FAIL tree: {exc}", file=sys.stderr)
        return meta

    rels = _pick_data_files(tree, prefer_substrings=prefer)
    if not rels:
        meta["error"] = "no_downloadable_tabular_files"
        _write_source_meta(dest_dir, meta)
        print(f"[{source_id}] FAIL: no parquet/jsonl/csv in repo", file=sys.stderr)
        return meta

    written_total = 0
    out.parent.mkdir(parents=True, exist_ok=True)
    used_files: list[str] = []
    with out.open("w", encoding="utf-8") as f:
        for rel in rels:
            if written_total >= limit:
                break
            # Keep nested names unique (arabic/topics/….tsv)
            safe = rel.replace("/", "__")
            local = dest_dir / safe
            if not local.is_file() or local.stat().st_size < 50:
                print(f"[{source_id}] download {rel} …")
                try:
                    _http_get(_resolve(repo, rel), local)
                except Exception as exc:  # noqa: BLE001
                    print(f"[{source_id}] skip {rel}: {exc}", file=sys.stderr)
                    continue
            try:
                for row in _rows_from_local(local, limit - written_total):
                    f.write(json.dumps(row, ensure_ascii=False, default=str) + "\n")
                    written_total += 1
                    if written_total >= limit:
                        break
                used_files.append(rel)
            except Exception as exc:  # noqa: BLE001
                print(f"[{source_id}] parse fail {rel}: {exc}", file=sys.stderr)

    meta["rows"] = written_total
    meta["jsonl"] = str(out.relative_to(ROOT))
    meta["files"] = used_files
    meta["mode"] = "http_direct"
    _write_source_meta(dest_dir, meta)
    if written_total == 0:
        meta["error"] = "zero_rows"
        _write_source_meta(dest_dir, meta)
        print(f"[{source_id}] FAIL: 0 rows", file=sys.stderr)
        return meta
    print(f"[{source_id}] OK → {out} ({written_total} rows)")
    return meta


def download_dila_carte_grise_meta() -> dict:
    """Pointeur data.gouv — télécharge la fiche dataset (pas tout le ZIP lourd)."""
    dest_dir = RAW_V4 / "dila_carte_grise"
    dest_dir.mkdir(parents=True, exist_ok=True)
    url = "https://www.data.gouv.fr/api/1/datasets/simulateur-de-cout-du-certificat-dimmatriculation-carte-grise/"
    meta = {
        "id": "DELTA-14",
        "license": "Licence Ouverte",
        "usage": "RAG + skill_ants_cost_and_route + SFT synth",
        "url": "https://www.data.gouv.fr/datasets/simulateur-de-cout-du-certificat-dimmatriculation-carte-grise",
        "api": url,
    }
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=60) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
        (dest_dir / "dataset_api.json").write_text(
            json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        resources = [
            {"title": r.get("title"), "url": r.get("url"), "format": r.get("format")}
            for r in (payload.get("resources") or [])
        ]
        meta["resources"] = resources[:20]
        meta["rows"] = len(resources)
    except Exception as exc:  # noqa: BLE001
        meta["error"] = str(exc)
        print(f"[DELTA-14] FAIL: {exc}", file=sys.stderr)
    _write_source_meta(dest_dir, meta)
    print(f"[DELTA-14] meta → {dest_dir}")
    return meta


def write_portals_ants_stub() -> dict:
    """Fiches portail ANTS / Ameli EN / CLEISS — URLs canoniques pour RAG/SFT grounded."""
    dest_dir = RAW_V4 / "portals_ants_ameli_cleiss"
    dest_dir.mkdir(parents=True, exist_ok=True)
    rows = [
        {
            "id": "ants_immat_home",
            "title": "Certificat d'immatriculation (carte grise) — ANTS",
            "url": "https://immatriculation.ants.gouv.fr/",
            "lang": "fr",
            "summary": (
                "La demande de certificat d'immatriculation (carte grise) se fait en ligne "
                "sur le site de l'ANTS : https://immatriculation.ants.gouv.fr/ . "
                "Ce n'est plus un dépôt systématique en préfecture depuis 2017. "
                "Préparez identité, justificatif de domicile, contrôle technique si requis, "
                "et pièces du véhicule. [Source: https://immatriculation.ants.gouv.fr/]"
            ),
        },
        {
            "id": "ants_vs_anef",
            "title": "ANTS vs ANEF",
            "url": "https://ants.gouv.fr/",
            "lang": "fr",
            "summary": (
                "ANTS gère les titres sécurisés (CNI, passeport, permis, carte grise). "
                "ANEF gère les démarches de séjour des étrangers. Ne pas confondre. "
                "[Source: https://ants.gouv.fr/]"
            ),
        },
        {
            "id": "ameli_ame_en",
            "title": "AME — State medical aid (EN)",
            "url": "https://www.ameli.fr/",
            "lang": "en",
            "summary": (
                "AME (Aide Médicale de l'État) is state medical aid for eligible people "
                "residing in France irregularly, under conditions (often 3 months residence). "
                "It is NOT a bank account and must not be confused with PUMa. "
                "[Source: https://www.service-public.fr/]"
            ),
        },
        {
            "id": "student_work_964",
            "title": "Travail avec titre étudiant",
            "url": "https://www.service-public.fr/",
            "lang": "fr",
            "summary": (
                "Avec un titre de séjour étudiant, le travail est possible sous conditions : "
                "limite habituelle 964 heures par an (environ 60 % d'un temps plein). "
                "Vérifiez les mentions de votre titre. [Source: https://www.service-public.fr/]"
            ),
        },
    ]
    out = dest_dir / "portals.jsonl"
    with out.open("w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
    meta = {
        "id": "DELTA-16",
        "license": "Contenus État — réutilisation à confirmer",
        "usage": "RAG + SFT grounded",
        "url": "https://immatriculation.ants.gouv.fr/",
        "rows": len(rows),
        "jsonl": str(out.relative_to(ROOT)),
    }
    _write_source_meta(dest_dir, meta)
    print(f"[DELTA-16] OK → {out} ({len(rows)})")
    return meta


def copy_document_ia_pointer() -> dict:
    """Réutilise catalog document-ia v2/v3 si présent."""
    dest = RAW_V4 / "document_ia"
    dest.mkdir(parents=True, exist_ok=True)
    candidates = [
        ROOT / "datasets" / "raw" / "document_ia" / "catalog.json",
        ROOT / "datasets" / "raw" / "v3" / "from_v2" / "REUSE.json",
    ]
    found = None
    for c in candidates:
        if c.is_file():
            found = c
            break
    meta = {
        "id": "DELTA-21",
        "license": "beta.gouv — vérifier LICENSE",
        "usage": "schemas JSON extraction",
        "url": "https://github.com/betagouv/document-ia",
        "local_pointer": str(found) if found else None,
        "exists": bool(found),
    }
    _write_source_meta(dest, meta)
    print(f"[DELTA-21] pointer exists={bool(found)}")
    return meta


def copy_curated_v4() -> dict:
    curated = ROOT / "datasets" / "curated"
    dest = RAW_V4 / "curated_v4"
    dest.mkdir(parents=True, exist_ok=True)
    copied = []
    for name in (
        "allowlist_in_scope_v4.jsonl",
        "refuse_bourse_v4.jsonl",
        "multilang_ko_upsample_v4.jsonl",
        "docs_explain_v4.jsonl",
    ):
        src = curated / name
        if src.is_file():
            shutil.copy2(src, dest / name)
            copied.append(name)
    meta = {"id": "curated_v4", "files": copied, "usage": "SFT buckets 1/2/5/6"}
    _write_source_meta(dest, meta)
    print(f"[curated_v4] copied {len(copied)} files")
    return meta


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=4000, help="Max rows per HF dataset")
    parser.add_argument(
        "--skip",
        nargs="*",
        default=[],
        help="IDs à sauter (DELTA-01, portals, curated, …)",
    )
    args = parser.parse_args()
    skip = {s.upper() for s in args.skip}
    RAW_V4.mkdir(parents=True, exist_ok=True)
    results: list[dict] = []

    hf_jobs = [
        (
            "DELTA-01",
            lambda: download_hf_sample(
                source_id="DELTA-01",
                repo="moncefem/legi-instruct-fr",
                dest_name="legi_instruct_fr",
                license_name="Apache-2.0",
                usage="SFT citation/abstention/tools",
                limit=min(args.limit, 8000),
                prefer=("train.jsonl", "data/"),
            ),
        ),
        (
            "DELTA-02",
            lambda: download_hf_sample(
                source_id="DELTA-02",
                repo="AmazonScience/FalseReject",
                dest_name="false_reject",
                license_name="CC-BY (confirm)",
                usage="SFT anti-sur-refus",
                limit=min(args.limit, 5000),
                prefer=("train.jsonl",),
            ),
        ),
        (
            "DELTA-03",
            lambda: download_hf_sample(
                source_id="DELTA-03",
                repo="bench-llm/or-bench",
                dest_name="or_bench",
                license_name="CC-BY-4.0",
                usage="SFT over-refusal (exclude toxic)",
                limit=min(args.limit, 3000),
                prefer=("or-bench-hard-1k", "hard-1k"),
            ),
        ),
        (
            "DELTA-06",
            lambda: download_hf_sample(
                source_id="DELTA-06",
                repo="DAMO-NLP-SG/MultiJail",
                dest_name="multijail",
                license_name="MIT",
                usage="SFT jailbreaks multi",
                limit=min(args.limit, 3000),
                prefer=("multijail.csv",),
            ),
        ),
        (
            "DELTA-07",
            lambda: download_hf_sample(
                source_id="DELTA-07",
                repo="ToxicityPrompts/PolyGuardPrompts",
                dest_name="polyguard",
                license_name="CC-BY-4.0",
                usage="SFT moderation multi",
                limit=min(args.limit, 3000),
                prefer=("ar", "polyguard"),
            ),
        ),
        (
            "DELTA-10",
            lambda: download_hf_sample(
                source_id="DELTA-10",
                repo="miracl/nomiracl",
                dest_name="nomiracl",
                license_name="Apache-2.0",
                usage="SFT abstention multi",
                limit=min(args.limit, 2000),
                prefer=(
                    "arabic/topics",
                    "french/topics",
                    "spanish/topics",
                    "english/topics",
                ),
            ),
        ),
        (
            "DELTA-17",
            lambda: download_hf_sample(
                source_id="DELTA-17",
                repo="Archangel-system/glaive-function-calling-v2-openai-native",
                dest_name="glaive_fc",
                license_name="Apache-2.0",
                usage="SFT tool-calling",
                limit=min(args.limit, 3000),
            ),
        ),
    ]

    extra = [
        ("DELTA-14", download_dila_carte_grise_meta),
        ("DELTA-16", write_portals_ants_stub),
        ("DELTA-21", copy_document_ia_pointer),
        ("CURATED", copy_curated_v4),
    ]

    for sid, fn in hf_jobs + extra:
        if sid.upper() in skip or sid in skip:
            print(f"SKIP {sid}")
            continue
        try:
            results.append(fn())
        except Exception as exc:  # noqa: BLE001
            print(f"FAIL {sid}: {exc}", file=sys.stderr)
            results.append({"id": sid, "error": str(exc)})

    manifest = {
        "version": "v4",
        "raw_root": str(RAW_V4.relative_to(ROOT)),
        "note": "Delta P0/P1 — audit licence SOURCE.json avant train lora_v4",
        "sources": results,
    }
    man_path = RAW_V4 / "MANIFEST.json"
    man_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nMANIFEST → {man_path}")
    ok = sum(1 for r in results if "error" not in r)
    print(f"Done. {ok}/{len(results)} OK")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
