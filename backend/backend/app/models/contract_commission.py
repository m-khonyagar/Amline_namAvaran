"""کمیسیون قرارداد — SSOT v2 §۳.۴."""

from __future__ import annotations

import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ContractCommissionType(str, enum.Enum):
    RENT_COMMISSION = "RENT_COMMISSION"
    SALE_COMMISSION = "SALE_COMMISSION"
    EXCHANGE_COMMISSION = "EXCHANGE_COMMISSION"
    CONSTRUCTION_COMMISSION = "CONSTRUCTION_COMMISSION"


class CommissionPaidBy(str, enum.Enum):
    PARTY_A = "PARTY_A"
    PARTY_B = "PARTY_B"
    BOTH = "BOTH"
    CONTRACT_CREATOR = "CONTRACT_CREATOR"


class CommissionRecordStatus(str, enum.Enum):
    PENDING = "PENDING"
    PAID = "PAID"


class CommissionPaymentMethod(str, enum.Enum):
    SELF = "SELF"
    AGENT = "AGENT"
    ADMIN = "ADMIN"


class ContractCommission(Base):
    __tablename__ = "contract_commissions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    contract_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    commission_type: Mapped[ContractCommissionType] = mapped_column(
        SAEnum(
            ContractCommissionType,
            values_callable=lambda x: [e.value for e in x],
            native_enum=False,
            length=32,
        ),
        nullable=False,
    )
    paid_by: Mapped[CommissionPaidBy] = mapped_column(
        SAEnum(
            CommissionPaidBy,
            values_callable=lambda x: [e.value for e in x],
            native_enum=False,
            length=32,
        ),
        nullable=False,
    )
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[CommissionRecordStatus] = mapped_column(
        SAEnum(
            CommissionRecordStatus,
            values_callable=lambda x: [e.value for e in x],
            native_enum=False,
            length=16,
        ),
        nullable=False,
        default=CommissionRecordStatus.PENDING,
    )
    payment_method: Mapped[CommissionPaymentMethod | None] = mapped_column(
        SAEnum(
            CommissionPaymentMethod,
            values_callable=lambda x: [e.value for e in x],
            native_enum=False,
            length=16,
        ),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
