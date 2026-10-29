"""Load the generic chemin registry (shared with ML / product)."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional

# ai-service/app/skills → repo root IADAF-YDAYS/chemins/registry.json
_REGISTRY = Path(__file__).resolve().parents[3] / "chemins" / "registry.json"


@lru_cache(maxsize=1)
def load_registry() -> Dict[str, Any]:
    if not _REGISTRY.is_file():
        return {"version": 0, "chemins": []}
    return json.loads(_REGISTRY.read_text(encoding="utf-8"))


def list_chemins() -> List[Dict[str, Any]]:
    return list(load_registry().get("chemins") or [])


def by_chemin_id(chemin_id: str) -> Optional[Dict[str, Any]]:
    for c in list_chemins():
        if c.get("chemin_id") == chemin_id:
            return c
    return None


def by_pack_slug(slug: str) -> Optional[Dict[str, Any]]:
    for c in list_chemins():
        if c.get("pack_slug") == slug:
            return c
    return None


def resolve_chemin(chemin_id: Optional[str] = None, pack_slug: Optional[str] = None) -> Optional[Dict[str, Any]]:
    if chemin_id:
        found = by_chemin_id(chemin_id)
        if found:
            return found
    if pack_slug:
        return by_pack_slug(pack_slug)
    return None
