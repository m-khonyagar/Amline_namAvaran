from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.ids import parse_uuid
from app.db.session import get_db
from app.models.tenant_score_event import TenantScoreEvent
from app.models.user import User
from app.schemas.tenant_score import TenantScoreEventOut

router = APIRouter()


def _to_out(e: TenantScoreEvent) -> TenantScoreEventOut:
    return TenantScoreEventOut(
        id=str(e.id),
        user_id=str(e.user_id),
        delta=int(e.delta),
        reason=e.reason,
        reference_id=e.reference_id,
        created_at=e.created_at,
    )


@router.get("/me")
def my_score(user: User = Depends(get_current_user)):
    return {"user_id": str(user.id), "tenant_score": int(user.tenant_score or 0)}


@router.get("/{user_id}/events", response_model=list[TenantScoreEventOut])
def events(user_id: str, requester: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        uid = parse_uuid(user_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_user_id")

    # Only admins/moderators or the user themselves.
    if requester.role.value not in {"Admin", "Moderator"} and requester.id != uid:
        raise HTTPException(status_code=403, detail="forbidden")

    items = (
        db.query(TenantScoreEvent)
        .filter(TenantScoreEvent.user_id == uid)
        .order_by(TenantScoreEvent.created_at.desc())
        .limit(200)
        .all()
    )
    return [_to_out(x) for x in items]
