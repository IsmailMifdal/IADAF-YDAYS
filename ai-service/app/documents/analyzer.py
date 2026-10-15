"""Pre-check of one filed document: quality, then reading, then rules."""

import io
from dataclasses import dataclass, field
from datetime import date
from typing import Optional

from pypdf import PdfReader
from pypdf.errors import PdfReadError

from app.documents import ocr, quality, rules
from app.documents import text as doc_text
from app.documents.mrz import parse as parse_mrz
from app.documents.rules import Check, Status

# The overall status is the worst check's. "unknown" outranks "ok": a document
# whose content could not be checked must never come out as compliant.
_SEVERITY = {"error": 3, "warning": 2, "unknown": 1, "ok": 0}

# A PDF page with fewer characters than this is a scan, not a text document.
_MIN_TEXT_CHARS = 40


@dataclass(frozen=True)
class Analysis:
    category: str
    status: Status
    checks: list[Check] = field(default_factory=list)
    text_read: bool = False


def _overall(checks: list[Check]) -> Status:
    return max((c.status for c in checks), key=_SEVERITY.__getitem__, default="unknown")


def _pdf_text(content: bytes) -> Optional[str]:
    """Text layer of a PDF, or None if unreadable. Empty string for a scan."""
    try:
        reader = PdfReader(io.BytesIO(content))
        if reader.is_encrypted:
            return None
        return "\n".join((page.extract_text() or "") for page in reader.pages[:10])
    except (PdfReadError, ValueError, OSError, KeyError, TypeError):
        return None


async def analyze(content: bytes, content_type: str, document_type: str,
                  today: Optional[date] = None) -> Analysis:
    today = today or date.today()
    kind = rules.category(document_type)
    checks: list[Check] = []
    text: Optional[str] = None

    if content_type == "application/pdf":
        text = _pdf_text(content)
        if text is None:
            return Analysis(kind, "error", [Check("readable", "error",
                                                  "Fichier PDF illisible, protégé ou endommagé : déposez-en une autre copie.")])
        checks.append(Check("readable", "ok", "Fichier lisible."))
        if len(text.strip()) < _MIN_TEXT_CHARS:
            text = None  # a scan: only OCR can read it
    else:
        measured = quality.measure(content)
        if not measured.readable:
            return Analysis(kind, "error", [Check("readable", "error",
                                                  "Image illisible ou endommagée : déposez-en une autre.")])
        checks.append(Check("readable", "ok", "Fichier lisible."))
        if measured.too_small:
            checks.append(Check("resolution", "warning",
                                "Image de faible résolution : le texte risque d'être illisible pour l'administration."))
        if measured.blurred:
            checks.append(Check("sharpness", "warning", "Image floue : reprenez la photo, appareil immobile."))
        if measured.too_dark:
            checks.append(Check("lighting", "warning", "Image trop sombre : reprenez la photo à la lumière du jour."))
        elif measured.overexposed:
            checks.append(Check("lighting", "warning", "Image surexposée ou avec reflet : évitez le flash."))
        if len(checks) == 1:
            checks.append(Check("quality", "ok", "Netteté, lumière et résolution correctes."))

    if text is None:
        text = await ocr.extract_text(content, content_type)

    if text is None:
        checks.append(Check("content", "unknown",
                            "Contenu non lu automatiquement (document scanné ou photo) : "
                            "seule la qualité a été vérifiée."))
        return Analysis(kind, _overall(checks), checks, text_read=False)

    dates = doc_text.find_dates(text)
    if kind == "identity":
        checks += rules.identity_checks(parse_mrz(text), dates, today)
    elif kind == "address":
        checks += rules.address_checks(dates, today)
    elif kind == "bank":
        checks += rules.bank_checks(text)

    return Analysis(kind, _overall(checks), checks, text_read=True)
