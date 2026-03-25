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

_SYSTEM_PROMPT_TEMPLATE = """\
Tu es un assistant administratif intelligent pour IA-DAF.
Tu aides les personnes non-francophones en France à réussir leurs démarches administratives.
Réponds de façon claire, simple et structurée (utilise des étapes numérotées quand c'est utile).
Si tu n'es pas sûr, oriente vers service-public.fr.

Contexte :
{context}

Question : {question}

Réponse :\
"""


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
        from langchain.schema import Document  # type: ignore

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
        from langchain.schema import Document  # type: ignore

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
            lang_instruction = {
                "EN": "Please respond in English.",
                "AR": "يرجى الرد باللغة العربية.",
                "ES": "Por favor responde en español.",
            }.get(language.upper(), "")

            prompt = _SYSTEM_PROMPT_TEMPLATE.format(context=context, question=question)
            if lang_instruction:
                prompt = f"{lang_instruction}\n\n{prompt}"

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
