#!/usr/bin/env python3
"""Index RAG local v3 (CPU) depuis yssf-io + KB IADAF → ml/artifacts/rag_v3/

Utilise sentence-transformers (même famille que ai-service si dispo).
Pas de GPU requis. Pour eval --with-rag et smoke Hit@k.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
RAW_V3 = ROOT / "datasets" / "raw" / "v3"
KB = ROOT.parent / "ai-service" / "app" / "data" / "knowledge_base"
OUT = ROOT / "artifacts" / "rag_v3"
DEFAULT_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"


def chunk_text(text: str, max_chars: int = 900, overlap: int = 120) -> list[str]:
    text = re.sub(r"\s+", " ", (text or "").strip())
    if not text:
        return []
    if len(text) <= max_chars:
        return [text]
    chunks = []
    i = 0
    while i < len(text):
        chunks.append(text[i : i + max_chars])
        i += max_chars - overlap
    return chunks


def load_passages(yssf_limit: int | None) -> list[dict]:
    passages: list[dict] = []
    yssf = RAW_V3 / "yssf_service_public" / "fiches.jsonl"
    if yssf.is_file():
        n = 0
        with yssf.open(encoding="utf-8") as f:
            for line in f:
                if yssf_limit is not None and n >= yssf_limit:
                    break
                row = json.loads(line)
                text = (row.get("text") or "").strip()
                url = row.get("url") or "https://www.service-public.fr/"
                title = row.get("title") or ""
                for j, ch in enumerate(chunk_text(text)):
                    passages.append(
                        {
                            "id": f"yssf_{row.get('id', n)}_{j}",
                            "text": ch,
                            "url": url,
                            "title": title,
                            "source": "yssf-io/service-public",
                        }
                    )
                n += 1
    # KB locale légère
    for name in ("faq.json", "demarches.json", "service_public.json"):
        path = KB / name
        if not path.is_file():
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, list):
            items = data
        elif isinstance(data, dict):
            items = data.get("items") or data.get("fiches") or list(data.values())
            if items and not isinstance(items[0], dict):
                items = [data]
        else:
            items = []
        for i, item in enumerate(items if isinstance(items, list) else []):
            if not isinstance(item, dict):
                continue
            text = (
                item.get("answer")
                or item.get("description")
                or item.get("texte")
                or item.get("content")
                or json.dumps(item, ensure_ascii=False)
            )
            title = item.get("question") or item.get("title") or name
            url = item.get("url") or "https://www.service-public.fr/"
            for j, ch in enumerate(chunk_text(str(text))):
                passages.append(
                    {
                        "id": f"kb_{name}_{i}_{j}",
                        "text": f"{title}\n{ch}",
                        "url": url,
                        "title": str(title)[:200],
                        "source": f"kb:{name}",
                    }
                )
    return passages


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--yssf-limit", type=int, default=None)
    parser.add_argument("--batch-size", type=int, default=64)
    args = parser.parse_args()

    passages = load_passages(args.yssf_limit)
    if not passages:
        print("No passages — run download_v3_qualite.py first")
        return 1
    print(f"Passages: {len(passages)}")

    from sentence_transformers import SentenceTransformer

    print(f"Loading embedder {args.model} (CPU)…")
    model = SentenceTransformer(args.model, device="cpu")
    texts = [p["text"] for p in passages]
    emb = model.encode(
        texts,
        batch_size=args.batch_size,
        show_progress_bar=True,
        normalize_embeddings=True,
        convert_to_numpy=True,
    )
    emb = np.asarray(emb, dtype=np.float32)

    OUT.mkdir(parents=True, exist_ok=True)
    np.save(OUT / "embeddings.npy", emb)
    meta_path = OUT / "passages.jsonl"
    with meta_path.open("w", encoding="utf-8") as f:
        for p in passages:
            f.write(json.dumps(p, ensure_ascii=False) + "\n")
    (OUT / "SOURCE.json").write_text(
        json.dumps(
            {
                "model": args.model,
                "n_passages": len(passages),
                "embedding_dim": int(emb.shape[1]),
                "note": "Cosine sim = dot product (normalized)",
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"OK → {OUT} ({len(passages)} passages, dim={emb.shape[1]})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
