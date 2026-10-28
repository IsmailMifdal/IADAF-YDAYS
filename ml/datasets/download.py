#!/usr/bin/env python3
"""Download public datasets + copy the local IADAF knowledge base into ml/datasets/raw.

Prefers HuggingFace `datasets`, with a urllib/parquet fallback when the local
stack is broken (known conflict: Anaconda `httpx2` vs `huggingface_hub`).
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
REPO = ROOT.parent  # IADAF-YDAYS
RAW = ROOT / "datasets" / "raw"
KB_SRC = REPO / "ai-service" / "app" / "data" / "knowledge_base"

CESEDA_REPO = "louisbrulenaudet/code-entree-sejour-etrangers-droit-asile"
CESEDA_PARQUET = (
    f"https://huggingface.co/datasets/{CESEDA_REPO}/resolve/main/data/train-00000-of-00001.parquet"
)
# AgentPublic shards vary; list via hub API then download first text-friendly files.
SP_REPO = "AgentPublic/service-public"

# Flux XML officiel DILA (Licence Ouverte) — fiches + CERFA
DILA_SP_ZIP = (
    "https://lecomarquage.service-public.gouv.fr/vdd/3.5/part/zip/vosdroits-latest.zip"
)
DILA_SP_META = (
    "https://www.data.gouv.fr/datasets/"
    "fiches-pratiques-et-ressources-de-service-public-gouv-fr-particuliers"
)

# Schémas document-ia (MIT) — catalogue des types de justificatifs
DOC_IA_INIT = (
    "https://raw.githubusercontent.com/betagouv/document-ia/develop/"
    "document-ia-schemas/src/document_ia_schemas/__init__.py"
)
DOC_IA_TYPES = (
    "cni",
    "passeport",
    "permis_conduire",
    "carte_grise",
    "quittance_loyer",
    "facture_energie",
    "attestation_hebergement",
    "attestation_contrat_energie",
    "avis_imposition",
    "bulletin_salaire",
    "taxe_fonciere",
    "visale_certificate",
)
DOC_IA_RAW = (
    "https://raw.githubusercontent.com/betagouv/document-ia/develop/"
    "document-ia-schemas/src/document_ia_schemas/{name}.py"
)

CURATED = Path(__file__).resolve().parent / "curated"


def copy_local_kb() -> None:
    dest = RAW / "kb_iadaf"
    dest.mkdir(parents=True, exist_ok=True)
    if not KB_SRC.is_dir():
        print(f"WARN: KB introuvable: {KB_SRC}", file=sys.stderr)
        return
    for name in ("demarches.json", "faq.json", "service_public.json"):
        src = KB_SRC / name
        if src.is_file():
            shutil.copy2(src, dest / name)
            print(f"OK  KB → {dest / name}")
        else:
            print(f"SKIP missing {src}")


def _http_get(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "iadaf-ml-download/1.0"},
    )
    with urllib.request.urlopen(req, timeout=120) as resp, dest.open("wb") as out:
        shutil.copyfileobj(resp, out)


def _parquet_to_jsonl(parquet_path: Path, out: Path, limit: int | None = None) -> int:
    try:
        import pyarrow.parquet as pq
    except ImportError as exc:
        raise RuntimeError(
            "pyarrow requis pour le fallback parquet — pip install pyarrow"
        ) from exc

    table = pq.read_table(parquet_path)
    # Drop heavy vector columns
    keep = [
        name
        for name in table.column_names
        if name.lower() not in {"embedding", "embeddings", "vector"}
    ]
    table = table.select(keep)
    n = table.num_rows if limit is None else min(limit, table.num_rows)
    with out.open("w", encoding="utf-8") as f:
        for i in range(n):
            row = {col: table.column(col)[i].as_py() for col in table.column_names}
            f.write(json.dumps(row, ensure_ascii=False, default=str) + "\n")
    return n


def download_ceseda_via_urllib() -> None:
    ceseda_dir = RAW / "ceseda"
    ceseda_dir.mkdir(parents=True, exist_ok=True)
    pq_path = ceseda_dir / "train.parquet"
    out = ceseda_dir / "articles.jsonl"
    print(f"Fallback urllib: {CESEDA_PARQUET}")
    _http_get(CESEDA_PARQUET, pq_path)
    n = _parquet_to_jsonl(pq_path, out)
    print(f"OK  CESEDA → {out} ({n} rows)")


def download_sp_via_urllib(max_sp_rows: int | None) -> None:
    """Download AgentPublic/service-public via hub file list + parquet (no datasets lib)."""
    sp_dir = RAW / "service_public_hf"
    sp_dir.mkdir(parents=True, exist_ok=True)
    api = (
        f"https://huggingface.co/api/datasets/{SP_REPO}/tree/main"
        "?recursive=true&expand=false"
    )
    print(f"Fallback urllib: list files {SP_REPO}")
    try:
        with urllib.request.urlopen(
            urllib.request.Request(api, headers={"User-Agent": "iadaf-ml-download/1.0"}),
            timeout=60,
        ) as resp:
            tree = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        print(f"WARN: AgentPublic tree API: {exc}", file=sys.stderr)
        return

    parquet_files = [
        item["path"]
        for item in tree
        if item.get("type") == "file" and str(item.get("path", "")).endswith(".parquet")
    ]
    if not parquet_files:
        # Sometimes only .json / .arrow
        parquet_files = [
            item["path"]
            for item in tree
            if item.get("type") == "file"
            and any(
                str(item.get("path", "")).endswith(ext)
                for ext in (".json", ".jsonl", ".parquet")
            )
        ]
    if not parquet_files:
        print("WARN: aucun fichier data trouvé pour AgentPublic/service-public", file=sys.stderr)
        return

    # Prefer small / non-embedding shards first
    parquet_files = sorted(
        parquet_files,
        key=lambda p: ("embed" in p.lower(), len(p)),
    )
    out_sp = sp_dir / "chunks.jsonl"
    written = 0
    limit = max_sp_rows if max_sp_rows is not None else 10**9
    with out_sp.open("w", encoding="utf-8") as f:
        for rel in parquet_files:
            if written >= limit:
                break
            url = f"https://huggingface.co/datasets/{SP_REPO}/resolve/main/{rel}"
            local = sp_dir / Path(rel).name
            print(f"  downloading {rel} …")
            try:
                _http_get(url, local)
            except Exception as exc:  # noqa: BLE001
                print(f"  SKIP {rel}: {exc}", file=sys.stderr)
                continue
            if local.suffix == ".parquet":
                tmp = sp_dir / "_tmp.jsonl"
                n = _parquet_to_jsonl(local, tmp, limit=limit - written)
                with tmp.open(encoding="utf-8") as tin:
                    for line in tin:
                        f.write(line)
                        written += 1
                tmp.unlink(missing_ok=True)
            elif local.suffix == ".jsonl":
                with local.open(encoding="utf-8") as tin:
                    for line in tin:
                        if written >= limit:
                            break
                        f.write(line if line.endswith("\n") else line + "\n")
                        written += 1
            elif local.suffix == ".json":
                data = json.loads(local.read_text(encoding="utf-8"))
                if isinstance(data, list):
                    for row in data:
                        if written >= limit:
                            break
                        f.write(json.dumps(row, ensure_ascii=False, default=str) + "\n")
                        written += 1
    print(f"OK  service-public → {out_sp} ({written} rows)")


def download_dila_service_public(force: bool = False) -> None:
    """Download + parse official Service-Public particuliers XML dump."""
    dila_dir = RAW / "service_public_dila"
    dila_dir.mkdir(parents=True, exist_ok=True)
    zip_path = dila_dir / "vosdroits-latest.zip"
    meta = {
        "url": DILA_SP_ZIP,
        "dataset_page": DILA_SP_META,
        "attribution": "Service-Public.gouv.fr / DILA",
        "license": "Licence Ouverte 2.0",
    }
    (dila_dir / "SOURCE.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    if force or not zip_path.is_file() or zip_path.stat().st_size < 1_000_000:
        print(f"Downloading DILA Service-Public XML (~24 Mo) …\n  {DILA_SP_ZIP}")
        try:
            _http_get(DILA_SP_ZIP, zip_path)
        except Exception as exc:  # noqa: BLE001
            print(f"FAIL DILA zip: {exc}", file=sys.stderr)
            return
    else:
        print(f"OK  DILA zip déjà présent → {zip_path}")

    # Parse into filtered JSONL
    try:
        from parse_service_public_xml import parse_zip
    except ImportError:
        # Same directory import when run as script
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        from parse_service_public_xml import parse_zip

    fiches, formulaires = parse_zip(zip_path)
    out_f = dila_dir / "fiches_iadaf.jsonl"
    out_r = dila_dir / "formulaires_cerfa.jsonl"
    with out_f.open("w", encoding="utf-8") as f:
        for row in fiches:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
    with out_r.open("w", encoding="utf-8") as f:
        for row in formulaires:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
    print(f"OK  DILA fiches IADAF → {out_f} ({len(fiches)})")
    print(f"OK  DILA CERFA/formulaires → {out_r} ({len(formulaires)})")


def download_document_ia_catalog() -> None:
    """Fetch beta.gouv document-ia schema module headers as a JSON catalog."""
    dest_dir = RAW / "document_ia"
    dest_dir.mkdir(parents=True, exist_ok=True)
    catalog: list[dict] = []
    for name in DOC_IA_TYPES:
        url = DOC_IA_RAW.format(name=name)
        local = dest_dir / f"{name}.py"
        try:
            _http_get(url, local)
            text = local.read_text(encoding="utf-8", errors="replace")
        except Exception as exc:  # noqa: BLE001
            print(f"  SKIP document-ia {name}: {exc}", file=sys.stderr)
            continue
        # Extract class docstring / Field descriptions lightly
        doc_m = re.search(r'"""(.*?)"""', text, re.S)
        docstring = " ".join((doc_m.group(1) if doc_m else "").split())[:800]
        fields = re.findall(r"^    ([a-zA-Z_][a-zA-Z0-9_]*)\s*:", text, re.M)
        fields = [f for f in fields if f not in {"model_config", "Config"}][:40]
        label_map = {
            "cni": "identity",
            "passeport": "identity",
            "permis_conduire": "identity",
            "carte_grise": "other",
            "quittance_loyer": "address",
            "facture_energie": "address",
            "attestation_hebergement": "address",
            "attestation_contrat_energie": "address",
            "avis_imposition": "other",
            "bulletin_salaire": "other",
            "taxe_fonciere": "other",
            "visale_certificate": "other",
        }
        catalog.append(
            {
                "id": name,
                "iadaf_label": label_map.get(name, "other"),
                "fields": fields,
                "doc": docstring,
                "url": url,
                "license": "MIT",
                "project": "https://github.com/betagouv/document-ia",
            }
        )
        print(f"OK  document-ia schema → {name} ({len(fields)} fields)")

    out = dest_dir / "catalog.json"
    out.write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"OK  document-ia catalog → {out} ({len(catalog)} types)")


def copy_curated() -> None:
    dest = RAW / "curated"
    dest.mkdir(parents=True, exist_ok=True)
    if not CURATED.is_dir():
        print(f"WARN: curated introuvable: {CURATED}", file=sys.stderr)
        return
    for src in CURATED.iterdir():
        if src.is_file():
            shutil.copy2(src, dest / src.name)
            print(f"OK  curated → {dest / src.name}")


def download_hf(max_sp_rows: int | None) -> None:
    used_datasets = False
    try:
        from datasets import load_dataset

        used_datasets = True
    except ImportError:
        print(
            "WARN: package 'datasets' absent — fallback urllib "
            "(pip install datasets huggingface_hub)",
            file=sys.stderr,
        )

    # --- CESEDA ---
    ceseda_ok = False
    if used_datasets:
        try:
            print(f"Downloading {CESEDA_REPO} …")
            ds = load_dataset(CESEDA_REPO, split="train")
            out = RAW / "ceseda" / "articles.jsonl"
            out.parent.mkdir(parents=True, exist_ok=True)
            with out.open("w", encoding="utf-8") as f:
                for row in ds:
                    f.write(json.dumps(dict(row), ensure_ascii=False) + "\n")
            print(f"OK  CESEDA → {out} ({len(ds)} rows)")
            ceseda_ok = True
        except Exception as exc:  # noqa: BLE001
            print(f"WARN: load_dataset CESEDA failed ({exc}) — fallback urllib", file=sys.stderr)

    if not ceseda_ok:
        try:
            download_ceseda_via_urllib()
        except Exception as exc:  # noqa: BLE001
            print(f"FAIL CESEDA: {exc}", file=sys.stderr)

    # --- Service-public ---
    sp_ok = False
    if used_datasets:
        try:
            print(f"Downloading {SP_REPO} …")
            sp = load_dataset(SP_REPO, split="train")
            if max_sp_rows is not None:
                sp = sp.select(range(min(max_sp_rows, len(sp))))
            out_sp = RAW / "service_public_hf" / "chunks.jsonl"
            out_sp.parent.mkdir(parents=True, exist_ok=True)
            cols = [
                c
                for c in sp.column_names
                if c.lower() not in {"embedding", "embeddings", "vector"}
            ]
            with out_sp.open("w", encoding="utf-8") as f:
                for row in sp.select_columns(cols):
                    f.write(json.dumps(dict(row), ensure_ascii=False, default=str) + "\n")
            print(f"OK  service-public → {out_sp} ({len(sp)} rows)")
            sp_ok = True
        except Exception as exc:  # noqa: BLE001
            print(
                f"WARN: load_dataset service-public failed ({exc}) — fallback urllib",
                file=sys.stderr,
            )

    if not sp_ok:
        try:
            download_sp_via_urllib(max_sp_rows)
        except Exception as exc:  # noqa: BLE001
            print(f"FAIL service-public: {exc}", file=sys.stderr)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--skip-hf", action="store_true", help="Saute HuggingFace (CESEDA / AgentPublic)")
    parser.add_argument("--skip-dila", action="store_true", help="Saute le flux XML DILA")
    parser.add_argument("--skip-document-ia", action="store_true", help="Saute document-ia")
    parser.add_argument("--force-dila", action="store_true", help="Re-télécharge le zip DILA")
    parser.add_argument(
        "--max-sp-rows",
        type=int,
        default=3000,
        help="Limite de lignes AgentPublic/service-public (défaut 3000)",
    )
    args = parser.parse_args()
    RAW.mkdir(parents=True, exist_ok=True)
    copy_local_kb()
    copy_curated()
    if not args.skip_document_ia:
        try:
            download_document_ia_catalog()
        except Exception as exc:  # noqa: BLE001
            print(f"FAIL document-ia: {exc}", file=sys.stderr)
    if not args.skip_dila:
        try:
            download_dila_service_public(force=args.force_dila)
        except Exception as exc:  # noqa: BLE001
            print(f"FAIL DILA: {exc}", file=sys.stderr)
    if not args.skip_hf:
        download_hf(args.max_sp_rows)
    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
