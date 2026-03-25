"""Script to ingest the knowledge base JSON files into ChromaDB.

Run this script once to pre-populate the vector store:

    python scripts/ingest_data.py

The script is idempotent: it clears the existing collection and re-indexes.
"""

import json
import sys
from pathlib import Path

# Allow imports from the project root
sys.path.insert(0, str(Path(__file__).parent.parent))

from loguru import logger

from app.core.config import settings

DATA_DIR = Path(__file__).parent.parent / "app" / "data" / "knowledge_base"
VECTORSTORE_DIR = Path(settings.chroma_persist_dir)


def load_documents() -> list:
    """Load all JSON files from the knowledge base directory."""
    from langchain.schema import Document  # type: ignore

    documents = []
    for json_file in DATA_DIR.glob("*.json"):
        try:
            data = json.loads(json_file.read_text(encoding="utf-8"))
            items = data if isinstance(data, list) else [data]
            for item in items:
                if not isinstance(item, dict):
                    continue
                content_parts = []
                title = item.get("title", item.get("question", ""))
                if title:
                    content_parts.append(title)
                for key, value in item.items():
                    if key in ("id", "title"):
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
                            metadata={"source": json_file.name, "title": title},
                        )
                    )
            logger.info(f"Loaded {len(items)} entries from {json_file.name}")
        except Exception as exc:  # noqa: BLE001
            logger.error(f"Failed to load {json_file}: {exc}")

    return documents


def ingest() -> None:
    """Ingest all knowledge base documents into ChromaDB."""
    logger.info("Starting ingestion…")

    from langchain_community.embeddings import HuggingFaceEmbeddings  # type: ignore
    from langchain_community.vectorstores import Chroma  # type: ignore

    VECTORSTORE_DIR.mkdir(parents=True, exist_ok=True)

    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True},
    )

    documents = load_documents()
    if not documents:
        logger.warning("No documents to ingest.")
        return

    # Clear and recreate the collection
    vectorstore = Chroma(
        persist_directory=str(VECTORSTORE_DIR),
        embedding_function=embeddings,
        collection_name="iadaf_knowledge",
    )
    # Clear existing data
    try:
        vectorstore._client.delete_collection("iadaf_knowledge")
        logger.info("Existing collection cleared.")
    except Exception:  # noqa: BLE001
        pass

    # Re-create and add documents
    vectorstore = Chroma(
        persist_directory=str(VECTORSTORE_DIR),
        embedding_function=embeddings,
        collection_name="iadaf_knowledge",
    )
    vectorstore.add_documents(documents)
    logger.info(f"✅ Indexed {len(documents)} documents into ChromaDB.")


if __name__ == "__main__":
    ingest()
