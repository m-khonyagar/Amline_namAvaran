from __future__ import annotations

import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories.v1.p1_repositories import GeoRepository

router = APIRouter(tags=["reference-data", "files"])


@router.get("/provinces/cities")
def provinces_cities(
    province_id: Optional[str] = Query(None, description="فیلتر شهر بر اساس استان"),
    db: Session = Depends(get_db),
) -> List[Dict[str, Any]]:
    repo = GeoRepository(db)
    if province_id:
        return [
            {"id": c.id, "name": c.name_fa, "province_id": c.province_id}
            for c in repo.list_cities(province_id)
        ]
    out: List[Dict[str, Any]] = []
    for p in repo.list_provinces():
        for c in repo.list_cities(p.id):
            out.append({"id": c.id, "name": c.name_fa, "province_id": c.province_id})
    return out


@router.get("/provinces")
def provinces(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    repo = GeoRepository(db)
    return [
        {
            "id": p.id,
            "name": p.name_fa,
            "name_fa": p.name_fa,
            "sort_order": p.sort_order,
        }
        for p in repo.list_provinces()
    ]


# GET /financials/wallets is served by legacy financials router (platform_router).

@router.post("/files/upload", status_code=201)
def files_upload() -> dict:
    # OpenAPI / wizard tests expect numeric file ids (see tests/test_contract_wizard_properties.py).
    file_id = uuid.uuid4().int % (2**31 - 1) or 1
    return {"id": file_id, "url": None}
