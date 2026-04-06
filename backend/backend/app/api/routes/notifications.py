from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.ids import parse_uuid
from app.db.session import get_db
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import (
    NotificationDlqEntry,
    NotificationDlqReplayRequest,
    NotificationDlqReplayResponse,
    NotificationOut,
)
from app.services.notification_queue import enqueue_notification, read_dlq, replay_dlq

router = APIRouter()


def _to_out(n: Notification) -> NotificationOut:
    return NotificationOut(
        id=str(n.id),
        user_id=str(n.user_id),
        type=n.type,
        channel=n.channel,
        status=n.status,
        created_at=n.created_at,
    )


def _require_dev() -> None:
    if settings.env != "dev":
        raise HTTPException(status_code=404, detail="not_found")


@router.get("", response_model=list[NotificationOut])
def list_notifications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(Notification).filter(Notification.user_id == user.id).order_by(Notification.created_at.desc()).all()
    return [_to_out(x) for x in items]


@router.post("/dev/enqueue", response_model=NotificationOut)
def dev_enqueue(
    type: str,
    channel: str = "sms",
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_dev()

    n = Notification(user_id=user.id, type=type, channel=channel, status="pending")
    db.add(n)
    db.commit()
    db.refresh(n)

    enqueue_notification(notification_id=n.id)

    return _to_out(n)


@router.get("/dev/dlq", response_model=list[NotificationDlqEntry])
def dev_dlq(
    count: int = 50,
    _: User = Depends(get_current_user),
):
    _require_dev()

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


@router.post("/dev/dlq/replay", response_model=NotificationDlqReplayResponse)
def dev_dlq_replay(
    req: NotificationDlqReplayRequest,
    _: User = Depends(get_current_user),
):
    _require_dev()

    nid = parse_uuid(req.notification_id) if req.notification_id else None
    replayed = replay_dlq(notification_id=nid, count=req.count)
    return NotificationDlqReplayResponse(replayed=replayed)
