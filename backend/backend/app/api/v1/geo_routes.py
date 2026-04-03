from __future__ import annotations

import os
from typing import Any

import httpx
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.simple_cache import TtlCache
from app.db.session import get_db
from app.repositories.v1.p1_repositories import GeoRepository
from app.schemas.v1.geo_v1 import CityRead, ProvinceRead, ProvinceWithCitiesRead

router = APIRouter(prefix="/geo", tags=["geo"])

_geo_cache = TtlCache(default_ttl_seconds=600.0)
_nominatim_cache = TtlCache(default_ttl_seconds=120.0)


def _nominatim_base() -> str:
    return (
        os.getenv("AMLINE_NOMINATIM_URL") or "https://nominatim.openstreetmap.org"
    ).rstrip("/")


def _nominatim_headers() -> dict[str, str]:
    ua = (
        os.getenv("AMLINE_NOMINATIM_USER_AGENT")
        or "AmlinePlatform/1.0 (+https://amline.local)"
    ).strip()
    return {"User-Agent": ua, "Accept": "application/json"}


@router.get("/provinces", response_model=list[ProvinceRead])
def geo_provinces(db: Session = Depends(get_db)) -> list[ProvinceRead]:
    def _load() -> list[dict]:
        repo = GeoRepository(db)
        return [
            ProvinceRead.model_validate(p).model_dump(mode="json")
            for p in repo.list_provinces()
        ]

    cached = _geo_cache.get_or_set("geo:provinces:v1", _load, ttl_seconds=600.0)
    return [ProvinceRead.model_validate(x) for x in cached]


@router.get("/provinces/{province_id}/cities", response_model=list[CityRead])
def geo_cities(province_id: str, db: Session = Depends(get_db)) -> list[CityRead]:
    key = f"geo:cities:{province_id}"

    def _load() -> list[dict]:
        repo = GeoRepository(db)
        return [
            CityRead.model_validate(c).model_dump(mode="json")
            for c in repo.list_cities(province_id)
        ]

    cached = _geo_cache.get_or_set(key, _load, ttl_seconds=600.0)
    return [CityRead.model_validate(x) for x in cached]


@router.get("/provinces-detail", response_model=list[ProvinceWithCitiesRead])
def geo_provinces_with_cities(
    db: Session = Depends(get_db),
) -> list[ProvinceWithCitiesRead]:
    def _load() -> list[dict]:
        repo = GeoRepository(db)
        out: list[dict] = []
        for p in repo.list_provinces():
            cities = [
                CityRead.model_validate(c).model_dump(mode="json")
                for c in repo.list_cities(p.id)
            ]
            row = ProvinceWithCitiesRead(
                id=p.id,
                name_fa=p.name_fa,
                sort_order=p.sort_order,
                created_at=p.created_at,
                cities=[CityRead.model_validate(x) for x in cities],
            )
            out.append(row.model_dump(mode="json"))
        return out

    cached = _geo_cache.get_or_set("geo:provinces_detail:v1", _load, ttl_seconds=600.0)
    return [ProvinceWithCitiesRead.model_validate(x) for x in cached]


@router.get("/nominatim/search")
def nominatim_search(
    q: str = Query(..., min_length=2, max_length=200),
    limit: int = Query(5, ge=1, le=10),
) -> list[dict[str, Any]]:
    """Proxy geocoding to Nominatim (cached). Respect OSM usage policy in production."""

    key = f"nominatim:search:{q.strip().lower()}:{limit}"

    def _load() -> list[dict[str, Any]]:
        r = httpx.get(
            f"{_nominatim_base()}/search",
            params={
                "q": q.strip(),
                "format": "json",
                "limit": limit,
                "addressdetails": 1,
            },
            headers=_nominatim_headers(),
            timeout=12.0,
        )
        r.raise_for_status()
        data = r.json()
        return data if isinstance(data, list) else []

    return _nominatim_cache.get_or_set(key, _load, ttl_seconds=120.0)


@router.get("/nominatim/reverse")
def nominatim_reverse(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
) -> dict[str, Any]:
    key = f"nominatim:reverse:{round(lat, 5)}:{round(lon, 5)}"

    def _load() -> dict[str, Any]:
        r = httpx.get(
            f"{_nominatim_base()}/reverse",
            params={
                "lat": lat,
                "lon": lon,
                "format": "json",
                "addressdetails": 1,
            },
            headers=_nominatim_headers(),
            timeout=12.0,
        )
        r.raise_for_status()
        data = r.json()
        return data if isinstance(data, dict) else {}

    return _nominatim_cache.get_or_set(key, _load, ttl_seconds=120.0)
