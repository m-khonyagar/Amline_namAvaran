from __future__ import annotations

import datetime as dt
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.ids import parse_uuid
from app.db.session import get_db
from app.models.contract import Contract, ContractStatus
from app.models.payment import Payment, PaymentStatus
from app.models.property import Property
from app.models.user import User
from app.schemas.analytics import (
    MarketRentSummaryOut,
    PropertyPerformanceOut,
    RentEstimateIn,
    RentEstimateOut,
)

router = APIRouter()


def _as_float(v) -> float | None:
    if v is None:
        return None
    if isinstance(v, Decimal):
        return float(v)
    try:
        return float(v)
    except Exception:
        return None


def _percentile(sorted_vals: list[float], p: float) -> float | None:
    if not sorted_vals:
        return None
    if p <= 0:
        return sorted_vals[0]
    if p >= 1:
        return sorted_vals[-1]
    k = (len(sorted_vals) - 1) * p
    f = int(k)
    c = min(f + 1, len(sorted_vals) - 1)
    if f == c:
        return sorted_vals[f]
    d = k - f
    return sorted_vals[f] * (1 - d) + sorted_vals[c] * d


def _is_staff(user: User) -> bool:
    role_value = user.role.value if hasattr(user.role, "value") else str(user.role)
    return role_value in {"Admin", "Moderator"}


@router.get("/market/rent-summary", response_model=MarketRentSummaryOut)
def market_rent_summary(
    city: str,
    property_type: str | None = None,
    rooms: int | None = None,
    area: float | None = None,
    window_days: int = 365,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Any authenticated user can access aggregated market numbers.
    if not city or len(city.strip()) < 2:
        raise HTTPException(status_code=422, detail="city_required")

    window_days = max(7, min(3650, int(window_days)))
    since = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=window_days)

    q = (
        db.query(Contract.rent_amount, Contract.deposit_amount, Contract.created_at, Property.area)
        .join(Property, Property.id == Contract.property_id)
        .filter(Property.city == city.strip())
        .filter(Contract.status != ContractStatus.draft)
        .filter(Contract.created_at >= since)
    )

    if property_type:
        q = q.filter(Property.property_type == property_type.strip())
    if rooms is not None:
        q = q.filter(Property.rooms == int(rooms))
    if area is not None:
        # +-20% band to keep it useful while not too narrow.
        a = float(area)
        lo = max(0.0, a * 0.8)
        hi = a * 1.2
        q = q.filter(Property.area >= lo).filter(Property.area <= hi)

    rows = q.order_by(Contract.created_at.desc()).limit(5000).all()

    rents: list[float] = []
    deposits: list[float] = []
    rps: list[float] = []
    last_ts: dt.datetime | None = None

    for rent_amount, deposit_amount, created_at, prop_area in rows:
        r = _as_float(rent_amount)
        d = _as_float(deposit_amount)
        a = _as_float(prop_area)

        if last_ts is None and created_at is not None:
            last_ts = created_at

        if r is not None:
            rents.append(r)
            if a and a > 0:
                rps.append(r / a)
        if d is not None:
            deposits.append(d)

    rents.sort()
    deposits.sort()
    rps.sort()

    def _avg(vals: list[float]) -> float | None:
        return (sum(vals) / len(vals)) if vals else None

    return MarketRentSummaryOut(
        city=city.strip(),
        property_type=property_type.strip() if property_type else None,
        rooms=int(rooms) if rooms is not None else None,
        area=float(area) if area is not None else None,
        window_days=window_days,
        sample_size=len(rents),
        avg_rent_amount=_avg(rents),
        median_rent_amount=_percentile(rents, 0.5),
        p25_rent_amount=_percentile(rents, 0.25),
        p75_rent_amount=_percentile(rents, 0.75),
        avg_deposit_amount=_avg(deposits),
        median_deposit_amount=_percentile(deposits, 0.5),
        avg_rent_per_sqm=_avg(rps),
        median_rent_per_sqm=_percentile(rps, 0.5),
        last_contract_created_at=last_ts,
    )


