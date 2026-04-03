"""P4 ops: /metrics disabled unless AMLINE_METRICS_ENABLED=1."""
from __future__ import annotations

import os

from fastapi.testclient import TestClient

os.environ.setdefault("AMLINE_OTP_DEBUG", "1")

from app.main import app  # noqa: E402


def test_metrics_disabled_by_default() -> None:
    os.environ.pop("AMLINE_METRICS_ENABLED", None)
    c = TestClient(app)
    r = c.get("/metrics")
    assert r.status_code == 404


def test_security_header_on_health() -> None:
    c = TestClient(app)
    r = c.get("/health")
    assert r.status_code == 200
    assert r.headers.get("X-Content-Type-Options") == "nosniff"
