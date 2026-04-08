"""FastAPI helpers for path/query UUID parsing (DRY + consistent 422 details)."""

from __future__ import annotations

import uuid

from fastapi import HTTPException

from app.core.ids import parse_uuid


def uuid_from_param(value: str, *, detail: str = "invalid_uuid") -> uuid.UUID:
    try:
        return parse_uuid(value)
    except ValueError:
        raise HTTPException(status_code=422, detail=detail) from None
