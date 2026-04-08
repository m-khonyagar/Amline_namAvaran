from __future__ import annotations

import datetime as dt

from pydantic import BaseModel


class NotificationOut(BaseModel):
    id: str
    user_id: str
    type: str
    channel: str
    status: str
    created_at: dt.datetime


class NotificationDlqEntry(BaseModel):
    id: str
    notification_id: str
    reason: str | None = None
    attempt: int = 0
    ts_ms: int | None = None


class NotificationDlqReplayRequest(BaseModel):
    notification_id: str | None = None
    count: int = 200


class NotificationDlqReplayResponse(BaseModel):
    replayed: int
