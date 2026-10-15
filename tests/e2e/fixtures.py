"""Test files for the end-to-end suite — standard library only.

    python tests/e2e/fixtures.py <directory>

Writes real PDFs with a text layer (readable by the pre-check without OCR)
and a fake PDF that is actually an executable.
"""

import io
import sys
from datetime import date, timedelta
from pathlib import Path


def pdf_with_text(*lines: str) -> bytes:
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


def main(directory: str) -> None:
    target = Path(directory)
    target.mkdir(parents=True, exist_ok=True)
    (target / "passeport.pdf").write_bytes(pdf_with_text("Passeport", "Specimen"))
    (target / "titre-expire.pdf").write_bytes(
        pdf_with_text("REPUBLIQUE FRANCAISE", "Titre de sejour", "Date d expiration : 01/02/2020"))
    # Dated relative to today, so the "recent" proof of address stays recent.
    issued = (date.today() - timedelta(days=10)).strftime("%d/%m/%Y")
    (target / "facture.pdf").write_bytes(
        pdf_with_text("EDF - Facture", f"Facture emise le {issued}", "Montant : 54,20 EUR"))
    (target / "virus.pdf").write_bytes(b"MZ\x90\x00 not a pdf")


if __name__ == "__main__":
    main(sys.argv[1])
