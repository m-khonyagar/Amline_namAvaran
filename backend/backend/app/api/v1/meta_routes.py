"""UI helpers: agency list for multi-tenant header (see AMLINE_AGENCIES_JSON)."""

from __future__ import annotations

import json
import os
from typing import Any

from fastapi import APIRouter, Depends

from app.core.agency_scope import agency_scope_enabled
from app.core.rbac_deps import require_permission

router = APIRouter(prefix="/meta", tags=["meta"])


def _agencies_from_env() -> list[dict[str, Any]]:
    raw = (os.getenv("AMLINE_AGENCIES_JSON") or "").strip()
    if not raw:
        return [{"id": "default", "name_fa": "آژانس پیش‌فرض"}]
    try:
        data = json.loads(raw)
        return data if isinstance(data, list) else []
    except json.JSONDecodeError:
        return []


@router.get("/context")
def meta_context(
    _: None = Depends(require_permission("listings:read")),
) -> dict[str, Any]:
    return {
        "agency_scope_enabled": agency_scope_enabled(),
        "agencies": _agencies_from_env(),
    }
