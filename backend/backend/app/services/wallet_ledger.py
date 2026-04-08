from __future__ import annotations

from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.wallet import Wallet
from app.models.wallet_transaction import WalletTransaction


def _d(x: float | int | str | Decimal) -> Decimal:
    # Avoid float binary issues: always go through string when x is float.
    if isinstance(x, Decimal):
        return x
    return Decimal(str(x))


def lock_wallet(db: Session, *, user_id) -> Wallet:
    """Lock the wallet row for update inside the current transaction."""
    w = (
        db.query(Wallet)
        .filter(Wallet.user_id == user_id)
        .with_for_update()
        .one_or_none()
    )
    if w is None:
        # Create, then lock.
        w = Wallet(user_id=user_id, balance=0)
        db.add(w)
        db.flush()
        w = db.query(Wallet).filter(Wallet.user_id == user_id).with_for_update().one()
    return w


def add_txn(
    db: Session,
    *,
    wallet: Wallet,
    amount: float | int | str | Decimal,
    type: str,
    reference_id: str | None = None,
) -> WalletTransaction:
    t = WalletTransaction(wallet_id=wallet.id, amount=_d(amount), type=type, reference_id=reference_id)
    db.add(t)
    return t


def apply_delta(
    db: Session,
    *,
    user_id,
    delta: float | int | str | Decimal,
    type: str,
    reference_id: str | None = None,
) -> Wallet:
    w = lock_wallet(db, user_id=user_id)
    w.balance = _d(w.balance or 0) + _d(delta)
    add_txn(db, wallet=w, amount=delta, type=type, reference_id=reference_id)
    return w
