from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.rbac_deps import require_permission
from app.db.session import get_db
from app.repositories.v1.p1_repositories import WalletRepository
from app.schemas.v1.wallet_v1 import WalletBalanceResponse, WalletLedgerPost

router = APIRouter(prefix="/wallets", tags=["wallets"])


@router.get("/{user_id}/balance", response_model=WalletBalanceResponse)
def wallet_balance(
    user_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("wallets:read")),
) -> WalletBalanceResponse:
    repo = WalletRepository(db)
    acct = repo.get_or_create_account(user_id)
    bal = repo.balance_cents(acct.id)
    db.commit()
    return WalletBalanceResponse(
        user_id=user_id, currency=acct.currency, balance_cents=bal
    )


@router.post("/{user_id}/ledger", status_code=201)
def wallet_post_ledger(
    user_id: str,
    body: WalletLedgerPost,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("wallets:write")),
) -> dict:
    repo = WalletRepository(db)
    acct = repo.get_or_create_account(user_id)
    if body.idempotency_key:
        ex = repo.find_by_idempotency(acct.id, body.idempotency_key)
        if ex:
            db.commit()
            return {"ok": True, "entry_id": ex.id, "idempotent_replay": True}
    repo.append_entry(
        acct,
        amount_cents=body.amount_cents,
        entry_type=body.entry_type,
        reference_type=body.reference_type,
        reference_id=body.reference_id,
        idempotency_key=body.idempotency_key,
        memo=body.memo,
    )
    db.commit()
    return {"ok": True}
