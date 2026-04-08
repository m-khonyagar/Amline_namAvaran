from __future__ import annotations

import datetime as dt

from pydantic import BaseModel


class PaymentCreate(BaseModel):
    contract_id: str
    amount: float
    payment_type: str = "rent"


class PaymentOut(BaseModel):
    id: str
    contract_id: str
    payer_id: str
    amount: float
    payment_type: str
    status: str
    paid_at: dt.datetime | None
