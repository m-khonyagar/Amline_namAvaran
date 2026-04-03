from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories.v1.p1_repositories import GeoRepository

router = APIRouter(tags=["reference-data", "files", "financials"])


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
        {"id": p.id, "name": p.name_fa, "name_fa": p.name_fa, "sort_order": p.sort_order}
        for p in repo.list_provinces()
    ]


@router.get("/financials/wallets")
def wallets(user_id: str = "mock-001", db: Session = Depends(get_db)) -> dict:
    from app.repositories.v1.p1_repositories import WalletRepository

    repo = WalletRepository(db)
    acct = repo.get_or_create_account(user_id)
    bal = repo.balance_cents(acct.id)
    db.commit()
    return {
        "id": acct.id,
        "credit": bal,
        "user_id": user_id,
        "status": "ACTIVE",
        "currency": acct.currency,
    }


@router.post("/files/upload", status_code=201)
def files_upload() -> dict:
    return {"id": "file-001", "url": None}
