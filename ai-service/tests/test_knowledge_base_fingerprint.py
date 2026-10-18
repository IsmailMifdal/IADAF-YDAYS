"""The persisted index must be rebuilt whenever a release changes the
knowledge base: the vector store volume outlives the image."""

from pathlib import Path

from app.services.rag_service import _DATA_DIR, _EMBEDDING_MODEL, knowledge_base_fingerprint

MODEL = "some/model"


def _kb(tmp_path: Path, **files: str) -> Path:
    for name, content in files.items():
        (tmp_path / name).write_text(content, encoding="utf-8")
    return tmp_path


def test_stable_for_unchanged_content(tmp_path):
    kb = _kb(tmp_path, **{"faq.json": "[1]", "demarches.json": "[2]"})
    assert knowledge_base_fingerprint(kb, MODEL) == knowledge_base_fingerprint(kb, MODEL)


def test_changes_when_a_file_is_edited(tmp_path):
    kb = _kb(tmp_path, **{"faq.json": '[{"title": "CAF"}]'})
    before = knowledge_base_fingerprint(kb, MODEL)
    (kb / "faq.json").write_text('[{"title": "CAF, mis à jour"}]', encoding="utf-8")
    assert knowledge_base_fingerprint(kb, MODEL) != before


def test_changes_when_a_file_is_added(tmp_path):
    kb = _kb(tmp_path, **{"faq.json": "[1]"})
    before = knowledge_base_fingerprint(kb, MODEL)
    (kb / "impots.json").write_text("[3]", encoding="utf-8")
    assert knowledge_base_fingerprint(kb, MODEL) != before


def test_changes_with_the_embedding_model(tmp_path):
    kb = _kb(tmp_path, **{"faq.json": "[1]"})
    assert knowledge_base_fingerprint(kb, MODEL) != knowledge_base_fingerprint(kb, "other/model")


def test_ignores_non_json_files(tmp_path):
    kb = _kb(tmp_path, **{"faq.json": "[1]"})
    before = knowledge_base_fingerprint(kb, MODEL)
    (kb / "README.md").write_text("notes", encoding="utf-8")
    assert knowledge_base_fingerprint(kb, MODEL) == before


def test_real_knowledge_base_is_fingerprinted():
    assert len(knowledge_base_fingerprint(_DATA_DIR, _EMBEDDING_MODEL)) == 64
