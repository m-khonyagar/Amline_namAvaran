from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.authz import require_admin_or_moderator
from app.core.ids import parse_uuid
from app.db.session import get_db
from app.models.notification import Notification
from app.models.user import User, UserRole
from app.schemas.notification import (
    NotificationDlqEntry,
    NotificationDlqReplayRequest,
    NotificationDlqReplayResponse,
)
from app.services.notification_queue import read_dlq, replay_dlq

router = APIRouter()


@router.get("/notifications/dlq", response_model=list[NotificationDlqEntry])
def dlq(
    count: int = 50,
    _: User = Depends(require_admin_or_moderator),
):
    out: list[NotificationDlqEntry] = []
    for msg_id, fields in read_dlq(count=count):
        out.append(
            NotificationDlqEntry(
                id=msg_id,
                notification_id=str(fields.get("notification_id")),
                reason=fields.get("reason"),
                attempt=int(fields.get("attempt") or 0),
                ts_ms=int(fields.get("ts_ms")) if fields.get("ts_ms") else None,
            )
        )
    return out


@router.post("/notifications/dlq/replay", response_model=NotificationDlqReplayResponse)
def dlq_replay(
    req: NotificationDlqReplayRequest,
    _: User = Depends(require_admin_or_moderator),
):
    nid = parse_uuid(req.notification_id) if req.notification_id else None
    replayed = replay_dlq(notification_id=nid, count=req.count)
    return NotificationDlqReplayResponse(replayed=replayed)


@router.put("/users/{user_id}/role")
def set_user_role(
    user_id: str,
    role: UserRole,
    _: User = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db),
):
    try:
        uid = parse_uuid(user_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_user_id")

    u = db.get(User, uid)
    if not u:
        raise HTTPException(status_code=404, detail="user_not_found")

    u.role = role
    db.commit()
    return {"ok": True, "user_id": str(u.id), "role": u.role.value}
