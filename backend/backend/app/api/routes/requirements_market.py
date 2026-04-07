"""نیازمندی کاربر + فید بازار + alias ادمین Hamgit (PostgreSQL)."""
from __future__ import annotations

import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, field_validator
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.authz import require_admin
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.market_requirement import MarketRequirement
from app.models.user import User

router = APIRouter()

QUEUE_MESSAGE_FA = (
    "نیازمندی شما با موفقیت ثبت شد. زمان انتظار در صف حداکثر ۲ ساعت می‌باشد."
)


def _row_to_feed_item(r: MarketRequirement) -> Dict[str, Any]:
    desc = (r.description or "").strip()
    excerpt = desc[:120] if desc else "—"
    return {
        "id": str(r.id),
        "kind": r.kind,
        "title": r.publish_title or "بدون عنوان",
        "city": r.city_label or "",
        "neighborhood": r.neighborhood_label or "",
        "price_label": r.price_label or "توافقی",
        "excerpt": excerpt,
    }


def _orm_to_admin_row(r: MarketRequirement) -> Dict[str, Any]:
    d: Dict[str, Any] = {
        "id": str(r.id),
        "user_id": str(r.user_id) if r.user_id else None,
        "kind": r.kind,
        "status": r.status,
        "publish_title": r.publish_title,
        "city_label": r.city_label,
        "neighborhood_label": r.neighborhood_label,
        "price_label": r.price_label,
        "description": r.description,
        "property_type_id": r.property_type_id,
        "property_type_label": r.property_type_label,
        "min_area": r.min_area,
        "total_price": r.total_price,
        "build_year": r.build_year,
        "renovated": r.renovated,
        "rooms": r.rooms,
        "amenities": r.amenities or {},
        "queue_message": r.queue_message,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "feed": _row_to_feed_item(r),
    }
    return d


class RequirementCreateBody(BaseModel):
    kind: str
    publish_title: str
    city_label: str = ""
    neighborhood_label: str = ""
    property_type_id: Optional[str] = None
    property_type_label: Optional[str] = None
    min_area: Optional[float] = None
    total_price: Optional[float] = None
    build_year: Optional[float] = None
    renovated: Optional[bool] = None
    rooms: Optional[str] = None
    amenities: Optional[Dict[str, Any]] = None
    description: Optional[str] = None

    @field_validator("kind")
    @classmethod
    def _kind_ok(cls, v: str) -> str:
        if v not in ("buy", "rent", "barter"):
            raise ValueError("invalid_kind")
        return v


@router.post("", status_code=201)
def requirements_create(
    body: RequirementCreateBody,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    price_label = "توافقی"
    if body.total_price is not None:
        price_label = f"{body.total_price:,.0f} تومان"
    m = MarketRequirement(
        user_id=user.id,
        kind=body.kind,
        status="QUEUED",
        queue_message=QUEUE_MESSAGE_FA,
        publish_title=body.publish_title.strip(),
        city_label=body.city_label.strip(),
        neighborhood_label=body.neighborhood_label.strip(),
        price_label=price_label,
        description=(body.description or "").strip() or None,
        property_type_id=body.property_type_id,
        property_type_label=body.property_type_label,
        min_area=body.min_area,
        total_price=body.total_price,
        build_year=body.build_year,
        renovated=body.renovated,
        rooms=body.rooms,
        amenities=body.amenities or {},
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return {
        "id": str(m.id),
        "kind": m.kind,
        "status": m.status,
        "queue_message": m.queue_message or QUEUE_MESSAGE_FA,
        "publish_title": m.publish_title,
    }


@router.get("/{requirement_id}")
def requirements_get(requirement_id: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    try:
        rid = uuid.UUID(requirement_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="not_found")
    r = db.get(MarketRequirement, rid)
    if not r:
        raise HTTPException(status_code=404, detail="not_found")
    return {
        "id": str(r.id),
        "kind": r.kind,
        "status": r.status,
        "queue_message": r.queue_message or QUEUE_MESSAGE_FA,
        "publish_title": r.publish_title,
        "city_label": r.city_label,
        "neighborhood_label": r.neighborhood_label,
        "description": r.description,
        "payload": {
            "property_type_label": r.property_type_label,
            "min_area": r.min_area,
            "total_price": r.total_price,
        },
    }


market_router = APIRouter()


@market_router.get("/feed")
def market_feed(
    kind: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    qry = db.query(MarketRequirement)
    if kind:
        qry = qry.filter(MarketRequirement.kind == kind)
    if city:
        qry = qry.filter(MarketRequirement.city_label == city)
    if q and q.strip():
        term = f"%{q.strip()}%"
        qry = qry.filter(
            or_(
                MarketRequirement.publish_title.ilike(term),
                MarketRequirement.description.ilike(term),
                MarketRequirement.neighborhood_label.ilike(term),
            )
        )
    rows: List[MarketRequirement] = qry.order_by(MarketRequirement.created_at.desc()).all()
    return {"items": [_row_to_feed_item(r) for r in rows]}


admin_ads_router = APIRouter(prefix="/ads", tags=["admin-ads-hamgit"])


@admin_ads_router.get("/wanted/properties")
def admin_ads_wanted_properties(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    rows = (
        db.query(MarketRequirement)
        .filter(MarketRequirement.kind.in_(("buy", "rent")))
        .order_by(MarketRequirement.created_at.desc())
        .all()
    )
    out = [_orm_to_admin_row(r) for r in rows]
    return {"items": out, "total": len(out)}


@admin_ads_router.get("/swaps")
def admin_ads_swaps(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    rows = (
        db.query(MarketRequirement)
        .filter(MarketRequirement.kind == "barter")
        .order_by(MarketRequirement.created_at.desc())
        .all()
    )
    out = [_orm_to_admin_row(r) for r in rows]
    return {"items": out, "total": len(out)}
