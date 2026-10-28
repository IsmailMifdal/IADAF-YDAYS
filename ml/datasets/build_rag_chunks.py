#!/usr/bin/env python3
"""Build RAG-ready JSON chunks for enrichment of ai-service knowledge_base.

Output is compatible with a manual merge into service_public.json / a side file
consumed by ingest_data.py (list of {id, title, text, source, tags}).
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "datasets" / "raw"
OUT = ROOT / "datasets" / "processed" / "rag_chunks.json"


def stable_id(prefix: str, text: str) -> str:
    h = hashlib.sha256(text.encode("utf-8")).hexdigest()[:12]
    return f"{prefix}_{h}"


def chunk_text(text: str, size: int = 800, overlap: int = 100) -> list[str]:
    text = " ".join(text.split())
    if len(text) <= size:
        return [text] if text else []
    parts = []
    i = 0
    while i < len(text):
        parts.append(text[i : i + size])
        i += size - overlap
    return parts


def from_ceseda(path: Path, limit: int = 500) -> list[dict]:
    if not path.is_file():
        return []
    chunks = []
    with path.open(encoding="utf-8") as f:
        for i, line in enumerate(f):
            if i >= limit:
                break
            row = json.loads(line)
            ref = row.get("ref") or row.get("num") or str(i)
            title = f"CESEDA {ref}"
            texte = row.get("texte") or ""
            for j, part in enumerate(chunk_text(texte)):
                chunks.append(
                    {
                        "id": stable_id("ceseda", f"{ref}-{j}-{part[:40]}"),
                        "title": title,
                        "text": part,
                        "source": "ceseda",
                        "tags": ["droit", "titre-sejour", "asile"],
                    }
                )
    return chunks


def from_hf_sp(path: Path, limit: int = 2000) -> list[dict]:
    if not path.is_file():
        return []
    chunks = []
    with path.open(encoding="utf-8") as f:
        for i, line in enumerate(f):
            if i >= limit:
                break
            row = json.loads(line)
            text = (
                row.get("text")
                or row.get("content")
                or row.get("chunk")
                or row.get("passage")
                or ""
            )
            title = row.get("title") or row.get("titre") or "service-public"
            if not text:
                continue
            chunks.append(
                {
                    "id": stable_id("sp", f"{title}-{text[:60]}"),
                    "title": str(title)[:200],
                    "text": str(text)[:2000],
                    "source": "agentpublic-service-public",
                    "tags": ["service-public", "demarche"],
                }
            )
    return chunks


def from_kb_demarches(path: Path) -> list[dict]:
    if not path.is_file():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    chunks = []
    for d in data:
        title = d.get("title") or d.get("id")
        body = "\n".join(
            [
                d.get("description") or "",
                "Documents: " + ", ".join(d.get("documents_requis") or []),
                "Étapes: " + " | ".join(d.get("etapes") or []),
            ]
        )
        chunks.append(
            {
                "id": stable_id("dem", str(title)),
                "title": title,
                "text": body,
                "source": "kb_demarches",
                "tags": ["iadaf", str(d.get("id") or "")],
            }
        )
    return chunks


def from_dila_jsonl(path: Path, limit: int = 1500, tag: str = "dila") -> list[dict]:
    if not path.is_file():
        return []
    chunks = []
    with path.open(encoding="utf-8") as f:
        for i, line in enumerate(f):
            if i >= limit:
                break
            row = json.loads(line)
            title = row.get("title") or row.get("id") or tag
            text = row.get("text") or row.get("description") or ""
            if not text:
                continue
            for j, part in enumerate(chunk_text(str(text), size=900)):
                chunks.append(
                    {
                        "id": stable_id(tag, f"{row.get('id')}-{j}-{part[:40]}"),
                        "title": str(title)[:200],
                        "text": part,
                        "source": "service-public-dila",
                        "url": row.get("url"),
                        "tags": ["service-public", "dila", tag, row.get("subject") or ""],
                    }
                )
    return chunks


def from_portals(path: Path) -> list[dict]:
    if not path.is_file():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    chunks = []
    for p in data:
        title = p.get("title") or p.get("id")
        body = (p.get("summary") or "") + "\n" + "\n".join(p.get("key_facts") or [])
        chunks.append(
            {
                "id": stable_id("portal", str(p.get("id") or title)),
                "title": title,
                "text": body,
                "source": "portals_official",
                "url": p.get("url"),
                "tags": ["portail"] + list(p.get("use_for") or []),
            }
        )
    return chunks


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ceseda-limit", type=int, default=500)
    parser.add_argument("--sp-limit", type=int, default=2000)
    parser.add_argument("--dila-limit", type=int, default=1500)
    args = parser.parse_args()

    chunks: list[dict] = []
    chunks += from_kb_demarches(RAW / "kb_iadaf" / "demarches.json")
    chunks += from_ceseda(RAW / "ceseda" / "articles.jsonl", args.ceseda_limit)
    chunks += from_hf_sp(RAW / "service_public_hf" / "chunks.jsonl", args.sp_limit)
    chunks += from_dila_jsonl(
        RAW / "service_public_dila" / "fiches_iadaf.jsonl", args.dila_limit, "fiche"
    )
    chunks += from_dila_jsonl(
        RAW / "service_public_dila" / "formulaires_cerfa.jsonl", 400, "cerfa"
    )
    chunks += from_portals(RAW / "curated" / "portals_official.json")

    # Dedupe by id
    seen: set[str] = set()
    unique = []
    for c in chunks:
        if c["id"] in seen:
            continue
        seen.add(c["id"])
        unique.append(c)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(unique, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(unique)} RAG chunks → {OUT}")
    print(
        "Pour enrichir Chroma: fusionner ce fichier dans la KB puis "
        "python ai-service/scripts/ingest_data.py"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
