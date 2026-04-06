"""نیازمندی کاربر + فید بازار + alias ادمین Hamgit (ذخیرهٔ درون‌پردازه‌ای؛ نسخهٔ اول)."""
from __future__ import annotations

import threading
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, field_validator
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

QUEUE_MESSAGE_FA = (
    "نیازمندی شما با موفقیت ثبت شد. زمان انتظار در صف حداکثر ۲ ساعت می‌باشد."
)

_lock = threading.Lock()
_req_seq = 0
requirements_store: List[Dict[str, Any]] = []

MARKET_SEED: List[Dict[str, Any]] = [
    {
        "id": "seed-1",
        "kind": "buy",
        "user_id": "seed",
        "publish_title": "آگهی خرید و فروش آپارتمان",
        "city_label": "قم",
        "neighborhood_label": "پردیسان",
        "price_label": "۱۲ میلیارد تومان",
        "description": "آپارتمان ۹۰ متری، نوساز، نزدیک بلوار.",
        "status": "PUBLISHED",
    },
    {
        "id": "seed-2",
        "kind": "rent",
        "user_id": "seed",
        "publish_title": "آگهی رهن و اجاره آپارتمان",
        "city_label": "قم",
        "neighborhood_label": "قنوات",
        "price_label": "رهن ۵۰۰ / اجاره ۸ میلیون",
        "description": "دو خواب، پارکینگ و انباری.",
        "status": "PUBLISHED",
    },
    {
        "id": "seed-3",
        "kind": "barter",
        "user_id": "seed",
        "publish_title": "معاوضه ملک با آپارتمان",
        "city_label": "تهران",
        "neighborhood_label": "ونک",
        "price_label": "توافقی",
        "description": "زمین تجاری به‌ازای آپارتمان در قم.",
        "status": "PUBLISHED",
    },
    {
        "id": "seed-4",
        "kind": "buy",
        "user_id": "seed",
        "publish_title": "خرید ویلایی مسکونی",
        "city_label": "قم",
        "neighborhood_label": "جعفریه",
        "price_label": "۸ میلیارد تومان",
        "description": "بنای ۲۵۰ متر، حیاط اختصاصی.",
        "status": "PUBLISHED",
    },
    {
        "id": "seed-5",
        "kind": "rent",
        "user_id": "seed",
        "publish_title": "اجاره مغازه تجاری",
        "city_label": "قم",
        "neighborhood_label": "مرکز",
        "price_label": "اجاره ۱۵ میلیون",
        "description": "بر اصلی، مناسب خرده‌فروشی.",
        "status": "PUBLISHED",
    },
    {
        "id": "seed-6",
        "kind": "barter",
        "user_id": "seed",
        "publish_title": "معاوضه آپارتمان با مغازه",
        "city_label": "قم",
        "neighborhood_label": "سلفچگان",
        "price_label": "هم‌ارزش",
        "description": "آپارتمان ۱۱۰ متری با مغازه ۴۰ متری.",
        "status": "PUBLISHED",
    },
]


def _next_requirement_id() -> str:
    global _req_seq
    with _lock:
        _req_seq += 1
        return f"req-{_req_seq:06d}"


def _all_market_rows() -> List[Dict[str, Any]]:
    with _lock:
        return list(MARKET_SEED) + list(requirements_store)


def _row_to_feed_item(r: Dict[str, Any]) -> Dict[str, Any]:
    desc = (r.get("description") or "").strip()
    excerpt = desc[:120] if desc else "—"
    return {
        "id": r["id"],
        "kind": r["kind"],
        "title": r.get("publish_title") or r.get("title") or "بدون عنوان",
        "city": r.get("city_label") or "",
        "neighborhood": r.get("neighborhood_label") or "",
        "price_label": r.get("price_label") or "توافقی",
        "excerpt": excerpt,
    }


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
) -> Dict[str, Any]:
    price_label = "توافقی"
    if body.total_price is not None:
        price_label = f"{body.total_price:,.0f} تومان"
    row: Dict[str, Any] = {
        "id": _next_requirement_id(),
        "user_id": str(user.id),
        "kind": body.kind,
        "status": "QUEUED",
        "queue_message": QUEUE_MESSAGE_FA,
        "publish_title": body.publish_title.strip(),
        "city_label": body.city_label.strip(),
        "neighborhood_label": body.neighborhood_label.strip(),
        "price_label": price_label,
        "description": (body.description or "").strip(),
        "property_type_id": body.property_type_id,
        "property_type_label": body.property_type_label,
        "min_area": body.min_area,
        "total_price": body.total_price,
        "build_year": body.build_year,
        "renovated": body.renovated,
        "rooms": body.rooms,
        "amenities": body.amenities or {},
    }
    with _lock:
        requirements_store.append(row)
    return {
        "id": row["id"],
        "kind": row["kind"],
        "status": row["status"],
        "queue_message": row["queue_message"],
        "publish_title": row["publish_title"],
    }


@router.get("/{requirement_id}")
def requirements_get(requirement_id: str) -> Dict[str, Any]:
    for r in _all_market_rows():
        if r["id"] == requirement_id:
            return {
                "id": r["id"],
                "kind": r["kind"],
                "status": r.get("status", "QUEUED"),
                "queue_message": r.get("queue_message", QUEUE_MESSAGE_FA),
                "publish_title": r.get("publish_title", ""),
                "city_label": r.get("city_label"),
                "neighborhood_label": r.get("neighborhood_label"),
                "description": r.get("description"),
                "payload": {
                    "property_type_label": r.get("property_type_label"),
                    "min_area": r.get("min_area"),
                    "total_price": r.get("total_price"),
                },
            }
    raise HTTPException(status_code=404, detail="not_found")


market_router = APIRouter()


@market_router.get("/feed")
def market_feed(
    kind: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
) -> Dict[str, Any]:
    rows: List[Dict[str, Any]] = []
    for r in _all_market_rows():
        if kind and r.get("kind") != kind:
            continue
        if city and (r.get("city_label") or "") != city:
            continue
        it = _row_to_feed_item(r)
        if q:
            blob = f"{it['title']} {it['excerpt']} {it['neighborhood']}".lower()
            if q.lower() not in blob:
                continue
        rows.append(it)
    return {"items": rows}


admin_ads_router = APIRouter(prefix="/ads", tags=["admin-ads-hamgit"])


@admin_ads_router.get("/wanted/properties")
def admin_ads_wanted_properties() -> Dict[str, Any]:
    out: List[Dict[str, Any]] = []
    for r in _all_market_rows():
        if r.get("kind") in ("buy", "rent"):
            out.append({**r, "feed": _row_to_feed_item(r)})
    return {"items": out, "total": len(out)}


@admin_ads_router.get("/swaps")
def admin_ads_swaps() -> Dict[str, Any]:
    out = [r for r in _all_market_rows() if r.get("kind") == "barter"]
    return {
        "items": [{**r, "feed": _row_to_feed_item(r)} for r in out],
        "total": len(out),
    }
