from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field

from app.models.wallet import LedgerEntryType


class WalletBalanceResponse(BaseModel):
    user_id: str
    currency: str
    balance_cents: int


class WalletLedgerPost(BaseModel):
    amount_cents: int = Field(..., gt=0)
    entry_type: LedgerEntryType
    reference_type: str = "manual"
    reference_id: Optional[str] = None
    idempotency_key: Optional[str] = None
    memo: Optional[str] = None
