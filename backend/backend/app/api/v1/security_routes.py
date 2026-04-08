"""RBAC admin — role catalog & user ↔ role bindings."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.errors import AmlineError
from app.core.rbac_deps import require_permission
from app.db.session import get_db
from app.repositories.v1.p1_repositories import RbacRepository
from app.schemas.v1.rbac_v1 import RoleRead, UserRolesAssignBody, UserRolesRead

router = APIRouter(prefix="/security", tags=["security-rbac"])


@router.get("/roles", response_model=list[RoleRead])
def list_roles(
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("roles:read")),
) -> list[RoleRead]:
    repo = RbacRepository(db)
    return [RoleRead.model_validate(r) for r in repo.list_roles()]


@router.get("/users/{user_id}/roles", response_model=UserRolesRead)
def get_user_roles(
    user_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("roles:read")),
) -> UserRolesRead:
    repo = RbacRepository(db)
    codes = repo.list_user_roles(user_id)
    return UserRolesRead(user_id=user_id, role_codes=codes)


@router.put("/users/{user_id}/roles", response_model=UserRolesRead)
def set_user_roles(
    user_id: str,
    body: UserRolesAssignBody,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("roles:write")),
) -> UserRolesRead:
    repo = RbacRepository(db)
    known = {r.code for r in repo.list_roles()}
    for c in body.role_codes:
        if c not in known:
            raise AmlineError(
                "RESOURCE_NOT_FOUND",
                "نقش نامعتبر است.",
                status_code=422,
                details={"role_code": c},
            )
    repo.set_user_roles(user_id, body.role_codes)
    db.commit()
    return UserRolesRead(user_id=user_id, role_codes=body.role_codes)
