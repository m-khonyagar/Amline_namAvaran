from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.ids import parse_uuid
from app.db.session import get_db
from app.models.arbitration import Arbitration
from app.models.contract import Contract
from app.models.property import Property
from app.models.user import User
from app.schemas.arbitration_summary import ArbitrationSummaryOut

router = APIRouter()


def _is_staff(user: User) -> bool:
    role_value = user.role.value if hasattr(user.role, "value") else str(user.role)
    return role_value in {"Admin", "Moderator"}


def _can_view(user: User, a: Arbitration) -> bool:
    if _is_staff(user):
        return True
    return user.id in {a.claimant_id, a.respondent_id}


@router.get("/{arbitration_id}/summary", response_model=ArbitrationSummaryOut)
def summary(arbitration_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        aid = parse_uuid(arbitration_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_arbitration_id")

    a = db.get(Arbitration, aid)
    if not a:
        raise HTTPException(status_code=404, detail="arbitration_not_found")

    if not _can_view(user, a):
        raise HTTPException(status_code=403, detail="forbidden")

    c = db.get(Contract, a.contract_id)
    prop = db.get(Property, c.property_id) if c else None

    claimant = db.get(User, a.claimant_id)
    respondent = db.get(User, a.respondent_id)

    return ArbitrationSummaryOut(
        id=str(a.id),
        status=str(a.status.value if hasattr(a.status, "value") else a.status),
        reason=a.reason,
        created_at=a.created_at,
        contract_id=str(a.contract_id),
        contract_tracking_code=(c.tracking_code if c else None),
        claimant_id=str(a.claimant_id),
        claimant_mobile=(claimant.mobile if claimant else None),
        respondent_id=str(a.respondent_id),
        respondent_mobile=(respondent.mobile if respondent else None),
        property_id=str(prop.id) if prop else None,
        property_city=(prop.city if prop else None),
    )
