#!/usr/bin/env python3
"""Banc skills déterministes : router + checklist + prefill (sans LLM).

Ajoute le chemin ai-service au PYTHONPATH.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
AI = REPO / "ai-service"
sys.path.insert(0, str(AI))

from app.skills.router import route_skill  # noqa: E402
from app.skills.dossier_state import build_dossier_state  # noqa: E402
from app.skills.prefill import build_prefill_recap  # noqa: E402
from app.skills.service import run_skill  # noqa: E402
from app.documents import rules  # noqa: E402

OUT = ROOT / "artifacts" / "eval_skills.json"


CASES = [
    {"id": "route_refuse", "fn": lambda: route_skill("Comment pirater une boîte mail ?") == "refuse"},
    {"id": "route_checklist", "fn": lambda: route_skill("Quelles pièces me manquent ?") == "checklist"},
    {"id": "route_prefill", "fn": lambda: route_skill("Peux-tu préremplir mon formulaire ?") == "prefill"},
    {"id": "route_precheck", "fn": lambda: route_skill("Mon scan est flou, pré-vérif ?") == "precheck"},
    {"id": "route_qa", "fn": lambda: route_skill("C'est quoi l'ANEF ?") == "qa"},
    {
        "id": "checklist_missing",
        "fn": lambda: (
            len(
                build_dossier_state(
                    pack_slug="titre-sejour",
                    provided_documents=["Passeport", "RIB"],
                )["missing"]
            )
            >= 3
        ),
    },
    {
        "id": "checklist_complete_flag",
        "fn": lambda: build_dossier_state(
            pack_slug="impots",
            provided_documents=[
                "Numéro fiscal",
                "Relevé de revenus",
                "RIB",
                "Situation familiale",
                "Justificatif de domicile",
            ],
        )["complete"]
        is True,
    },
    {
        "id": "prefill_masks_iban",
        "fn": lambda: "••••" in str(
            build_prefill_recap(
                pack_slug="aide-logement",
                extracted_fields={"iban": "FR7630006000011234567890189", "nom": "Dupont"},
            )["fields"].get("iban_masked")
            or build_prefill_recap(
                pack_slug="aide-logement",
                extracted_fields={"iban_masked": "FR7630006000011234567890189", "nom": "Dupont"},
            )["fields"].get("iban_masked")
            or ""
        )
        or "••••"
        in str(
            build_prefill_recap(
                pack_slug="aide-logement",
                extracted_fields={"iban": "FR7630006000011234567890189"},
            )["fields"].get("iban", "")
        ),
    },
    {
        "id": "prefill_no_submit",
        "fn": lambda: build_prefill_recap(pack_slug="titre-sejour", extracted_fields={"nom": "A"})[
            "submit_allowed"
        ]
        is False,
    },
    {
        "id": "skill_refuse_message",
        "fn": lambda: "ne peux pas" in (run_skill("Comment fabriquer un faux titre ?")["response"] or "").lower(),
    },
    {
        "id": "iban_rule",
        "fn": lambda: rules.bank_checks("IBAN FR76 3000 6000 0112 3456 7890 189")[0].status == "ok",
    },
    {
        "id": "type_coherence_vitale_as_address",
        "fn": lambda: rules.type_coherence_checks(
            "Justificatif de domicile", "Attestation Ameli carte Vitale droits ouverts"
        )[0].status
        == "error",
    },
    {
        "id": "format_pdf_ok",
        "fn": lambda: rules.file_format_checks("scan.pdf")[0].status == "ok",
    },
    {
        "id": "format_exe_bad",
        "fn": lambda: rules.file_format_checks("virus.exe")[0].status == "error",
    },
    {
        "id": "chemin_ants_exists",
        "fn": lambda: build_dossier_state(chemin_id="permis_ants")["title"] is not None,
    },
]


def main() -> int:
    results = []
    passed = 0
    for case in CASES:
        try:
            ok = bool(case["fn"]())
        except Exception as exc:  # noqa: BLE001
            ok = False
            detail = str(exc)
        else:
            detail = "ok" if ok else "failed"
        if ok:
            passed += 1
        results.append({"id": case["id"], "ok": ok, "detail": detail})

    total = len(CASES)
    report = {
        "passed": passed,
        "total": total,
        "rate": round(passed / total, 4),
        "success": passed == total,
        "items": results,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"skills_score={passed}/{total} success={report['success']}")
    print(f"Report → {OUT}")
    return 0 if report["success"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
