from __future__ import annotations

import datetime as dt
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.ids import parse_uuid
from app.db.session import get_db
from app.models.contract import Contract
from app.models.payment import Payment, PaymentStatus
from app.models.user import User
from app.schemas.payment import PaymentCreate, PaymentOut
from app.services.tenant_score import apply_tenant_score_delta
from app.services.wallet_ledger import apply_delta, lock_wallet

router = APIRouter()


def _to_out(p: Payment) -> PaymentOut:
    return PaymentOut(
        id=str(p.id),
        contract_id=str(p.contract_id),
        payer_id=str(p.payer_id),
        amount=float(p.amount),
        payment_type=p.payment_type,
        status=str(p.status.value if hasattr(p.status, "value") else p.status),
        paid_at=p.paid_at,
    )


@router.post("/pay-rent", response_model=PaymentOut)
def pay_rent(
    req: PaymentCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if req.amount <= 0:
        raise HTTPException(status_code=422, detail="invalid_amount")

    try:
        cid = parse_uuid(req.contract_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_contract_id")

    c = db.get(Contract, cid)
    if not c:
        raise HTTPException(status_code=404, detail="contract_not_found")

    # Only parties can pay.
    if user.id not in {c.owner_id, c.tenant_id}:
        raise HTTPException(status_code=403, detail="forbidden")

    # MVP: pay from wallet. Lock wallet row to prevent race conditions.
    w = lock_wallet(db, user_id=user.id)
    if Decimal(w.balance or 0) < Decimal(str(req.amount)):
        raise HTTPException(status_code=400, detail="insufficient_wallet_balance")

    p = Payment(
        contract_id=c.id,
        payer_id=user.id,
        amount=req.amount,
        payment_type=req.payment_type,
        status=PaymentStatus.completed,
        paid_at=dt.datetime.now(dt.timezone.utc),
    )
    db.add(p)
    db.flush()

    apply_delta(db, user_id=user.id, delta=-req.amount, type="rent_payment", reference_id=str(p.id))

    # Phase 3: naive tenant score increment on successful payment
    apply_tenant_score_delta(db, user=user, delta=1, reason="payment_completed", reference_id=str(p.id))

    db.commit()
    db.refresh(p)
    return _to_out(p)


@router.get("/history", response_model=list[PaymentOut])
def history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = (
        db.query(Payment)
        .filter(Payment.payer_id == user.id)
        .order_by(Payment.paid_at.desc().nullslast())
        .all()
    )
    return [_to_out(p) for p in items]


@router.post("/refund")
def refund_stub(_: User = Depends(get_current_user)):
    # TODO: implement real refund logic
    return {"ok": True}
