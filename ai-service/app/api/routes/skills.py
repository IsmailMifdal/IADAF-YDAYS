"""Skills API — dossier_state, prefill, chemin registry, skill dispatch."""

from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException

from app.models.schemas import DossierStateRequest, PrefillRequest, SkillRequest
from app.skills.chemins import list_chemins, resolve_chemin
from app.skills.dossier_state import build_dossier_state
from app.skills.prefill import build_prefill_recap
from app.skills.service import run_skill
from app.services.rag_service import rag_service

router = APIRouter(tags=["skills"])


@router.get("/chemins")
async def get_chemins() -> Dict[str, Any]:
    return {"chemins": list_chemins()}


@router.get("/chemins/{chemin_id}")
async def get_chemin(chemin_id: str) -> Dict[str, Any]:
    found = resolve_chemin(chemin_id=chemin_id)
    if not found:
        raise HTTPException(status_code=404, detail="chemin inconnu")
    return found


@router.post("/dossier-state")
async def post_dossier_state(request: DossierStateRequest) -> Dict[str, Any]:
    return build_dossier_state(
        chemin_id=request.chemin_id,
        pack_slug=request.pack_slug,
        provided_documents=request.provided_documents,
        piece_statuses=request.piece_statuses,
        extracted_fields=request.extracted_fields,
        anomalies=request.anomalies,
    )


@router.post("/prefill")
async def post_prefill(request: PrefillRequest) -> Dict[str, Any]:
    return build_prefill_recap(
        chemin_id=request.chemin_id,
        pack_slug=request.pack_slug,
        extracted_fields=request.extracted_fields,
    )


@router.post("/skills/run")
async def post_skill_run(request: SkillRequest) -> Dict[str, Any]:
    result = run_skill(
        request.message,
        skill=request.skill,  # type: ignore[arg-type]
        chemin_id=request.chemin_id,
        pack_slug=request.pack_slug,
        provided_documents=request.provided_documents,
        piece_statuses=request.piece_statuses,
        extracted_fields=request.extracted_fields,
    )
    if result.get("needs_llm"):
        question = request.message
        state_block = result.get("prompt_state")
        if state_block:
            question = f"{state_block}\n\nQuestion: {request.message}"
        rag = await rag_service.aquery(question=question, language=request.language)
        result["response"] = rag["answer"]
        result["sources"] = rag.get("sources") or []
        result["needs_llm"] = False
    result.setdefault("sources", [])
    return result
