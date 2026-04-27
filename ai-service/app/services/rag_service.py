"""RAG (Retrieval-Augmented Generation) service.

Loads the administrative knowledge base from JSON files, vectorises it
with multilingual sentence-transformers, stores vectors in ChromaDB, and
provides a ``query`` method that combines retrieval + LLM generation.
"""

import json
import os
from pathlib import Path
from typing import Any, Dict, List

from loguru import logger

from app.core.config import settings
from app.services.llm_service import llm_service

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

_DATA_DIR = Path(__file__).parent.parent / "data" / "knowledge_base"
_VECTORSTORE_DIR = Path(settings.chroma_persist_dir)

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


class RAGService:
    """Pipeline RAG using LangChain + ChromaDB."""

    def __init__(self) -> None:
        self._vectorstore = None
        self._retriever = None
        self._embeddings = None

    # ------------------------------------------------------------------
    # Initialisation
    # ------------------------------------------------------------------

    def initialise(self) -> None:
        """Initialise embeddings, vector store and retriever.

        Indexes the knowledge base when the vector store is empty.
        """
        try:
            self._setup_embeddings()
            self._setup_vectorstore()
            logger.info("RAG service initialised successfully.")
        except Exception as exc:  # noqa: BLE001
            logger.error(f"RAG service initialisation failed: {exc}")

    def _setup_embeddings(self) -> None:
        """Load multilingual sentence-transformer embeddings."""
        from langchain_community.embeddings import HuggingFaceEmbeddings  # type: ignore

        self._embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True},
        )
        logger.info("Embeddings model loaded.")

    def _setup_vectorstore(self) -> None:
        """Load or create the ChromaDB vector store."""
        from langchain_community.vectorstores import Chroma  # type: ignore

        _VECTORSTORE_DIR.mkdir(parents=True, exist_ok=True)

        self._vectorstore = Chroma(
            persist_directory=str(_VECTORSTORE_DIR),
            embedding_function=self._embeddings,
            collection_name="iadaf_knowledge",
        )

        # Index data if the collection is empty (use a lightweight peek query)
        try:
            sample = self._vectorstore.similarity_search("test", k=1)
            is_empty = len(sample) == 0
        except Exception:  # noqa: BLE001
            is_empty = True

        if is_empty:
            logger.info("Vector store is empty — indexing knowledge base…")
            self._index_knowledge_base()

        self._retriever = self._vectorstore.as_retriever(
            search_type="similarity",
            search_kwargs={"k": 5},
        )
        doc_count = len(self._vectorstore.get()["ids"]) if self._vectorstore else 0
        logger.info(f"Vector store ready — {doc_count} documents indexed.")

    def _index_knowledge_base(self) -> None:
        """Load JSON files from the knowledge base and index them."""
        from langchain_core.documents import Document  # type: ignore

        documents: List[Document] = []

        for json_file in _DATA_DIR.glob("*.json"):
            try:
                data: Any = json.loads(json_file.read_text(encoding="utf-8"))
                docs = self._json_to_documents(data, source=json_file.name)
                documents.extend(docs)
                logger.info(f"Loaded {len(docs)} chunks from {json_file.name}")
            except Exception as exc:  # noqa: BLE001
                logger.warning(f"Failed to load {json_file}: {exc}")

        if documents:
            self._vectorstore.add_documents(documents)
            logger.info(f"Indexed {len(documents)} documents in total.")
        else:
            logger.warning("No documents found in knowledge base.")

    @staticmethod
    def _json_to_documents(data: Any, source: str) -> "List[Any]":
        """Convert a JSON knowledge-base entry into LangChain Documents."""
        from langchain_core.documents import Document  # type: ignore

        documents: List[Document] = []

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

            page_content = "\n".join(content_parts)
            if page_content.strip():
                documents.append(
                    Document(
                        page_content=page_content,
                        metadata={"source": source, "title": title},
                    )
                )

        return documents

    # ------------------------------------------------------------------
    # Public query interface
    # ------------------------------------------------------------------

    def query(self, question: str, language: str = "FR") -> Dict[str, Any]:
        """Answer *question* using the RAG pipeline.

        Args:
            question: The user's question.
            language: Desired response language (FR, EN, AR, ES).

        Returns:
            dict with keys ``answer`` (str) and ``sources`` (list of str).
        """
        if self._retriever is None or not llm_service.is_available:
            answer = llm_service.generate(question)
            return {"answer": answer, "sources": []}

        try:
            # Retrieve relevant context
            docs = self._retriever.invoke(question)
            context = "\n\n---\n\n".join(doc.page_content for doc in docs)
            sources = list(
                {doc.metadata.get("source", "") for doc in docs if doc.metadata.get("source")}
            )

            # Build prompt
            template = _SYSTEM_PROMPT_TEMPLATE.get(
                language.upper(), _SYSTEM_PROMPT_TEMPLATE["FR"]
            )
            prompt = template.format(context=context, question=question)

            answer = llm_service.generate(prompt)
            return {"answer": answer, "sources": sources}

        except Exception as exc:  # noqa: BLE001
            logger.error(f"RAG query error: {exc}")
            return {
                "answer": (
                    "⚠️  Impossible de traiter votre demande pour le moment. "
                    "Consultez service-public.fr pour obtenir de l'aide."
                ),
                "sources": [],
            }

    @property
    def is_ready(self) -> bool:
        """Return True when the vector store is available."""
        return self._vectorstore is not None


# Module-level singleton
rag_service = RAGService()
