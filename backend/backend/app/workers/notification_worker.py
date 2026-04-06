from __future__ import annotations

import time
import uuid

from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.notification import Notification
from app.services.notification_queue import (
    DLQ_STREAM_KEY,
    GROUP,
    STREAM_KEY,
    compute_backoff_seconds,
    enqueue_dlq,
    enqueue_notification,
    ensure_group,
    get_redis,
    now_ms,
)


CONSUMER = f"worker-{uuid.uuid4().hex[:8]}"


def _db() -> Session:
    return SessionLocal()


def process_one(db: Session, notification_id: uuid.UUID) -> None:
    n = db.get(Notification, notification_id)
    if not n:
        return

    # Idempotent: if already processed, do nothing.
    if n.status in {"sent", "failed"}:
        return

    # TODO: integrate actual channels (SMS/Email/Push/Telegram).
    n.status = "sent"
    db.commit()


def _max_attempts() -> int:
    return int(getattr(settings, "notification_max_attempts", 5))


def _stuck_ms() -> int:
    # Reclaim messages stuck longer than this.
    return int(getattr(settings, "notification_stuck_ms", 60_000))


def _handle_message(*, msg_id: str, fields: dict) -> bool:
    """Returns True if acked/handled, False if left pending for retry."""
    nid = fields.get("notification_id")
    attempt = int(fields.get("attempt") or 0)
    visible_at = fields.get("visible_at_ms")

    # Respect visibility delay.
    if visible_at is not None and now_ms() < int(visible_at):
        return False

    try:
        notification_uuid = uuid.UUID(nid)
    except Exception:
        # Ack malformed messages.
        r = get_redis()
        r.xack(STREAM_KEY, GROUP, msg_id)
        return True

    db = _db()
    try:
        process_one(db, notification_uuid)
    except Exception as e:
        db.rollback()

        next_attempt = attempt + 1
        if next_attempt >= _max_attempts():
            # DLQ + mark failed
            try:
                n = db.get(Notification, notification_uuid)
                if n and n.status not in {"sent"}:
                    n.status = "failed"
                    db.commit()
            except Exception:
                db.rollback()

            enqueue_dlq(notification_id=notification_uuid, reason="process_error", attempt=next_attempt)

            r = get_redis()
            r.xack(STREAM_KEY, GROUP, msg_id)
            return True

        delay_s = compute_backoff_seconds(next_attempt)
        enqueue_notification(
            notification_id=notification_uuid,
            attempt=next_attempt,
            visible_at_ms=now_ms() + delay_s * 1000,
        )

        # Ack current message so it doesn't sit pending forever.
        r = get_redis()
        r.xack(STREAM_KEY, GROUP, msg_id)
        return True
    finally:
        db.close()

    r = get_redis()
    r.xack(STREAM_KEY, GROUP, msg_id)
    return True


def _drain_new() -> None:
    r = get_redis()
    ensure_group(r)

    resp = r.xreadgroup(
        groupname=GROUP,
        consumername=CONSUMER,
        streams={STREAM_KEY: ">"},
        count=10,
        block=5000,
    )

    if not resp:
        return

    for _, msgs in resp:
        for msg_id, fields in msgs:
            _handle_message(msg_id=msg_id, fields=fields)


def _reclaim_pending() -> None:
    r = get_redis()
    ensure_group(r)

    # Claim messages that have been idle too long.
    try:
        # redis-py supports xautoclaim in newer versions; if missing, we skip.
        autoclaim = getattr(r, "xautoclaim", None)
        if autoclaim is None:
            return

        start = "0-0"
        while True:
            next_start, msgs, _deleted = autoclaim(
                name=STREAM_KEY,
                groupname=GROUP,
                consumername=CONSUMER,
                min_idle_time=_stuck_ms(),
                start_id=start,
                count=20,
            )
            if not msgs:
                break

            for msg_id, fields in msgs:
                _handle_message(msg_id=msg_id, fields=fields)

            start = next_start
            if start == "0-0":
                break
    except Exception:
        return


def main() -> None:
    while True:
        _reclaim_pending()
        _drain_new()


if __name__ == "__main__":
    main()
