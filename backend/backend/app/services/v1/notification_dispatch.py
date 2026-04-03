"""Dispatch notifications (SMS via existing adapter; email/push placeholder)."""

from __future__ import annotations

import json
import logging
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models.notification_event import NotificationChannel, NotificationStatus
from app.repositories.v1.p1_repositories import NotificationRepository
from app.services.v1.otp_service import get_sms_adapter

logger = logging.getLogger(__name__)


class NotificationDispatchService:
    def __init__(self, db: Session) -> None:
        self._repo = NotificationRepository(db)
        self._sms = get_sms_adapter()

    def dispatch(
        self,
        *,
        channel: NotificationChannel,
        recipient: str,
        template_key: str,
        payload: Optional[dict[str, Any]],
    ) -> str:
        if channel == NotificationChannel.SMS:
            msg = f"[{template_key}] {json.dumps(payload or {}, ensure_ascii=False)}"
            try:
                ok = self._sms.send_sms(recipient, msg)
                st = NotificationStatus.SENT if ok else NotificationStatus.FAILED
            except Exception as exc:
                logger.warning("SMS dispatch failed: %s", exc)
                st = NotificationStatus.FAILED
            row = self._repo.log(
                channel=channel,
                recipient=recipient,
                template_key=template_key,
                payload=payload,
                status=st,
            )
            return row.id
        if channel == NotificationChannel.EMAIL:
            row = self._repo.log(
                channel=channel,
                recipient=recipient,
                template_key=template_key,
                payload=payload,
                status=NotificationStatus.QUEUED,
            )
            return row.id
        row = self._repo.log(
            channel=channel,
            recipient=recipient,
            template_key=template_key,
            payload=payload,
            status=NotificationStatus.QUEUED,
        )
        return row.id
