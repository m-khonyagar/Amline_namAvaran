from __future__ import annotations

import uuid

import pytest

import app.services.notification_queue as notification_queue

pytestmark = pytest.mark.redis


def test_enqueue_notification_writes_to_stream():
    # We only assert the enqueue call works and the stream has at least one entry.
    r = notification_queue.get_redis()

    # Use a random UUID; worker/db processing isn't part of this unit test.
    notification_queue.enqueue_notification(notification_id=uuid.uuid4())

    # XRANGE returns list of entries.
    entries = r.xrange(notification_queue.STREAM_KEY, min='-', max='+', count=5)
    assert len(entries) >= 1
