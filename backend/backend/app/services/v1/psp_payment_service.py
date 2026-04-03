"""Finalize payment intent + wallet credit (idempotent)."""

from __future__ import annotations

import json
import os
from typing import Optional

from sqlalchemy.orm import Session

from app.models.payment import PaymentIntent, PaymentIntentStatus
from app.models.wallet import LedgerEntryType
from app.repositories.v1.p1_repositories import (
    AuditDbRepository,
    PaymentRepository,
    WalletRepository,
)


def apply_payment_gateway_result(
    db: Session,
    row: PaymentIntent,
    *,
    success: bool,
    psp_reference: Optional[str],
    raw: Optional[str],
    audit_action: str = "payment.callback",
) -> PaymentIntent:
    """
    Idempotent completion: only PENDING rows transition; ledger credit uses idempotency key.
    """
    pay = PaymentRepository(db)
    if row.status != PaymentIntentStatus.PENDING:
        return row
    pay.mark_callback(row, success, psp_reference, raw)
    if success:
        wal = WalletRepository(db)
        acct = wal.get_or_create_account(row.user_id)
        wal.append_entry(
            acct,
            amount_cents=row.amount_cents,
            entry_type=LedgerEntryType.CREDIT,
            reference_type="payment_intent",
            reference_id=row.id,
            idempotency_key=f"payment-intent-{row.id}",
            memo="PSP verify credit",
        )
    AuditDbRepository(db).write(
        user_id=os.getenv("AMLINE_AUDIT_USER_ID", "system"),
        action=audit_action,
        entity="payment_intent",
        metadata={
            "intent_id": row.id,
            "success": success,
            "psp_reference": psp_reference,
        },
    )
    db.commit()
    db.refresh(row)
    return row


def safe_json_dumps(obj: object) -> str:
    try:
        return json.dumps(obj, ensure_ascii=False, default=str)
    except (TypeError, ValueError):
        return str(obj)
