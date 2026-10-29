#!/usr/bin/env python3
"""Télécharge les sources P0 « Qualité Max » → ml/datasets/raw/v3/ (CPU only).

Réf. RAPPORT-DEEPRESEARCH-V3-QUALITE.md
Ne touche pas processed/ ni le GGUF v2.
"""

from __future__ import annotations

import json
import shutil
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW_V3 = ROOT / "datasets" / "raw" / "v3"
UA = "iadaf-ml-download-v3-qualite/1.0"


def _http_get(url: str, dest: Path, timeout: int = 600) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".part")
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as resp, tmp.open("wb") as out:
        shutil.copyfileobj(resp, out)
    tmp.replace(dest)


def _resolve(repo: str, rel: str) -> str:
    return f"https://huggingface.co/datasets/{repo}/resolve/main/{rel}"


def _hub_tree(repo: str) -> list[dict]:
    api = f"https://huggingface.co/api/datasets/{repo}/tree/main?recursive=true&expand=false"
    req = urllib.request.Request(api, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _parquet_to_jsonl(pq: Path, out: Path, limit: int | None = None, row_filter=None) -> int:
    import pyarrow.parquet as pqmod

    table = pqmod.read_table(pq)
    keep = [c for c in table.column_names if c.lower() not in {"embedding", "embeddings", "vector"}]
    table = table.select(keep)
    n = 0
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", encoding="utf-8") as f:
        for i in range(table.num_rows):
            if limit is not None and n >= limit:
                break
            row = {c: table.column(c)[i].as_py() for c in table.column_names}
            if row_filter and not row_filter(row):
                continue
            f.write(json.dumps(row, ensure_ascii=False, default=str) + "\n")
            n += 1
    return n


def _meta(dest: Path, meta: dict) -> None:
    dest.mkdir(parents=True, exist_ok=True)
    (dest / "SOURCE.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")


def download_yssf_service_public() -> dict:
    """SRC-01 — priorité absolue Qualité Max."""
    repo = "yssf-io/service-public"
    rel = "data/train.parquet"
    dest = RAW_V3 / "yssf_service_public"
    pq = dest / "train.parquet"
    out = dest / "fiches.jsonl"
    _meta(
        dest,
        {
            "id": "SRC-01",
            "repo": repo,
            "license": "Licence Ouverte 2.0",
            "usage": "RAG + SFT grounded",
            "url": _resolve(repo, rel),
        },
    )
    if not pq.is_file() or pq.stat().st_size < 10_000:
        print(f"[SRC-01] download {rel} …")
        _http_get(_resolve(repo, rel), pq)
    else:
        print(f"[SRC-01] parquet déjà là → {pq}")

    def has_content(row: dict) -> bool:
        if "has_content" in row:
            return bool(row["has_content"])
        text = row.get("text") or row.get("content") or ""
        return len(str(text)) > 200

    n_all = _parquet_to_jsonl(pq, dest / "all.jsonl")
    n = _parquet_to_jsonl(pq, out, row_filter=has_content)
    print(f"[SRC-01] OK fiches content={n} / all={n_all} → {out}")
    return {"id": "SRC-01", "rows_content": n, "rows_all": n_all, "jsonl": str(out)}


def download_evalap_sample(limit: int = 200) -> dict:
    """SRC-10 — quelques shards (dataset découpé en petits parquet)."""
    repo = "AgentPublic/evalap-mfs_tooling_v7-50"
    dest = RAW_V3 / "evalap_mfs"
    tree = _hub_tree(repo)
    parts = sorted(
        i["path"]
        for i in tree
        if i.get("type") == "file" and str(i.get("path", "")).endswith(".parquet")
    )
    _meta(
        dest,
        {
            "id": "SRC-10",
            "repo": repo,
            "license": "Licence Ouverte 2.0",
            "usage": "SFT/eval France Services",
            "n_shards_available": len(parts),
        },
    )
    out = dest / "data.jsonl"
    written = 0
    with out.open("w", encoding="utf-8") as f:
        for rel in parts[:30]:  # cap shards
            if written >= limit:
                break
            local = dest / Path(rel).name
            try:
                if not local.is_file():
                    print(f"[SRC-10] {rel}")
                    _http_get(_resolve(repo, rel), local)
                tmp = dest / "_tmp.jsonl"
                n = _parquet_to_jsonl(local, tmp, limit=limit - written)
                with tmp.open(encoding="utf-8") as tin:
                    for line in tin:
                        f.write(line)
                        written += 1
                tmp.unlink(missing_ok=True)
            except Exception as exc:  # noqa: BLE001
                print(f"[SRC-10] SKIP {rel}: {exc}", file=sys.stderr)
    print(f"[SRC-10] OK → {out} ({written} rows)")
    return {"id": "SRC-10", "rows": written, "jsonl": str(out)}


def download_latest_agentpublic(source_id: str, repo: str, dest_name: str, limit: int) -> dict:
    dest = RAW_V3 / dest_name
    tree = _hub_tree(repo)
    parts = sorted(
        i["path"]
        for i in tree
        if i.get("type") == "file" and str(i.get("path", "")).endswith(".parquet")
    )
    if not parts:
        raise RuntimeError(f"no parquet in {repo}")
    # Prefer paths with "latest" or take last by name
    latest = [p for p in parts if "latest" in p.lower()]
    rel = latest[-1] if latest else parts[-1]
    # If multi-part same date, take part_0 only for sample
    if "part_" in rel:
        stem = rel.rsplit("part_", 1)[0]
        rel = next((p for p in parts if p.startswith(stem) and p.endswith("part_0.parquet")), rel)
    local = dest / Path(rel).name
    _meta(
        dest,
        {
            "id": source_id,
            "repo": repo,
            "path": rel,
            "license": "Licence Ouverte 2.0",
            "url": _resolve(repo, rel),
        },
    )
    if not local.is_file() or local.stat().st_size < 1000:
        print(f"[{source_id}] download {rel} …")
        _http_get(_resolve(repo, rel), local)
    out = dest / "data.jsonl"
    n = _parquet_to_jsonl(local, out, limit=limit)
    print(f"[{source_id}] OK → {out} ({n})")
    return {"id": source_id, "rows": n, "jsonl": str(out), "repo": repo}


def download_xstest() -> dict:
    repo = "allenai/xstest-response"
    dest = RAW_V3 / "xstest"
    rel = "data/response_refusal-00000-of-00001.parquet"
    local = dest / Path(rel).name
    _meta(
        dest,
        {
            "id": "SRC-29",
            "repo": repo,
            "license": "Apache-2.0",
            "usage": "Eval / SFT anti-sur-refus",
        },
    )
    if not local.is_file():
        print(f"[SRC-29] download {rel} …")
        _http_get(_resolve(repo, rel), local)
    out = dest / "data.jsonl"
    n = _parquet_to_jsonl(local, out)
    print(f"[SRC-29] OK → {out} ({n})")
    return {"id": "SRC-29", "rows": n, "jsonl": str(out)}


def main() -> int:
    RAW_V3.mkdir(parents=True, exist_ok=True)
    results = []
    steps = [
        ("SRC-01", download_yssf_service_public),
        ("SRC-10", lambda: download_evalap_sample(200)),
        (
            "SRC-08",
            lambda: download_latest_agentpublic(
                "SRC-08",
                "AgentPublic/local-administrations-directory",
                "local_admin_dir",
                5000,
            ),
        ),
        (
            "SRC-07",
            lambda: download_latest_agentpublic(
                "SRC-07", "AgentPublic/cnil", "cnil", 3000
            ),
        ),
        ("SRC-29", download_xstest),
    ]
    for sid, fn in steps:
        try:
            results.append(fn())
        except Exception as exc:  # noqa: BLE001
            print(f"FAIL {sid}: {exc}", file=sys.stderr)
            results.append({"id": sid, "error": str(exc)})

    man_path = RAW_V3 / "MANIFEST_QUALITE.json"
    man_path.write_text(
        json.dumps({"version": "v3-qualite", "sources": results}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"MANIFEST → {man_path}")
    ok = sum(1 for r in results if "error" not in r)
    print(f"Done {ok}/{len(results)}")
    return 0 if ok == len(results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
