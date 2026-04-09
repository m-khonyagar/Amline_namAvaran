"""Pytest: in-memory SQLite + schema before importing the app."""
from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timezone

# اجرای pytest همیشه روی SQLite حافظه‌ای (همراه StaticPool در session.py برای یکسان‌سازی اتصال‌ها).
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ.setdefault("AMLINE_OTP_DEBUG", "1")
os.environ.setdefault("AMLINE_OTP_MAGIC_ENABLED", "1")
os.environ.setdefault("AMLINE_RBAC_ENFORCE", "0")

import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session


def pytest_addoption(parser: pytest.Parser) -> None:
    parser.addoption(
        "--skip-redis",
        action="store_true",
        default=False,
        help="Skip tests marked @pytest.mark.redis (no compatible Redis / Streams).",
    )


def pytest_collection_modifyitems(config: pytest.Config, items: list[pytest.Item]) -> None:
    if config.getoption("--skip-redis", default=False):
        skip = pytest.mark.skip(
            reason="skipped via --skip-redis (Redis Streams not available)"
        )
        for item in items:
            if item.get_closest_marker("redis"):
                item.add_marker(skip)


from app.db.base import Base
from app.db.session import SessionLocal, engine

# قبل از create_all: بارگذاری کامل اپ تا همهٔ مدل‌ها روی metadata ثبت شوند (Linux/CI).
import app.models  # noqa: F401
import app.main  # noqa: F401


def _seed_minimal_rbac_geo(db: Session) -> None:
    now = datetime.now(timezone.utc)
    roles = [
        ("admin", "Admin", json.dumps(["*"])),
        ("agent", "Agent", json.dumps(["crm:read", "visits:write"])),
        ("manager", "Manager", json.dumps(["crm:*"])),
        ("support", "Support", json.dumps(["crm:read"])),
    ]
    for code, label, perms in roles:
        db.execute(
            text(
                "INSERT OR IGNORE INTO rbac_roles (code, label, permissions_json, created_at) "
                "VALUES (:c,:l,:p,:t)"
            ),
            {"c": code, "l": label, "p": perms, "t": now},
        )
    db.execute(
        text(
            "INSERT OR IGNORE INTO provinces (id, name_fa, sort_order, created_at) "
            "VALUES ('08', 'تهران', 8, :t)"
        ),
        {"t": now},
    )
    db.execute(
        text(
            "INSERT OR IGNORE INTO cities (id, province_id, name_fa, created_at) "
            "VALUES (:id, '08', 'تهران', :t)"
        ),
        {"id": str(uuid.uuid4()), "t": now},
    )
    db.commit()


@pytest.fixture(scope="session", autouse=True)
def _init_sqlite_schema() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        _seed_minimal_rbac_geo(db)
    finally:
        db.close()
    yield
