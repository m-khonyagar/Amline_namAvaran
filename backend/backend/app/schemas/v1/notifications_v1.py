from __future__ import annotations

from typing import Any, Dict, Optional

from pydantic import BaseModel

from app.models.notification_event import NotificationChannel


class NotificationDispatchBody(BaseModel):
    channel: NotificationChannel
    recipient: str
    template_key: str
    payload: Optional[Dict[str, Any]] = None
