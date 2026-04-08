from __future__ import annotations

import datetime as dt
import enum
import uuid

from sqlalchemy import Date, DateTime, Enum as SAEnum, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ContractStatus(str, enum.Enum):
    draft = "draft"
    signed = "signed"
    active = "active"
    terminated = "terminated"
    expired = "expired"


class Contract(Base):
    __tablename__ = "contracts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    property_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("properties.id", ondelete="RESTRICT"), index=True
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    contract_type: Mapped[str] = mapped_column(String(64))
    deposit_amount: Mapped[float] = mapped_column(Numeric(14, 2))
    rent_amount: Mapped[float] = mapped_column(Numeric(14, 2))
    start_date: Mapped[dt.date] = mapped_column(Date)
    end_date: Mapped[dt.date] = mapped_column(Date)
    status: Mapped[ContractStatus] = mapped_column(
        SAEnum(
            ContractStatus,
            name="contractstatus",
            native_enum=False,
            values_callable=lambda o: [e.value for e in o],
            length=32,
        ),
        nullable=False,
        server_default=ContractStatus.draft.value,
        index=True,
    )
    tracking_code: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: dt.datetime.now(dt.timezone.utc),
    )
