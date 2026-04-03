"""RBAC enforcement (P1) — off by default; enable with AMLINE_RBAC_ENFORCE=1."""

from __future__ import annotations

import os
from typing import Callable, List

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.core.errors import AmlineError
from app.db.session import get_db
from app.repositories.v1.p1_repositories import RbacRepository


def _perm_match(granted: List[str], need: str) -> bool:
    if "*" in granted:
        return True
    if need in granted:
        return True
    for g in granted:
        if g.endswith("*"):
            p = g[:-1]
            if need == p or need.startswith(p + ":") or need.startswith(p):
                return True
    return False


def _effective_permissions(request: Request, db: Session) -> List[str]:
    header = request.headers.get("X-User-Permissions")
    if header and header.strip():
        return [x.strip() for x in header.split(",") if x.strip()]
    uid = request.headers.get("X-User-Id") or "mock-001"
    return RbacRepository(db).permissions_for_user(uid)


def require_permission(permission: str) -> Callable[..., None]:
    def checker(request: Request, db: Session = Depends(get_db)) -> None:
        if os.getenv("AMLINE_RBAC_ENFORCE", "").lower() not in ("1", "true", "yes"):
            return
        granted = _effective_permissions(request, db)
        if not _perm_match(granted, permission):
            raise AmlineError(
                "RESOURCE_ACCESS_DENIED",
                "مجوز لازم برای این عملیات وجود ندارد.",
                status_code=403,
                details={"required": permission},
            )

    return checker
