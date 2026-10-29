#!/usr/bin/env python3
"""Generate synthetic document images + JSONL for Qwen3-VL QLoRA (AIPD-safe).

No real user documents. PIL text canvases with quality variants (blur/dark).
Aligns labels with document-ia categories → IADAF identity|address|bank|other.
"""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_IMG = ROOT / "datasets" / "raw" / "vl_synth" / "images"
OUT_JSONL = ROOT / "datasets" / "processed" / "vl_train.jsonl"

DOCS = [
    {
        "id": "passeport",
        "label": "identity",
        "title": "PASSEPORT — RÉPUBLIQUE FRANÇAISE (SYNTH)",
        "lines": [
            "Type: P",
            "Nom: DUPONT",
            "Prénoms: JEAN MARIE",
            "Nationalité: FRA",
            "Né(e) le: 01/01/1990",
            "Expire le: 01/06/2028",
            "MRZ: P<FRADUPONT<<JEAN<MARIE<<<<<<<<<<<",
        ],
        "fields": {
            "doc_type": "passeport",
            "nom": "DUPONT",
            "prenoms": "JEAN MARIE",
            "date_expiration": "01/06/2028",
            "valid": True,
        },
    },
    {
        "id": "cni",
        "label": "identity",
        "title": "CARTE NATIONALE D'IDENTITÉ (SYNTH)",
        "lines": [
            "Nom: MARTIN",
            "Prénom: SOPHIE",
            "Date de naissance: 15/03/1990",
            "Expire le: 12/08/2030",
        ],
        "fields": {
            "doc_type": "cni",
            "nom": "MARTIN",
            "prenom": "SOPHIE",
            "date_expiration": "12/08/2030",
            "valid": True,
        },
    },
    {
        "id": "titre_sejour_expire",
        "label": "identity",
        "title": "TITRE DE SÉJOUR (SYNTH — EXPIRÉ)",
        "lines": [
            "Type: Salarié",
            "Nom: BENALI",
            "Valable jusqu'au: 01/01/2024",
            "N°: 1234567890",
        ],
        "fields": {
            "doc_type": "titre_sejour",
            "nom": "BENALI",
            "date_expiration": "01/01/2024",
            "valid": False,
            "issue": "expired",
        },
    },
    {
        "id": "quittance",
        "label": "address",
        "title": "QUITTANCE DE LOYER (SYNTH)",
        "lines": [
            "Période: Octobre 2026",
            "Locataire: A. BENALI",
            "Adresse: 5 avenue Victor Hugo, 69002 Lyon",
            "Montant: 780,00 EUR",
        ],
        "fields": {
            "doc_type": "quittance_loyer",
            "adresse": "5 avenue Victor Hugo, 69002 Lyon",
            "periode": "2026-10",
            "valid": True,
        },
    },
    {
        "id": "facture_energie",
        "label": "address",
        "title": "FACTURE ÉNERGIE (SYNTH)",
        "lines": [
            "Fournisseur: EDF",
            "Période: 01/09/2026 — 30/09/2026",
            "Adresse: 12 rue de la Paix, 75002 Paris",
            "Montant: 45,20 EUR",
        ],
        "fields": {
            "doc_type": "facture_energie",
            "adresse": "12 rue de la Paix, 75002 Paris",
            "valid": True,
        },
    },
    {
        "id": "rib",
        "label": "bank",
        "title": "RELEVÉ D'IDENTITÉ BANCAIRE (SYNTH)",
        "lines": [
            "Titulaire: FATIMA ZAHRA",
            "IBAN: FR76 3000 6000 0112 3456 7890 189",
            "BIC: AGRIFRPP",
        ],
        "fields": {
            "doc_type": "rib",
            "iban": "FR7630006000011234567890189",
            "bic": "AGRIFRPP",
            "valid": True,
        },
    },
    {
        "id": "avis_imposition",
        "label": "other",
        "title": "AVIS D'IMPOSITION (SYNTH)",
        "lines": [
            "Année: 2025",
            "Revenu fiscal de référence: 18200 EUR",
            "N° fiscal: 12 34 567 890 123",
        ],
        "fields": {
            "doc_type": "avis_imposition",
            "rfr": 18200,
            "valid": True,
        },
    },
    {
        "id": "blurry_scan",
        "label": "address",
        "title": "SCAN FLOU (SYNTH)",
        "lines": [
            "Quittance ???",
            "Adresse illisible",
            "Montant: ??",
        ],
        "fields": {
            "doc_type": "unknown",
            "valid": False,
            "issue": "low_quality",
        },
        "quality": "blur",
    },
]


