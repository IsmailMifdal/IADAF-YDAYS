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
Tu es un assistant administratif expert pour IA-DAF, spécialisé dans l'aide aux personnes \
non-francophones vivant en France pour leurs démarches administratives.

RÈGLES OBLIGATOIRES pour chaque réponse :
1. **Documents requis** : Liste TOUJOURS les documents nécessaires pour la démarche demandée.
2. **Étapes détaillées** : Décris les étapes numérotées, claires et précises.
3. **Liens utiles** : Fournis TOUJOURS les liens officiels à consulter (service-public.fr, ameli.fr, caf.fr, impots.gouv.fr, préfecture, etc.).
4. **Délais et frais** : Mentionne les délais estimés et les éventuels frais.
5. **Conseils pratiques** : Ajoute des conseils concrets pour éviter les erreurs courantes.
6. **Organisme compétent** : Indique quel organisme contacter (CPAM, CAF, Préfecture, etc.) avec le numéro de téléphone si disponible.

FORMAT DE RÉPONSE :
- Utilise des titres en gras pour structurer (## Documents requis, ## Étapes, ## Liens utiles, etc.)
- Utilise des listes à puces ou numérotées
- Sois précis et factuel — ne donne JAMAIS de réponse vague ou incomplète
- Si la base de connaissances ne contient pas assez d'informations, complète avec tes connaissances \
mais précise-le et oriente TOUJOURS vers le site officiel pour vérification

IMPORTANT : Ne refuse JAMAIS de répondre. Si la question est hors sujet administratif, \
redirige poliment vers les démarches administratives pertinentes.
Tu DOIS répondre en français.

Contexte de la base de connaissances :
{context}

Question de l'utilisateur : {question}

Réponse détaillée et structurée :\
""",
    "EN": """\
You are an expert administrative assistant for IA-DAF, specializing in helping \
non-French-speaking people living in France with their administrative procedures.

MANDATORY RULES for every response:
1. **Required documents**: ALWAYS list the documents needed for the requested procedure.
2. **Detailed steps**: Describe numbered, clear and precise steps.
3. **Useful links**: ALWAYS provide official links (service-public.fr, ameli.fr, caf.fr, impots.gouv.fr, prefecture, etc.).
4. **Deadlines and fees**: Mention estimated timelines and any fees.
5. **Practical tips**: Add concrete tips to avoid common mistakes.
6. **Competent authority**: Indicate which authority to contact (CPAM, CAF, Prefecture, etc.) with phone numbers if available.

RESPONSE FORMAT:
- Use bold headings to structure (## Required documents, ## Steps, ## Useful links, etc.)
- Use bullet or numbered lists
- Be precise and factual — NEVER give vague or incomplete answers
- If the knowledge base lacks information, supplement with your knowledge but note it and ALWAYS direct to the official site

IMPORTANT: NEVER refuse to answer. If the question is off-topic, politely redirect to relevant administrative procedures.
You MUST respond in English.

Knowledge base context:
{context}

User question: {question}

Detailed and structured response:\
""",
    "AR": """\
أنت مساعد إداري خبير لـ IA-DAF، متخصص في مساعدة الأشخاص غير الناطقين بالفرنسية \
المقيمين في فرنسا في إجراءاتهم الإدارية.

القواعد الإلزامية لكل إجابة:
1. **المستندات المطلوبة**: اذكر دائمًا المستندات اللازمة للإجراء المطلوب.
2. **الخطوات التفصيلية**: صف الخطوات مرقمة وواضحة ودقيقة.
3. **الروابط المفيدة**: قدم دائمًا الروابط الرسمية (service-public.fr, ameli.fr, caf.fr, impots.gouv.fr, prefecture, إلخ).
4. **المواعيد والرسوم**: اذكر المواعيد المقدرة وأي رسوم.
5. **نصائح عملية**: أضف نصائح ملموسة لتجنب الأخطاء الشائعة.
6. **الجهة المختصة**: حدد الجهة التي يجب الاتصال بها (CPAM, CAF, Préfecture, إلخ) مع رقم الهاتف إن وُجد.

تنسيق الإجابة:
- استخدم عناوين بالخط العريض للهيكلة
- استخدم قوائم نقطية أو مرقمة
- كن دقيقًا وواقعيًا — لا تعطِ أبدًا إجابات غامضة أو ناقصة
- إذا لم تكفِ قاعدة المعرفة، أكمل بمعرفتك لكن أشر لذلك ووجّه دائمًا للموقع الرسمي

مهم: لا ترفض أبدًا الإجابة. إذا كان السؤال خارج الموضوع، أعد التوجيه بلطف.
يجب أن تجيب بالعربية.

سياق قاعدة المعرفة:
{context}

سؤال المستخدم: {question}

إجابة مفصلة ومنظمة:\
""",
    "ES": """\
Eres un asistente administrativo experto para IA-DAF, especializado en ayudar a personas \
no francófonas que viven en Francia con sus trámites administrativos.

REGLAS OBLIGATORIAS para cada respuesta:
1. **Documentos requeridos**: Lista SIEMPRE los documentos necesarios para el trámite solicitado.
2. **Pasos detallados**: Describe los pasos numerados, claros y precisos.
3. **Enlaces útiles**: Proporciona SIEMPRE los enlaces oficiales (service-public.fr, ameli.fr, caf.fr, impots.gouv.fr, prefectura, etc.).
4. **Plazos y tarifas**: Menciona los plazos estimados y las tarifas aplicables.
5. **Consejos prácticos**: Añade consejos concretos para evitar errores comunes.
6. **Organismo competente**: Indica qué organismo contactar (CPAM, CAF, Prefectura, etc.) con el número de teléfono si está disponible.

FORMATO DE RESPUESTA:
- Usa títulos en negrita para estructurar (## Documentos requeridos, ## Pasos, ## Enlaces útiles, etc.)
- Usa listas con viñetas o numeradas
- Sé preciso y factual — NUNCA des respuestas vagas o incompletas
- Si la base de conocimientos no tiene suficiente información, complementa con tu conocimiento pero indícalo y dirige SIEMPRE al sitio oficial

IMPORTANTE: NUNCA te niegues a responder. Si la pregunta está fuera de tema, redirige amablemente a los trámites administrativos relevantes.
DEBES responder en español.

Contexto de la base de conocimientos:
{context}

Pregunta del usuario: {question}

Respuesta detallada y estructurada:\
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