@router.post("/rent-estimate", response_model=RentEstimateOut)
def rent_estimate(payload: RentEstimateIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Any authenticated user can request an estimate.
    city = payload.city.strip()
    property_type = payload.property_type.strip() if payload.property_type else None

    # Reuse the summary sampling logic (inlined) to keep dependencies small.
    since = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=365)
    q = (
        db.query(Contract.rent_amount, Property.area)
        .join(Property, Property.id == Contract.property_id)
        .filter(Property.city == city)
        .filter(Contract.status != ContractStatus.draft)
        .filter(Contract.created_at >= since)
    )

    if property_type:
        q = q.filter(Property.property_type == property_type)
    if payload.rooms is not None:
        q = q.filter(Property.rooms == int(payload.rooms))

    rows = q.order_by(Contract.created_at.desc()).limit(3000).all()

    rps: list[float] = []
    for rent_amount, prop_area in rows:
        r = _as_float(rent_amount)
        a = _as_float(prop_area)
        if r is None or not a or a <= 0:
            continue
        rps.append(r / a)

    rps.sort()

    sample_size = len(rps)
    if sample_size > 0:
        per_sqm = _percentile(rps, 0.5) or (sum(rps) / sample_size)
        method = "median_rent_per_sqm_last_365d"
    else:
        # Fallback baseline (very rough) so endpoint stays useful even with empty DB.
        per_sqm = 1_000_000.0
        method = "fallback_baseline"

    est = float(per_sqm) * float(payload.area)

    # Mild heuristic adjustments.
    if payload.rooms is not None:
        factor = 1.0 + 0.05 * (int(payload.rooms) - 2)
        factor = max(0.85, min(1.2, factor))
        est *= factor
    if payload.year_built is not None:
        # Treat year_built as solar hijri; newer tends to be a bit higher.
        y = int(payload.year_built)
        factor = 1.0 + max(-0.1, min(0.1, (y - 1390) / 200.0))
        est *= factor

    # Confidence based on sample size.
    confidence = min(0.9, sample_size / 60.0) if sample_size > 0 else 0.15

    # Provide a practical range.
    spread = 0.18 if confidence >= 0.6 else 0.28
    low = est * (1 - spread)
    high = est * (1 + spread)

    return RentEstimateOut(
        city=city,
        property_type=property_type,
        rooms=payload.rooms,
        area=payload.area,
        year_built=payload.year_built,
        estimate_rent_amount=round(est, 2),
        low_rent_amount=round(low, 2),
        high_rent_amount=round(high, 2),
        sample_size=sample_size,
        confidence=round(float(confidence), 3),
        method=method,
    )


@router.get("/properties/{property_id}/performance", response_model=PropertyPerformanceOut)
def property_performance(property_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        pid = parse_uuid(property_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_property_id")

    prop = db.get(Property, pid)
    if not prop:
        raise HTTPException(status_code=404, detail="property_not_found")

    if (not _is_staff(user)) and (user.id != prop.owner_id):
        raise HTTPException(status_code=403, detail="forbidden")

    total_contracts = (
        db.query(func.count(Contract.id))
        .filter(Contract.property_id == pid)
        .filter(Contract.status != ContractStatus.draft)
        .scalar()
        or 0
    )

    active_contracts = (
        db.query(func.count(Contract.id))
        .filter(Contract.property_id == pid)
        .filter(Contract.status == ContractStatus.active)
        .scalar()
        or 0
    )

    total_rent_collected = (
        db.query(func.coalesce(func.sum(Payment.amount), 0))
        .join(Contract, Contract.id == Payment.contract_id)
        .filter(Contract.property_id == pid)
        .filter(Payment.payment_type == "rent")
        .filter(Payment.status == PaymentStatus.completed)
        .scalar()
        or 0
    )

    last_rent_payment_at = (
        db.query(func.max(Payment.paid_at))
        .join(Contract, Contract.id == Payment.contract_id)
        .filter(Contract.property_id == pid)
        .filter(Payment.payment_type == "rent")
        .filter(Payment.status == PaymentStatus.completed)
        .scalar()
    )

    return PropertyPerformanceOut(
        property_id=str(prop.id),
        city=prop.city,
        property_type=prop.property_type,
        owner_id=str(prop.owner_id),
        total_contracts=int(total_contracts),
        active_contracts=int(active_contracts),
        total_rent_collected=_as_float(total_rent_collected) or 0.0,
        last_rent_payment_at=last_rent_payment_at,
    )
