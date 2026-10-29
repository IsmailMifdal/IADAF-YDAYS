"""RAG (Retrieval-Augmented Generation) service.

Loads the administrative knowledge base from JSON files, vectorises it
with multilingual sentence-transformers, stores vectors in ChromaDB, and
provides a ``query`` method that combines retrieval + LLM generation.
"""

import asyncio
import hashlib
import json
from pathlib import Path
from typing import Any, Dict, List, NamedTuple, Tuple

from loguru import logger

from app.core.config import settings
from app.services.llm_service import llm_service

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

_DATA_DIR = Path(__file__).parent.parent / "data" / "knowledge_base"
_VECTORSTORE_DIR = Path(settings.chroma_persist_dir)
_EMBEDDING_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
_COLLECTION = "iadaf_knowledge"
# Part of the fingerprint: changing how the index is built (LangChain → direct
# ChromaDB) must rebuild it, even with the same files and model.
_INDEX_FORMAT = "chromadb-direct-1"
_TOP_K = 5
# Below ChromaDB's maximum batch size.
_BATCH = 500
# Fingerprint of what the persisted index was built from (knowledge base files
# and embedding model). The vector store lives in a volume that outlives the
# image: without this, a release that edits the knowledge base would keep
# answering from the previous version.
_FINGERPRINT_FILE = "knowledge-base.sha256"

RETRIEVAL_ERROR_MESSAGE = (
    "⚠️  Impossible de traiter votre demande pour le moment. "
    "Consultez service-public.fr pour obtenir de l'aide."
)


def knowledge_base_fingerprint(data_dir: Path, model_name: str) -> str:
    """SHA-256 of the embedding model name and every knowledge-base file."""
    digest = hashlib.sha256(model_name.encode())
    for path in sorted(data_dir.glob("*.json")):
        digest.update(b"\0" + path.name.encode() + b"\0")
        digest.update(path.read_bytes())
    return digest.hexdigest()

# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT_TEMPLATE = {
    "FR": """\
Tu es l'assistant IADAF pour les démarches administratives françaises (Public + parcours guidés).

RÈGLES OBLIGATOIRES :
1. Appuie-toi STRICTEMENT sur le contexte officiel fourni. Cite [Source: URL] quand tu t'en sers.
2. N'invente JAMAIS montants (timbres), numéros CERFA, délais précis ni définitions d'acronymes hors contexte.
3. Si l'info manque dans le contexte, dis-le clairement et renvoie vers service-public.fr / l'organisme compétent.
4. Si un « ÉTAT DU DOSSIER » est fourni, utilise-le comme source de vérité pour les pièces (ne pas inventer d'autres listes).
5. Refuse poliment le hors-périmètre illégal / dangereux ; recentre sur l'administratif.
6. Structure : documents / étapes / liens utiles quand c'est pertinent. Réponds en français.

Contexte officiel :
{context}

Question :
{question}

Réponse factuelle et structurée :\
""",
    "EN": """\
You are the IADAF assistant for French administrative procedures.

MANDATORY RULES:
1. Rely STRICTLY on the official context below. Cite [Source: URL] when you use it.
2. NEVER invent fees, CERFA numbers, exact deadlines, or acronym definitions not in context.
3. If information is missing, say so and point to service-public.fr / the competent authority.
4. If a DOSSIER STATE block is present, treat it as ground truth for required documents.
5. Politely refuse illegal / dangerous off-scope requests; refocus on admin help.
6. Respond in English, structured and factual.

Official context:
{context}

Question:
{question}

Factual structured answer:\
""",
    "AR": """\
أنت مساعد IADAF للإجراءات الإدارية الفرنسية.

قواعد إلزامية:
1. اعتمد بدقة على السياق الرسمي أدناه واذكر [Source: URL] عند الاستخدام.
2. لا تخترع أبدًا مبالغًا أو أرقام CERFA أو مواعيد دقيقة خارج السياق.
3. إذا نقصت المعلومة، صرّح بذلك وأحل إلى service-public.fr أو الجهة المختصة.
4. إن وُجدت حالة ملف (ÉTAT DU DOSSIER) فاعتبارها مرجع الوثائق المطلوبة.
5. ارفض بلطف الطلبات غير القانونية/الخطرة. أجب بالعربية.

السياق الرسمي:
{context}

السؤال:
{question}

إجابة واقعية ومنظمة:\
""",
    "ES": """\
Eres el asistente IADAF para trámites administrativos franceses.

REGLAS OBLIGATORIAS:
1. Apóyate ESTRICTAMENTE en el contexto oficial. Cita [Source: URL] cuando lo uses.
2. NUNCA inventes importes, números CERFA ni plazos exactos fuera del contexto.
3. Si falta información, dilo y remite a service-public.fr / el organismo competente.
4. Si hay un bloque ÉTAT DU DOSSIER, úsalo como verdad para las piezas.
5. Rechaza con cortesía lo ilegal/peligroso. Responde en español.

Contexto oficial:
{context}

Pregunta:
{question}

Respuesta factual y estructurada:\
""",
}


