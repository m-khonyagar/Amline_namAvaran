from __future__ import annotations

import uuid

import pytest

import app.services.notification_queue as notification_queue

pytestmark = pytest.mark.redis


def test_dlq_replay_moves_message_back_to_stream():
    r = notification_queue.get_redis()

    # Make test deterministic.
    r.delete(notification_queue.STREAM_KEY)
    r.delete(notification_queue.DLQ_STREAM_KEY)

    nid = uuid.uuid4()
    notification_queue.enqueue_dlq(notification_id=nid, reason="process_error", attempt=3)

    # DLQ has the entry.
    dlq_items = r.xrange(notification_queue.DLQ_STREAM_KEY, min='-', max='+')
    assert any(fields.get("notification_id") == str(nid) for _, fields in dlq_items)

    replayed = notification_queue.replay_dlq(notification_id=nid)
    assert replayed == 1

    # Main stream now has the message.
    stream_items = r.xrange(notification_queue.STREAM_KEY, min='-', max='+')
    assert any(fields.get("notification_id") == str(nid) for _, fields in stream_items)

    # DLQ entry removed.
    dlq_items2 = r.xrange(notification_queue.DLQ_STREAM_KEY, min='-', max='+')
    assert not any(fields.get("notification_id") == str(nid) for _, fields in dlq_items2)
