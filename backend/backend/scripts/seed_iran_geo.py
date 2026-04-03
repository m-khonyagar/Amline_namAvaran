"""Load Iran provinces/cities from data/iran_geo.json into DB (idempotent replace)."""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlalchemy import delete  # noqa: E402

from app.db.session import SessionLocal  # noqa: E402
from app.models.geo import City, Province  # noqa: E402


def main() -> None:
    data_path = ROOT / "data" / "iran_geo.json"
    if not data_path.is_file():
        print("Missing", data_path, file=sys.stderr)
        sys.exit(1)
    raw = json.loads(data_path.read_text(encoding="utf-8"))
    provinces = raw.get("provinces") or []
    db = SessionLocal()
    try:
        db.execute(delete(City))
        db.execute(delete(Province))
        db.flush()
        now = datetime.now(timezone.utc)
        for p in provinces:
            pid = str(p["id"])
            db.add(
                Province(
                    id=pid,
                    name_fa=p["name_fa"],
                    sort_order=int(p.get("sort_order", 0)),
                    created_at=now,
                )
            )
            for c in p.get("cities") or []:
                db.add(
                    City(
                        id=str(c["id"]),
                        province_id=pid,
                        name_fa=c["name_fa"],
                        created_at=now,
                    )
                )
        db.commit()
        print("Seeded", len(provinces), "provinces,", sum(len(p.get("cities") or []) for p in provinces), "cities")
    finally:
        db.close()


if __name__ == "__main__":
    main()
