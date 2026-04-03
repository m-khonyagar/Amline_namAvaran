from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.rbac_deps import require_permission
from app.db.session import get_db
from app.schemas.v1.notifications_v1 import NotificationDispatchBody
from app.services.v1.notification_dispatch import NotificationDispatchService

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.post("/dispatch", status_code=202)
def dispatch_notification(
    body: NotificationDispatchBody,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("notifications:write")),
) -> dict:
    svc = NotificationDispatchService(db)
    nid = svc.dispatch(
        channel=body.channel,
        recipient=body.recipient,
        template_key=body.template_key,
        payload=body.payload,
    )
    db.commit()
    return {"ok": True, "notification_id": nid}
