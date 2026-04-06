from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.services.notification_queue import enqueue_notification


def notify_user(
    db: Session,
    *,
    user_id: uuid.UUID,
    type: str,
    channel: str = "sms",
) -> Notification:
    n = Notification(user_id=user_id, type=type, channel=channel, status="pending")
    db.add(n)
    db.flush()

    # Enqueue for worker processing.
    enqueue_notification(notification_id=n.id)
    return n
