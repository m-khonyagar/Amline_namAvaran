import os
from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/amline.db")

if DATABASE_URL.startswith("sqlite"):
    _sqlite_path = DATABASE_URL.replace("sqlite:///", "", 1)
    if _sqlite_path != ":memory:" and not _sqlite_path.startswith(":memory:"):
        Path(_sqlite_path).parent.mkdir(parents=True, exist_ok=True)

_connect_args = {}
_engine_kwargs: dict = {}
if DATABASE_URL.startswith("sqlite"):
    _connect_args = {"check_same_thread": False}
    # یک DB واقعاً مشترک برای همهٔ اتصال‌ها (وگرنه create_all و get_db روی :memory: جدا می‌افتند)
    if ":memory:" in DATABASE_URL:
        _engine_kwargs["poolclass"] = StaticPool

engine = create_engine(DATABASE_URL, connect_args=_connect_args, **_engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
