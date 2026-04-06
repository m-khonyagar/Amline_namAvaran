from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.referral import Referral
from app.models.user import User
from app.schemas.referral import InviteResponse, ReferralOut
from app.services.users_bootstrap import ensure_referral_code

router = APIRouter()


def _to_out(r: Referral) -> ReferralOut:
    return ReferralOut(
        id=str(r.id),
        referrer_id=str(r.referrer_id),
        referred_user_id=str(r.referred_user_id),
        reward_amount=float(r.reward_amount),
        created_at=r.created_at,
    )


@router.get("", response_model=list[ReferralOut])
def list_referrals(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(Referral).filter(Referral.referrer_id == user.id).order_by(Referral.created_at.desc()).all()
    return [_to_out(x) for x in items]


@router.post("/invite", response_model=InviteResponse)
def invite(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_user = db.get(User, user.id)
    ensure_referral_code(db, db_user)
    db.commit()
    return InviteResponse(referral_code=db_user.referral_code)
