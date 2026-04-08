from __future__ import annotations

import datetime as dt

from pydantic import BaseModel


class WalletBalance(BaseModel):
    user_id: str
    balance: float


class WalletTxnOut(BaseModel):
    id: str
    wallet_id: str
    amount: float
    type: str
    reference_id: str | None
    created_at: dt.datetime


class DepositRequest(BaseModel):
    amount: float


class WithdrawRequest(BaseModel):
    amount: float
