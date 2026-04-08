from __future__ import annotations

import datetime as dt
import secrets
import uuid

from sqlalchemy.orm import Session

from app.models.user import User
from app.models.wallet import Wallet


def ensure_user_wallet(db: Session, user_id: uuid.UUID) -> Wallet:
    w = db.query(Wallet).filter(Wallet.user_id == user_id).one_or_none()
    if w is None:
        w = Wallet(user_id=user_id, balance=0)
        db.add(w)
        db.flush()
    return w


def ensure_referral_code(db: Session, user: User) -> None:
    if user.referral_code:
        return

    # best-effort: low collision chance; still guarded by unique index.
    for _ in range(5):
        code = secrets.token_urlsafe(8)
        user.referral_code = code
        try:
            db.flush()
            return
        except Exception:
            db.rollback()
            continue

    # fallback: UUID-based
    user.referral_code = f"ref-{uuid.uuid4().hex[:12]}"
    db.flush()
