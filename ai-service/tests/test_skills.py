"""Unit tests — skills router, dossier_state, prefill, rules extensions."""

from app.skills.router import route_skill
from app.skills.dossier_state import build_dossier_state
from app.skills.prefill import build_prefill_recap
from app.documents import rules


def test_route_refuse_piratage():
    assert route_skill("Comment pirater une boîte mail ?") == "refuse"


def test_route_checklist():
    assert route_skill("Quelles pièces me manquent ?") == "checklist"


def test_dossier_titre_missing():
    state = build_dossier_state(pack_slug="titre-sejour", provided_documents=["Passeport"])
    assert "Justificatif de domicile" in state["missing"]


def test_prefill_no_auto_submit():
    recap = build_prefill_recap(pack_slug="impots", extracted_fields={"nom": "Test"})
    assert recap["submit_allowed"] is False


def test_file_format_and_siret():
    assert rules.file_format_checks("x.pdf")[0].status == "ok"
    assert rules.file_format_checks("x.exe")[0].status == "error"
