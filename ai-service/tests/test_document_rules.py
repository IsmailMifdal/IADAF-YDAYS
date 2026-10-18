"""Rules, text extraction and the full pre-check on generated files."""

import asyncio
import io
from datetime import date

import numpy as np
from PIL import Image

from app.documents import analyzer, rules
from app.documents import text as doc_text
from app.documents.mrz import MrzResult

TODAY = date(2026, 10, 15)


# ---------------------------------------------------------------------------
# Helpers: real files, generated
# ---------------------------------------------------------------------------


def pdf_with_text(*lines: str) -> bytes:
    """Minimal valid PDF whose text layer holds ``lines``."""
    stream = "BT /F1 11 Tf 50 780 Td 14 TL " + " ".join(
        "(" + line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)") + ") '" for line in lines
    ) + " ET"
    objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R "
        "/Resources << /Font << /F1 5 0 R >> >> >>",
        f"<< /Length {len(stream.encode('latin-1'))} >>\nstream\n{stream}\nendstream",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    ]
    out = io.BytesIO()
    out.write(b"%PDF-1.4\n")
    offsets = []
    for number, body in enumerate(objects, start=1):
        offsets.append(out.tell())
        out.write(f"{number} 0 obj\n{body}\nendobj\n".encode("latin-1"))
    xref = out.tell()
    out.write(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode())
    for offset in offsets:
        out.write(f"{offset:010d} 00000 n \n".encode())
    out.write(f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode())
    return out.getvalue()


def image(width=1200, height=800, kind="sharp") -> bytes:
    rng = np.random.default_rng(0)
    if kind == "sharp":
        pixels = rng.integers(40, 220, (height, width), dtype=np.uint8)
    elif kind == "flat":
        pixels = np.full((height, width), 128, dtype=np.uint8)
    else:  # dark
        pixels = rng.integers(0, 30, (height, width), dtype=np.uint8)
    buffer = io.BytesIO()
    Image.fromarray(pixels, "L").save(buffer, format="PNG")
    return buffer.getvalue()


def run(content, content_type, document_type):
    return asyncio.run(analyzer.analyze(content, content_type, document_type, today=TODAY))


def by_id(result):
    return {c.id: c.status for c in result.checks}


# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------


def test_categories_from_pack_labels():
    assert rules.category("Passeport") == "identity"
    assert rules.category("[Titre de séjour] Carte d'identité") == "identity"
    assert rules.category("Visa ou titre de séjour") == "identity"
    assert rules.category("Justificatif de domicile") == "address"
    assert rules.category("[Aides au logement] RIB") == "bank"
    assert rules.category("Attestation de loyer") == "other"
    assert rules.category("Contrat de location") == "other"


# ---------------------------------------------------------------------------
# Text extraction
# ---------------------------------------------------------------------------


def test_dates_numeric_and_written():
    found = doc_text.find_dates("Valable jusqu'au 12/04/2030. Émis le 1er mars 2026.")
    assert [d.value for d in found] == [date(2030, 4, 12), date(2026, 3, 1)]
    assert doc_text.labelled(found, doc_text.EXPIRY_WORDS) == [date(2030, 4, 12)]
    assert doc_text.labelled(found, doc_text.ISSUE_WORDS) == [date(2026, 3, 1)]


def test_impossible_dates_are_ignored():
    assert doc_text.find_dates("le 31/02/2026") == []


def test_iban_checksum():
    assert doc_text.iban_is_valid("FR76 3000 6000 0112 3456 7890 189")
    assert not doc_text.iban_is_valid("FR76 3000 6000 0112 3456 7890 188")


# ---------------------------------------------------------------------------
# Rules
# ---------------------------------------------------------------------------


def test_identity_expiry_from_mrz():
    def status(expiry):
        return {c.id: c.status for c in rules.identity_checks(MrzResult("TD3", "P", True, expiry), [], TODAY)}

    assert status(date(2026, 9, 1))["expiry"] == "error"
    assert status(date(2026, 12, 1))["expiry"] == "warning"
    assert status(date(2031, 1, 1))["expiry"] == "ok"


def test_identity_forged_mrz_is_flagged():
    checks = {c.id: c.status for c in rules.identity_checks(MrzResult("TD3", "P", False, date(2031, 1, 1)), [], TODAY)}
    assert checks["mrz"] == "warning"


def test_identity_without_any_date_is_unknown_never_ok():
    assert {c.id: c.status for c in rules.identity_checks(None, [], TODAY)} == {"expiry": "unknown"}


def test_address_proof_age():
    def status(text):
        return rules.address_checks(doc_text.find_dates(text), TODAY)[0].status

    assert status("Facture émise le 02/09/2026") == "ok"
    assert status("Facture émise le 10/05/2026") == "error"
    # A payment due date in the future is not the issue date.
    assert status("Émis le 02/09/2026 — à payer avant le 30/11/2026") == "ok"
    assert status("Facture sans date") == "unknown"


def test_bank():
    assert rules.bank_checks("IBAN : FR76 3000 6000 0112 3456 7890 189")[0].status == "ok"
    assert rules.bank_checks("IBAN : FR76 3000 6000 0112 3456 7890 188")[0].status == "error"
    assert rules.bank_checks("Relevé de compte")[0].status == "unknown"


# ---------------------------------------------------------------------------
# Full pre-check
# ---------------------------------------------------------------------------


def test_text_pdf_identity_expired():
    pdf = pdf_with_text("REPUBLIQUE FRANCAISE", "Titre de sejour", "Date d'expiration : 01/02/2026")
    result = run(pdf, "application/pdf", "Titre de séjour")
    assert result.text_read
    assert by_id(result)["expiry"] == "error"
    assert result.status == "error"


def test_text_pdf_recent_address_proof_is_ok():
    pdf = pdf_with_text("EDF - Facture", "Facture emise le 01/10/2026", "Montant : 54,20 EUR a payer")
    result = run(pdf, "application/pdf", "Justificatif de domicile")
    assert by_id(result) == {"readable": "ok", "recency": "ok"}
    assert result.status == "ok"


def test_scanned_pdf_without_ocr_is_unknown_not_ok():
    pdf = pdf_with_text("")  # no text layer
    result = run(pdf, "application/pdf", "Passeport")
    assert by_id(result)["content"] == "unknown"
    assert result.status == "unknown"


def test_corrupted_pdf_is_an_error():
    result = run(b"%PDF-1.4 garbage", "application/pdf", "Passeport")
    assert result.status == "error"


def test_sharp_photo_passes_quality_but_content_stays_unknown():
    result = run(image(), "image/png", "Passeport")
    assert by_id(result)["quality"] == "ok"
    assert result.status == "unknown"


def test_bad_photos_are_flagged():
    assert by_id(run(image(kind="flat"), "image/png", "RIB"))["sharpness"] == "warning"
    assert by_id(run(image(kind="dark"), "image/png", "RIB"))["lighting"] == "warning"
    assert by_id(run(image(300, 200), "image/png", "RIB"))["resolution"] == "warning"


def test_corrupted_image_is_an_error():
    assert run(b"\x89PNG\r\n\x1a\nbroken", "image/png", "RIB").status == "error"