def render(doc: dict, out_path: Path, quality: str = "ok") -> None:
    try:
        from PIL import Image, ImageDraw, ImageFilter, ImageFont
    except ImportError as exc:
        raise SystemExit("pip install pillow") from exc

    w, h = 768, 768
    img = Image.new("RGB", (w, h), (245, 245, 240) if quality != "dark" else (40, 40, 45))
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("arial.ttf", 22)
        font_sm = ImageFont.truetype("arial.ttf", 18)
    except OSError:
        font = ImageFont.load_default()
        font_sm = font

    ink = (20, 20, 20) if quality != "dark" else (200, 200, 200)
    y = 40
    draw.text((40, y), doc["title"], fill=ink, font=font)
    y += 50
    draw.line((40, y, w - 40, y), fill=ink)
    y += 20
    for line in doc["lines"]:
        draw.text((40, y), line, fill=ink, font=font_sm)
        y += 32
    draw.text((40, h - 40), "IADAF synthetic — not a real ID", fill=(120, 120, 120), font=font_sm)

    if quality == "blur":
        img = img.filter(ImageFilter.GaussianBlur(radius=3.5))
    elif quality == "dark":
        # already dark bg; slight extra
        pass

    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path, format="PNG")


def example_row(image_rel: str, doc: dict) -> dict:
    fields_json = json.dumps(doc["fields"], ensure_ascii=False)
    user = (
        "Extrais le type de justificatif et les champs utiles en JSON. "
        "Si la pièce est illisible, expirée ou invalide, indique valid=false et issue."
    )
    assistant = (
        f"Catégorie IADAF: {doc['label']}\n"
        f"```json\n{fields_json}\n```\n"
        "Les règles déterministes (dates, IBAN, MRZ) doivent re-valider ces champs."
    )
    return {
        "image": image_rel,
        "messages": [
            {
                "role": "system",
                "content": (
                    "Tu es le module documents IADAF. Tu lis des pièces administratives "
                    "synthétiques ou usager et tu renvoies un JSON structuré. "
                    "Tu n'affirmes jamais « conforme » sans validation code."
                ),
            },
            {"role": "user", "content": user},
            {"role": "assistant", "content": assistant},
        ],
        "meta": {"doc_id": doc["id"], "label": doc["label"], "synthetic": True},
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    random.seed(args.seed)

    OUT_IMG.mkdir(parents=True, exist_ok=True)
    rows = []
    variants = ["ok", "ok", "blur", "dark"]

    for doc in DOCS:
        for qi, q in enumerate(variants):
            if doc.get("quality") == "blur" and q != "blur":
                continue
            name = f"{doc['id']}_{q}_{qi}.png"
            path = OUT_IMG / name
            render(doc, path, quality=q if q != "ok" else doc.get("quality", "ok"))
            rel = str(path.relative_to(ROOT)).replace("\\", "/")
            rows.append(example_row(rel, doc))

    random.shuffle(rows)
    OUT_JSONL.parent.mkdir(parents=True, exist_ok=True)
    with OUT_JSONL.open("w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print(f"Wrote {len(rows)} VL examples → {OUT_JSONL}")
    print(f"Images → {OUT_IMG}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
