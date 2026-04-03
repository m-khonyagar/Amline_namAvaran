"""Optional multi-agency scoping via header when AMLINE_AGENCY_SCOPE_ENABLED=1."""

from __future__ import annotations

import os

from fastapi import Request


def agency_scope_enabled() -> bool:
    return os.getenv("AMLINE_AGENCY_SCOPE_ENABLED", "").lower() in ("1", "true", "yes")


def effective_agency_id(request: Request) -> str | None:
    if not agency_scope_enabled():
        return None
    h = request.headers.get("X-Agency-Id") or request.headers.get("X-User-Agency-Id")
    return (h or "").strip() or None
