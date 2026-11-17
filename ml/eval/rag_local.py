"""Retrieve top-k passages from ml/artifacts/rag_v3/ (built by build_rag_index_v3.py).

Hybrid: dense cosine + BM25 fused with Reciprocal Rank Fusion, then a light
lexical/title rerank (curated KB patches preferred).
"""

from __future__ import annotations

import json
import math
import re
from collections import Counter
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DIR = ROOT / "artifacts" / "rag_v3"

_ACRONYM = re.compile(
    r"\b(AME|PUMa|C2S|CAF|CPAM|ANEF|ANTS|OFII|OFPRA|CERFA|RIB|IBAN|MRZ|"
    r"APL|ALS|ALF|RFR|APS|VLS-?TS|URSSAF|SIREN|SIRET|RNE|INPI|RSA|SAMU|Ameli)\b",
    re.I,
)
_TOKEN = re.compile(r"[a-zàâäéèêëïîôùûüç0-9]{2,}", re.I)


def _tokenize(text: str) -> list[str]:
    return [t.lower() for t in _TOKEN.findall(text or "")]


class _BM25:
    """Minimal Okapi BM25 (no external dep)."""

    def __init__(self, corpus_tokens: list[list[str]], k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.corpus = corpus_tokens
        self.n = len(corpus_tokens)
        self.doc_len = np.array([len(d) for d in corpus_tokens], dtype=np.float32)
        self.avgdl = float(self.doc_len.mean()) if self.n else 1.0
        df: Counter[str] = Counter()
        for doc in corpus_tokens:
            df.update(set(doc))
        self.idf = {
            t: math.log(1.0 + (self.n - f + 0.5) / (f + 0.5)) for t, f in df.items()
        }

    def scores(self, query_tokens: list[str]) -> np.ndarray:
        out = np.zeros(self.n, dtype=np.float32)
        if not query_tokens or not self.n:
            return out
        q_counts = Counter(query_tokens)
        for i, doc in enumerate(self.corpus):
            if not doc:
                continue
            tf = Counter(doc)
            dl = self.doc_len[i]
            score = 0.0
            for t, qf in q_counts.items():
                if t not in tf:
                    continue
                idf = self.idf.get(t, 0.0)
                freq = tf[t]
                denom = freq + self.k1 * (1.0 - self.b + self.b * dl / self.avgdl)
                score += idf * freq * (self.k1 + 1.0) / denom * qf
            out[i] = score
        return out


def _rrf(rank_lists: list[np.ndarray], n: int, k: int = 60) -> np.ndarray:
    """Reciprocal Rank Fusion over arrays of passage indices (best-first)."""
    scores = np.zeros(n, dtype=np.float32)
    for ranks in rank_lists:
        for r, idx in enumerate(ranks):
            scores[int(idx)] += 1.0 / (k + r + 1)
    return scores


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
        self._hay = [
            f"{(p.get('title') or '')} {(p.get('text') or '')}".lower()
            for p in self.passages
        ]
        self._titles = [(p.get("title") or "").lower().strip() for p in self.passages]
        self._title_norm = [
            re.sub(r"[^\w]+", "", t, flags=re.UNICODE) for t in self._titles
        ]
        self._tokens = [_tokenize(h) for h in self._hay]
        self._bm25 = _BM25(self._tokens)
        self._curated = np.array(
            [
                1.0
                if str(p.get("source") or "").startswith(("kb:", "curated:"))
                else 0.0
                for p in self.passages
            ],
            dtype=np.float32,
        )

    def _embed_query(self, q: str) -> np.ndarray:
        if self._model is None:
            from sentence_transformers import SentenceTransformer

            self._model = SentenceTransformer(self.model_name, device="cpu")
        v = self._model.encode([q], normalize_embeddings=True, convert_to_numpy=True)
        return np.asarray(v[0], dtype=np.float32)

    def _query_terms(self, question: str) -> list[str]:
        terms = _tokenize(question)
        terms.extend(m.group(0).lower() for m in _ACRONYM.finditer(question or ""))
        # keep short phone / emergency codes
        terms.extend(re.findall(r"\b\d{2,5}\b", question or ""))
        return terms

    def _title_boost(self, question: str) -> np.ndarray:
        q = (question or "").lower().strip()
        q_compact = re.sub(r"[^\w]+", "", q, flags=re.UNICODE)
        boost = np.zeros(len(self.passages), dtype=np.float32)
        q_toks = set(_tokenize(q))
        for i, title in enumerate(self._titles):
            if not title:
                continue
            if title == q or self._title_norm[i] == q_compact:
                boost[i] += 2.5
            elif title in q or q in title:
                boost[i] += 1.2
            else:
                ttoks = set(_tokenize(title))
                if ttoks and q_toks:
                    overlap = len(ttoks & q_toks) / max(len(ttoks), 1)
                    if overlap >= 0.7:
                        boost[i] += 0.8
                    elif overlap >= 0.45:
                        boost[i] += 0.35
            # digit / short-code presence (3646, 15, …)
            for dig in re.findall(r"\d{2,5}", q):
                if dig in self._hay[i]:
                    boost[i] += 0.9
        boost += 0.15 * self._curated
        return boost

    def retrieve(self, question: str, top_k: int = 4, pool: int | None = None) -> list[dict]:
        n = len(self.passages)
        pool_n = pool or min(n, max(top_k * 40, 80))
        # Dense
        qv = self._embed_query(question)
        dense = self.embeddings @ qv
        dense_idx = np.argpartition(-dense, min(pool_n, n) - 1)[:pool_n]
        dense_idx = dense_idx[np.argsort(-dense[dense_idx])]
        # BM25
        bm = self._bm25.scores(self._query_terms(question))
        # If BM25 is all zeros (weird query), skip
        if float(bm.max()) > 0:
            bm_idx = np.argpartition(-bm, min(pool_n, n) - 1)[:pool_n]
            bm_idx = bm_idx[np.argsort(-bm[bm_idx])]
        else:
            bm_idx = dense_idx
        # Dense listed twice → heavier weight than BM25 (less keyword drift).
        fused = _rrf([dense_idx, dense_idx, bm_idx], n=n, k=60)
        fused = fused + self._title_boost(question)
        # Final cut from fused pool
        cand = np.argpartition(-fused, min(pool_n, n) - 1)[:pool_n]
        cand = cand[np.argsort(-fused[cand])][: max(top_k * 3, top_k)]
        # Light rerank: keyword coverage on expected-like tokens from query
        q_terms = set(self._query_terms(question))
        rescored: list[tuple[float, int]] = []
        for rank, i in enumerate(cand):
            i = int(i)
            base = float(fused[i]) - rank * 0.001
            hay_toks = set(self._tokens[i])
            cover = len(q_terms & hay_toks) / max(len(q_terms), 1) if q_terms else 0.0
            base += 0.35 * cover
            if self._curated[i]:
                base += 0.08
            rescored.append((base, i))
        rescored.sort(key=lambda x: x[0], reverse=True)
        # Force exact-title curated FAQ into the shortlist when present.
        qn = (question or "").lower().strip()
        q_compact = re.sub(r"[^\w]+", "", qn, flags=re.UNICODE)
        forced: list[int] = []
        for i, title in enumerate(self._titles):
            if not title:
                continue
            if title == qn or self._title_norm[i] == q_compact:
                forced.append(i)
                if len(forced) >= top_k:
                    break
        seen = set()
        ordered: list[tuple[float, int]] = []
        for i in forced:
            ordered.append((10.0, i))
            seen.add(i)
        for score, i in rescored:
            if i in seen:
                continue
            ordered.append((score, i))
            seen.add(i)
            if len(ordered) >= top_k:
                break
        out = []
        for score, i in ordered[:top_k]:
            p = dict(self.passages[i])
            p["score"] = float(score)
            out.append(p)
        return out

    def format_context(self, hits: list[dict], max_chars: int = 4500) -> str:
        blocks = []
        size = 0
        for h in hits:
            block = f"[{h.get('title') or 'Fiche'}] {h['text']}\n[Source: {h.get('url')}]\n"
            if size + len(block) > max_chars:
                break
            blocks.append(block)
            size += len(block)
        return "\n".join(blocks)
