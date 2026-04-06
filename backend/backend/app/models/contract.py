from __future__ import annotations

import datetime as dt
import enum
import secrets
import uuid

from sqlalchemy import Date, Enum, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampCreatedMixin, UUIDPkMixin


class ContractStatus(str, enum.Enum):
    draft = "draft"
    signed = "signed"
    active = "active"
    terminated = "terminated"
    expired = "expired"


def _tracking_code() -> str:
    return secrets.token_hex(6)


class Contract(UUIDPkMixin, TimestampCreatedMixin, Base):
    __tablename__ = "contracts"

    property_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("properties.id", ondelete="RESTRICT"), index=True)
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)

    contract_type: Mapped[str] = mapped_column(String(64))
    deposit_amount: Mapped[float] = mapped_column(Numeric(14, 2))
    rent_amount: Mapped[float] = mapped_column(Numeric(14, 2))

    start_date: Mapped[dt.date] = mapped_column(Date)
    end_date: Mapped[dt.date] = mapped_column(Date)

    status: Mapped[ContractStatus] = mapped_column(Enum(ContractStatus), default=ContractStatus.draft, index=True)
    tracking_code: Mapped[str] = mapped_column(String(32), unique=True, index=True, default=_tracking_code)
