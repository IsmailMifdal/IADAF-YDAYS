"""Rebuild the knowledge-base index by hand.

    python scripts/ingest_data.py

Rarely needed: the service reindexes by itself at startup when the
knowledge base or the embedding model has changed. This forces it — by
forgetting the fingerprint of the last indexing — through the very same code
the service runs, so the two can never disagree.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services import rag_service as rag  # noqa: E402

(rag._VECTORSTORE_DIR / rag._FINGERPRINT_FILE).unlink(missing_ok=True)
rag.rag_service.initialise()
