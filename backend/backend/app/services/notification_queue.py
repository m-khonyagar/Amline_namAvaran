from __future__ import annotations

import time
import uuid

import redis

from app.core.config import settings


STREAM_KEY = "notifications"
DLQ_STREAM_KEY = "notifications:dlq"
GROUP = "amline"


def get_redis() -> redis.Redis:
    return redis.Redis.from_url(settings.redis_url, decode_responses=True)


def ensure_group(r: redis.Redis) -> None:
    try:
        r.xgroup_create(name=STREAM_KEY, groupname=GROUP, id="0", mkstream=True)
    except redis.exceptions.ResponseError as e:
        if "BUSYGROUP" not in str(e):
            raise


def now_ms() -> int:
    return int(time.time() * 1000)


def compute_backoff_seconds(attempt: int) -> int:
    # Exponential backoff capped.
    base = max(1, int(getattr(settings, "notification_retry_base_seconds", 5)))
    cap = max(base, int(getattr(settings, "notification_retry_max_seconds", 300)))
    # attempt starts at 1
    delay = base * (2 ** max(0, attempt - 1))
    return int(min(delay, cap))


def enqueue_notification(*, notification_id: uuid.UUID, attempt: int = 0, visible_at_ms: int | None = None) -> str:
    """Enqueue a notification for the worker.

    visible_at_ms: if set, worker should not process until now_ms() >= visible_at_ms.
    """
    r = get_redis()
    ensure_group(r)
    payload = {
        "notification_id": str(notification_id),
        "attempt": str(int(attempt)),
    }
    if visible_at_ms is not None:
        payload["visible_at_ms"] = str(int(visible_at_ms))
    msg_id = r.xadd(STREAM_KEY, payload)
    return msg_id


def enqueue_dlq(*, notification_id: uuid.UUID, reason: str, attempt: int) -> str:
    r = get_redis()
    payload = {
        "notification_id": str(notification_id),
        "reason": reason,
        "attempt": str(int(attempt)),
        "ts_ms": str(now_ms()),
    }
    return r.xadd(DLQ_STREAM_KEY, payload)


def read_dlq(*, count: int = 50) -> list[tuple[str, dict]]:
    """Read newest DLQ entries first."""
    r = get_redis()
    items = r.xrevrange(DLQ_STREAM_KEY, max="+", min="-", count=int(count))
    return [(msg_id, fields) for msg_id, fields in items]


def replay_dlq(*, notification_id: uuid.UUID | None = None, count: int = 200) -> int:
    """Re-enqueue DLQ messages back to the main stream and delete from DLQ.

    If notification_id is provided, only matching DLQ messages are replayed.
    """
    r = get_redis()
    items = r.xrevrange(DLQ_STREAM_KEY, max="+", min="-", count=int(count))

    replayed = 0
    for msg_id, fields in items:
        nid = fields.get("notification_id")
        try:
            nid_uuid = uuid.UUID(nid)
        except Exception:
            # Drop malformed entries.
            r.xdel(DLQ_STREAM_KEY, msg_id)
            continue

        if notification_id is not None and nid_uuid != notification_id:
            continue

        attempt = int(fields.get("attempt") or 0)
        enqueue_notification(notification_id=nid_uuid, attempt=attempt)
        r.xdel(DLQ_STREAM_KEY, msg_id)
        replayed += 1

    return replayed
