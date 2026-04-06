from __future__ import annotations

import datetime as dt

from pydantic import BaseModel


class ContractCreate(BaseModel):
    property_id: str
    tenant_id: str
    contract_type: str
    deposit_amount: float
    rent_amount: float
    start_date: dt.date
    end_date: dt.date


class ContractOut(BaseModel):
    id: str
    property_id: str
    owner_id: str
    tenant_id: str
    contract_type: str
    deposit_amount: float
    rent_amount: float
    start_date: dt.date
    end_date: dt.date
    status: str
    tracking_code: str
    created_at: dt.datetime


class SignRequest(BaseModel):
    signature_method: str = "otp"
