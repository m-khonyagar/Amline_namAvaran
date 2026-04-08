from __future__ import annotations

import datetime as dt
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.wallet_transaction import WalletTransaction
from app.models.user import User
from app.schemas.wallet import DepositRequest, WalletBalance, WalletTxnOut, WithdrawRequest
from app.services.wallet_ledger import apply_delta, lock_wallet

router = APIRouter()


def _txn_out(t: WalletTransaction) -> WalletTxnOut:
    return WalletTxnOut(
        id=str(t.id),
        wallet_id=str(t.wallet_id),
        amount=float(t.amount),
        type=t.type,
        reference_id=t.reference_id,
        created_at=t.created_at,
    )


@router.get("/balance", response_model=WalletBalance)
def balance(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    w = lock_wallet(db, user_id=user.id)
    db.commit()
    return WalletBalance(user_id=str(user.id), balance=float(w.balance))


@router.get("/transactions", response_model=list[WalletTxnOut])
def transactions(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    w = lock_wallet(db, user_id=user.id)
    db.commit()

    items = (
        db.query(WalletTransaction)
        .filter(WalletTransaction.wallet_id == w.id)
        .order_by(WalletTransaction.created_at.desc())
        .all()
    )
    return [_txn_out(t) for t in items]


@router.post("/deposit")
def deposit(req: DepositRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Dev-only: makes local testing easy.
    if settings.env != "dev":
        raise HTTPException(status_code=404, detail="not_found")

    if req.amount <= 0:
        raise HTTPException(status_code=422, detail="invalid_amount")

    w = apply_delta(db, user_id=user.id, delta=req.amount, type="deposit")
    db.commit()
    return {"ok": True, "balance": float(w.balance)}


@router.post("/withdraw")
def withdraw(req: WithdrawRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if req.amount <= 0:
        raise HTTPException(status_code=422, detail="invalid_amount")

    w = lock_wallet(db, user_id=user.id)
    if Decimal(w.balance or 0) < Decimal(str(req.amount)):
        raise HTTPException(status_code=400, detail="insufficient_balance")

    w = apply_delta(db, user_id=user.id, delta=-req.amount, type="withdraw")
    db.commit()
    return {"ok": True, "balance": float(w.balance)}
