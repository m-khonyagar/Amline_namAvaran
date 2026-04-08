from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.tenant_score_event import TenantScoreEvent
from app.models.user import User


def apply_tenant_score_delta(
    db: Session,
    *,
    user: User,
    delta: int,
    reason: str,
    reference_id: str | None = None,
) -> None:
    if delta == 0:
        return

    user.tenant_score = int(user.tenant_score or 0) + int(delta)
    e = TenantScoreEvent(user_id=user.id, delta=int(delta), reason=reason, reference_id=reference_id)
    db.add(e)
