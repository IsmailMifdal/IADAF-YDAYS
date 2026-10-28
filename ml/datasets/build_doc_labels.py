#!/usr/bin/env python3
"""Synthetic document-type labels (identity | address | bank | other).

No real user documents — AIPD-safe training / eval data for pre-check heuristics.
"""

from __future__ import annotations

import json
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "datasets" / "processed" / "doc_labels.jsonl"

# Synthetic OCR / text snippets aligned with ai-service rules.py categories
# Aligné sur les types document-ia (beta.gouv) + catégories IADAF identity/address/bank/other
TEMPLATES = {
    "identity": [
        "PASSEPORT RÉPUBLIQUE FRANÇAISE\nP<FRADUPONT<<JEAN<MARIE<<<<<<<<<<<\n12AB34567FRA9001011M2501018<<<<<<<<<<<<<<06",
        "CARTE NATIONALE D'IDENTITÉ\nNom: MARTIN\nPrénom: Sophie\nDate de naissance: 15/03/1990\nDate d'expiration: 12/08/2030",
        "TITRE DE SÉJOUR\nType: Salarié\nValable jusqu'au: 01/06/2027\nN°: 1234567890",
        "VISA LONG SÉJOUR VALANT TITRE DE SÉJOUR (VLS-TS)\nExpire le: 20/11/2026",
        "PERMIS DE CONDUIRE\nNom: TRAORE\nPrénom: Amadou\nCatégories: B\nN°: 12AB34567",
    ],
    "address": [
        "Facture EDF — Période du 01/09/2026 au 30/09/2026\n12 rue de la Paix, 75002 Paris\nMontant: 45,20 €",
        "Quittance de loyer — Octobre 2026\nLocataire: A. Benali\nAdresse: 5 avenue Victor Hugo, 69002 Lyon",
        "Attestation d'hébergement — Je soussigné héberge M. X à 10 bd Haussmann 75009 Paris depuis le 01/01/2026",
        "Relevé Orange Fibre — Facture du 05/10/2026 — 3 rue des Lilas 33000 Bordeaux",
        "Attestation Visale — Garantie loyers\nLocataire: N. Chen\nAdresse logement: 8 rue de Rivoli 75004 Paris",
    ],
    "bank": [
        "RELEVÉ D'IDENTITÉ BANCAIRE\nIBAN: FR76 3000 6000 0112 3456 7890 189\nBIC: AGRIFRPP\nTitulaire: Fatima Zahra",
        "RIB Crédit Agricole\nIBAN FR1420041010050500013M02606\nDomiciliation: Agence Centre",
        "Compte courant — IBAN: FR7630004000031234567890145 — BIC: BNPAFRPPXXX",
    ],
    "other": [
        "Avis d'imposition 2025 — Revenu fiscal de référence : 18 200 € — N° fiscal 12 34 567 890 123",
        "Contrat de travail CDD — Poste: Développeur — Salaire brut mensuel: 2 400 €",
        "Certificat de scolarité — Université de Paris — Année 2026-2027",
        "Attestation d'assurance habitation — Police n° HAB-998877",
        "Bulletin de salaire — Mois: 09/2026 — Net à payer: 1 850,40 € — Employeur: ACME SAS",
        "Taxe foncière 2026 — Référence parcelle: 000 AB 0123 — Montant: 612,00 €",
        "Certificat d'immatriculation (carte grise) — Immat: AB-123-CD — Titulaire: L. Nguyen",
    ],
}


def main() -> int:
    random.seed(42)
    rows = []
    for label, texts in TEMPLATES.items():
        for text in texts:
            rows.append({"text": text, "label": label, "synthetic": True})
            # Slight noise variants
            rows.append(
                {
                    "text": text.upper() if label != "bank" else text.replace(" ", ""),
                    "label": label,
                    "synthetic": True,
                }
            )

    random.shuffle(rows)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print(f"Wrote {len(rows)} synthetic doc labels → {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
