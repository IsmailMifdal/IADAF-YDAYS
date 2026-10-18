"""Text of scanned documents and photos, through an OCR provider.

Off unless configured: OCR sends the image of an identity document to a
third party, which needs a signed processing agreement (DPA), an EU-hosted
provider and the AIPD (see docs/rgpd). Without it, images are still checked
for quality, and PDFs with a text layer are still read.
"""

import base64
from typing import Optional

import httpx
from loguru import logger

from app.core.config import settings


def is_enabled() -> bool:
    return settings.ocr_provider == "mistral" and bool(settings.ocr_api_key)


async def extract_text(content: bytes, content_type: str) -> Optional[str]:
    """Plain text of the document, or None when OCR is off or fails."""
    if not is_enabled():
        return None

    data_url = f"data:{content_type};base64,{base64.b64encode(content).decode()}"
    document = (
        {"type": "document_url", "document_url": data_url}
        if content_type == "application/pdf"
        else {"type": "image_url", "image_url": data_url}
    )
    try:
        async with httpx.AsyncClient(timeout=settings.ocr_timeout_seconds) as client:
            response = await client.post(
                settings.ocr_api_url,
                headers={"Authorization": f"Bearer {settings.ocr_api_key}"},
                json={"model": settings.ocr_model, "document": document},
            )
            response.raise_for_status()
            pages = response.json().get("pages", [])
            return "\n".join(page.get("markdown", "") for page in pages)
    except (httpx.HTTPError, ValueError) as exc:
        # Never log the response body: it holds the document's content.
        logger.warning(f"OCR failed ({type(exc).__name__}); falling back to quality checks only.")
        return None
