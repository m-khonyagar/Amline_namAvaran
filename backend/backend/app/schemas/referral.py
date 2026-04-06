from __future__ import annotations

import datetime as dt

from pydantic import BaseModel


class ReferralOut(BaseModel):
    id: str
    referrer_id: str
    referred_user_id: str
    reward_amount: float
    created_at: dt.datetime


class InviteResponse(BaseModel):
    referral_code: str