class Passage(NamedTuple):
    """One indexed piece of the knowledge base."""

    text: str
    source: str
    title: str


class RAGService:
    """Retrieval over the knowledge base: sentence-transformers embeddings in
    ChromaDB, used directly (no LangChain in between)."""

    def __init__(self) -> None:
        self._embedder = None
        self._collection = None

    # ------------------------------------------------------------------
    # Initialisation
    # ------------------------------------------------------------------

    def initialise(self) -> None:
        """Load the embedding model and the vector store.

        Indexes the knowledge base when the vector store is empty, and
        rebuilds the index when the knowledge base or the model has changed.
        """
        try:
            self._setup_embeddings()
            self._setup_vectorstore()
            logger.info("RAG service initialised successfully.")
        except Exception as exc:  # noqa: BLE001
            logger.error(f"RAG service initialisation failed: {exc}")

    def _setup_embeddings(self) -> None:
        """Load multilingual sentence-transformer embeddings."""
        from sentence_transformers import SentenceTransformer  # type: ignore

        self._embedder = SentenceTransformer(_EMBEDDING_MODEL, device="cpu")
        logger.info("Embeddings model loaded.")

    def _embed(self, texts: List[str]) -> List[List[float]]:
        # Normalised: the vector store's default (L2) distance then ranks
        # exactly as cosine similarity would.
        return self._embedder.encode(texts, normalize_embeddings=True).tolist()

    def _setup_vectorstore(self) -> None:
        """Load or create the ChromaDB collection, (re)indexing if needed."""
        import chromadb  # type: ignore

        _VECTORSTORE_DIR.mkdir(parents=True, exist_ok=True)
        client = chromadb.PersistentClient(
            path=str(_VECTORSTORE_DIR),
            # Chroma reports usage to a third party by default: nothing of
            # ours leaves the server.
            settings=chromadb.Settings(anonymized_telemetry=False),
        )
        # Embeddings are always computed here: no embedding function inside
        # Chroma, which would download a model of its own.
        self._collection = client.get_or_create_collection(_COLLECTION, embedding_function=None)

        fingerprint_file = _VECTORSTORE_DIR / _FINGERPRINT_FILE
        current = knowledge_base_fingerprint(_DATA_DIR, f"{_EMBEDDING_MODEL}|{_INDEX_FORMAT}")
        indexed = fingerprint_file.read_text().strip() if fingerprint_file.exists() else None
        is_empty = self._collection.count() == 0

        if is_empty or indexed != current:
            if is_empty:
                logger.info("Vector store is empty — indexing knowledge base…")
            else:
                logger.info("Knowledge base changed since last indexing — rebuilding the index…")
                stale = self._collection.get(include=[])["ids"]
                for start in range(0, len(stale), _BATCH):
                    self._collection.delete(ids=stale[start:start + _BATCH])
            self._index_knowledge_base()
            fingerprint_file.write_text(current)

        logger.info(f"Vector store ready — {self._collection.count()} documents indexed.")

    def _index_knowledge_base(self) -> None:
        """Load JSON files from the knowledge base and index them."""
        passages: List[Passage] = []
        for json_file in sorted(_DATA_DIR.glob("*.json")):
            try:
                data: Any = json.loads(json_file.read_text(encoding="utf-8"))
                found = self._json_to_passages(data, source=json_file.name)
                passages.extend(found)
                logger.info(f"Loaded {len(found)} chunks from {json_file.name}")
            except Exception as exc:  # noqa: BLE001
                logger.warning(f"Failed to load {json_file}: {exc}")

        if not passages:
            logger.warning("No documents found in knowledge base.")
            return
        for start in range(0, len(passages), _BATCH):
            batch = passages[start:start + _BATCH]
            self._collection.add(
                ids=[f"kb-{start + offset}" for offset in range(len(batch))],
                documents=[passage.text for passage in batch],
                metadatas=[{"source": passage.source, "title": passage.title} for passage in batch],
                embeddings=self._embed([passage.text for passage in batch]),
            )
        logger.info(f"Indexed {len(passages)} documents in total.")

    @staticmethod
    def _json_to_passages(data: Any, source: str) -> List[Passage]:
        """Convert a JSON knowledge-base entry into passages to index."""
        passages: List[Passage] = []
        items: List[Any] = data if isinstance(data, list) else [data]

        for item in items:
            if not isinstance(item, dict):
                continue

            title = item.get("title", item.get("question", ""))
            content_parts = [title] if title else []

            for key, value in item.items():
                if key in ("title", "id"):
                    continue
                if isinstance(value, str):
                    content_parts.append(f"{key}: {value}")
                elif isinstance(value, list):
                    content_parts.append(f"{key}: {', '.join(str(v) for v in value)}")

            text = "\n".join(content_parts)
            if text.strip():
                passages.append(Passage(text=text, source=source, title=title))

        return passages

    def _retrieve(self, question: str) -> List[Passage]:
        result = self._collection.query(
            query_embeddings=self._embed([question]),
            n_results=_TOP_K,
            include=["documents", "metadatas"],
        )
        return [
            Passage(text=text, source=meta.get("source", ""), title=meta.get("title", ""))
            for text, meta in zip(result["documents"][0], result["metadatas"][0])
        ]

    # ------------------------------------------------------------------
    # Public query interface
    # ------------------------------------------------------------------

    async def prepare(self, question: str, language: str = "FR") -> Tuple[str, List[str]]:
        """Prompt for *question*, with the retrieved context, and its sources.

        Without a vector store, the bare question (no context, no sources).
        """
        if self._collection is None or self._embedder is None:
            return question, []

        # Embedding the question is CPU-bound: off the event loop.
        passages = await asyncio.to_thread(self._retrieve, question)
        context = "\n\n---\n\n".join(passage.text for passage in passages)
        sources = list({passage.source for passage in passages if passage.source})
        template = _SYSTEM_PROMPT_TEMPLATE.get(language.upper(), _SYSTEM_PROMPT_TEMPLATE["FR"])
        return template.format(context=context, question=question), sources

    async def aquery(self, question: str, language: str = "FR") -> Dict[str, Any]:
        """Answer *question* using the RAG pipeline.

        Args:
            question: The user's question.
            language: Desired response language (FR, EN, AR, ES).

        Returns:
            dict with keys ``answer`` (str) and ``sources`` (list of str).
        """
        try:
            prompt, sources = await self.prepare(question, language)
        except Exception as exc:  # noqa: BLE001
            logger.error(f"RAG retrieval error: {exc}")
            return {"answer": RETRIEVAL_ERROR_MESSAGE, "sources": []}

        return {"answer": await llm_service.agenerate(prompt), "sources": sources}

    @property
    def is_ready(self) -> bool:
        """Return True when the vector store is available."""
        return self._collection is not None


# Module-level singleton
rag_service = RAGService()
