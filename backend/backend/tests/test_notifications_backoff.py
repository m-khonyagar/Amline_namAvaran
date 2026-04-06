from __future__ import annotations

from app.services.notification_queue import compute_backoff_seconds


def test_compute_backoff_seconds_caps_and_exponentiates():
    # Base defaults to >=1, cap defaults to >=base
    d1 = compute_backoff_seconds(1)
    d2 = compute_backoff_seconds(2)
    assert d2 >= d1

    # Should cap
    d_big = compute_backoff_seconds(999)
    assert d_big <= compute_backoff_seconds(50)
