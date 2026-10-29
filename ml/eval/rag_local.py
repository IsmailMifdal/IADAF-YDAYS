"""Retrieve top-k passages from ml/artifacts/rag_v3/ (built by build_rag_index_v3.py)."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DIR = ROOT / "artifacts" / "rag_v3"


class LocalRag:
    def __init__(self, index_dir: Path = DEFAULT_DIR):
        self.index_dir = index_dir
        emb_path = index_dir / "embeddings.npy"
        meta_path = index_dir / "passages.jsonl"
        if not emb_path.is_file() or not meta_path.is_file():
            raise FileNotFoundError(
                f"Index RAG manquant dans {index_dir} — lancez "
                "python ml/datasets/build_rag_index_v3.py"
            )
        self.embeddings = np.load(emb_path)
        self.passages = [
            json.loads(line) for line in meta_path.open(encoding="utf-8") if line.strip()
        ]
        meta = json.loads((index_dir / "SOURCE.json").read_text(encoding="utf-8"))
        self.model_name = meta.get("model") or (
            "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
        )
        self._model = None

    def _embed_query(self, q: str) -> np.ndarray:
        if self._model is None:
            from sentence_transformers import SentenceTransformer

            self._model = SentenceTransformer(self.model_name, device="cpu")
        v = self._model.encode([q], normalize_embeddings=True, convert_to_numpy=True)
        return np.asarray(v[0], dtype=np.float32)

    def retrieve(self, question: str, top_k: int = 4) -> list[dict]:
        q = self._embed_query(question)
        scores = self.embeddings @ q
        idx = np.argpartition(-scores, min(top_k, len(scores) - 1))[:top_k]
        idx = idx[np.argsort(-scores[idx])]
        out = []
        for i in idx:
            p = dict(self.passages[int(i)])
            p["score"] = float(scores[int(i)])
            out.append(p)
        return out

    def format_context(self, hits: list[dict], max_chars: int = 3500) -> str:
        blocks = []
        size = 0
        for h in hits:
            block = f"[{h.get('title') or 'Fiche'}] {h['text']}\n[Source: {h.get('url')}]\n"
            if size + len(block) > max_chars:
                break
            blocks.append(block)
            size += len(block)
        return "\n".join(blocks)
