"""Test configuration — ensure all tables exist before any test runs."""
from __future__ import annotations

import pytest
from sqlalchemy import inspect, text

from app.db import models  # noqa: F401 — registers all models with Base.metadata
from app.db.base import Base
from app.db.session import engine


def _ensure_wizard_commission_column() -> None:
    """Lightweight migration for tests when DB predates `commission_paid_at` (create_all won't alter)."""
    insp = inspect(engine)
    if not insp.has_table("wizard_contracts"):
        return
    names = {c["name"] for c in insp.get_columns("wizard_contracts")}
    if "commission_paid_at" in names:
        return
    url = str(engine.url).lower()
    with engine.begin() as conn:
        if "sqlite" in url:
            conn.execute(text("ALTER TABLE wizard_contracts ADD COLUMN commission_paid_at TIMESTAMP"))
        else:
            conn.execute(
                text(
                    "ALTER TABLE wizard_contracts ADD COLUMN IF NOT EXISTS "
                    "commission_paid_at TIMESTAMP WITH TIME ZONE"
                )
            )


@pytest.fixture(scope="session", autouse=True)
def create_tables():
    """Create all tables (including newly added ones) before the test session."""
    Base.metadata.create_all(bind=engine)
    _ensure_wizard_commission_column()
    yield


@pytest.fixture(scope="session", autouse=True)
def fake_redis_for_tests():
    """In-memory fake Redis for notification streams (no daemon required)."""
    import fakeredis

    import app.services.notification_queue as nq

    _fake = fakeredis.FakeRedis(decode_responses=True)
    nq.get_redis = lambda: _fake
    yield
