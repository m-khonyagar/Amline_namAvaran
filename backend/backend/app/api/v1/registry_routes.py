from __future__ import annotations

import os

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.errors import AmlineError
from app.core.rbac_deps import require_permission
from app.db.session import get_db
from app.repositories.v1.p1_repositories import AuditDbRepository, RegistryRepository
from app.schemas.v1.registry_v1 import RegistryJobRead, RegistrySubmitBody

router = APIRouter(prefix="/registry", tags=["registry"])


@router.post("/submissions", response_model=RegistryJobRead, status_code=201)
def submit_registry(
    body: RegistrySubmitBody,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("contracts:write")),
) -> RegistryJobRead:
    repo = RegistryRepository(db)
    row = repo.create_job(body.contract_id, body.payload_json)
    AuditDbRepository(db).write(
        user_id=os.getenv("AMLINE_AUDIT_USER_ID", "mock-001"),
        action="registry.submit",
        entity="registry_job",
        metadata={"job_id": row.id, "contract_id": body.contract_id},
    )
    db.commit()
    db.refresh(row)
    return RegistryJobRead.model_validate(row)


@router.get("/submissions/by-contract/{contract_id}", response_model=RegistryJobRead)
def get_registry_by_contract(
    contract_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("contracts:read")),
) -> RegistryJobRead:
    repo = RegistryRepository(db)
    row = repo.get_by_contract(contract_id)
    if not row:
        raise AmlineError(
            "RESOURCE_NOT_FOUND",
            "ارسالی برای این قرارداد یافت نشد.",
            status_code=404,
            details={"entity": "registry_job", "contract_id": contract_id},
        )
    return RegistryJobRead.model_validate(row)
