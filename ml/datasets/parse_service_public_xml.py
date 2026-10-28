#!/usr/bin/env python3
"""Parse DILA Service-Public particuliers XML zip → JSONL (fiches + formulaires CERFA).

Source: https://lecomarquage.service-public.gouv.fr/vdd/3.5/part/zip/vosdroits-latest.zip
Licence Ouverte — paternité : Service-Public.gouv.fr / DILA.
"""

from __future__ import annotations

import argparse
import json
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "datasets" / "raw" / "service_public_dila"

# Domaines IADAF prioritaires (dc:subject)
IADAF_SUBJECTS = {
    "Étranger - Europe",
    "Papiers - Citoyenneté - Élections",
    "Social - Santé",
    "Logement",
    "Argent - Impôts - Consommation",
    "Famille - Scolarité",
    "Travail - Formation",
}

IADAF_KW = re.compile(
    r"séjour|visa|étranger|etranger|ofii|asile|préfecture|prefecture|"
    r"titre de séjour|vls-?ts|anef|cpam|ameli|caf|apl|impôts|impots|"
    r"passeport|carte vitale|naturalisation|regroupement|récépissé|recepisse|"
    r"justificatif de domicile|cerfa",
    re.I,
)

NS = {"dc": "http://purl.org/dc/elements/1.1/"}


def _text(el: ET.Element | None) -> str:
    if el is None:
        return ""
    return " ".join("".join(el.itertext()).split())


def _dc(root: ET.Element, tag: str) -> str:
    return _text(root.find(f"dc:{tag}", NS))


def _strip_xml_text(root: ET.Element) -> str:
    """Flatten useful textual blocks without dumping navigation chrome."""
    parts: list[str] = []
    for tag in (
        "Introduction",
        "Texte",
        "Chapitre",
        "Paragraphe",
        "ANoter",
        "Attention",
        "ASavoir",
        "Liste",
        "Item",
        "Question",
        "Reponse",
        "Complement",
    ):
        for node in root.iter(tag):
            t = _text(node)
            if t and len(t) > 20:
                parts.append(t)
    # Deduplicate while preserving order
    seen: set[str] = set()
    out: list[str] = []
    for p in parts:
        key = p[:120]
        if key in seen:
            continue
        seen.add(key)
        out.append(p)
    return "\n\n".join(out)


def _relevant(subject: str, title: str, description: str, body: str) -> bool:
    blob = f"{subject} {title} {description} {body[:800]}"
    if any(s in subject for s in IADAF_SUBJECTS):
        return True
    return bool(IADAF_KW.search(blob))


def parse_zip(zip_path: Path, max_fiches: int | None = None) -> tuple[list[dict], list[dict]]:
    fiches: list[dict] = []
    formulaires: list[dict] = []
    with zipfile.ZipFile(zip_path) as zf:
        for name in zf.namelist():
            if not name.endswith(".xml"):
                continue
            try:
                root = ET.fromstring(zf.read(name))
            except ET.ParseError:
                continue

            pub_id = root.attrib.get("ID") or Path(name).stem
            pub_type = root.attrib.get("type") or root.tag
            sp_url = root.attrib.get("spUrl") or ""
            title = _dc(root, "title")
            subject = _dc(root, "subject")
            description = _dc(root, "description")
            modified = _dc(root, "date")
            body = _strip_xml_text(root)

            cerfa_el = root.find("NumeroCerfa")
            cerfa = _text(cerfa_el) if cerfa_el is not None else ""

            is_form = (
                pub_type.lower().startswith("formulaire")
                or bool(cerfa)
                or name.upper().startswith("R")
                and "Formulaire" in pub_type
            )

            if not _relevant(subject, title, description, body):
                continue

            row = {
                "id": pub_id,
                "type": pub_type,
                "title": title,
                "subject": subject,
                "description": description,
                "text": body[:8000],
                "url": sp_url
                or f"https://www.service-public.gouv.fr/particuliers/vosdroits/{pub_id}",
                "modified": modified,
                "cerfa": cerfa or None,
                "source_file": name,
                "attribution": "Service-Public.gouv.fr / DILA",
            }

            if is_form or cerfa:
                formulaires.append(row)
            else:
                fiches.append(row)
                if max_fiches is not None and len(fiches) >= max_fiches:
                    break

    return fiches, formulaires


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--zip",
        type=Path,
        default=RAW / "vosdroits-latest.zip",
        help="Chemin vers vosdroits-latest.zip",
    )
    parser.add_argument("--max-fiches", type=int, default=None)
    args = parser.parse_args()
    if not args.zip.is_file():
        print(f"ZIP introuvable: {args.zip}")
        return 1

    fiches, formulaires = parse_zip(args.zip, max_fiches=args.max_fiches)
    RAW.mkdir(parents=True, exist_ok=True)
    out_f = RAW / "fiches_iadaf.jsonl"
    out_r = RAW / "formulaires_cerfa.jsonl"
    with out_f.open("w", encoding="utf-8") as f:
        for row in fiches:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
    with out_r.open("w", encoding="utf-8") as f:
        for row in formulaires:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
    print(f"OK  fiches IADAF → {out_f} ({len(fiches)})")
    print(f"OK  formulaires/CERFA → {out_r} ({len(formulaires)})")
    print(
        "Attribution requise: Service-Public.gouv.fr / DILA — "
        f"fichier {args.zip.name}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
