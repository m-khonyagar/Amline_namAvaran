"""مدل‌های ORM جریان قرارداد (New Flow / SwaggerHub 0.1.3) — برای Alembic و مهاجرت DB.

در اجرای فعلی دامنهٔ قرارداد در حافظه (`MemoryStore`) نگه‌داری می‌شود؛ این جداول
قرار است با `contract_flow_service` هم‌تراز مانده و در فاز اتصال Postgres پر شوند.
"""

from __future__ import annotations

import enum
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.sqlite import JSON as SQLITE_JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

# JSON: در SQLite همان JSON؛ در PostgreSQL نیز SQLAlchemy نوع مناسب می‌دهد
JsonBlob = JSON().with_variant(SQLITE_JSON(), "sqlite")


class ContractFlowPartyRole(str, enum.Enum):
    """نقش طرف — SSOT v2 + سازگاری با New Flow رهن/اجاره."""

    LANDLORD = "LANDLORD"
    TENANT = "TENANT"
    SELLER = "SELLER"
    BUYER = "BUYER"
    EXCHANGER_FIRST = "EXCHANGER_FIRST"
    EXCHANGER_SECOND = "EXCHANGER_SECOND"
    EXCHANGER_A = "EXCHANGER_A"
    EXCHANGER_B = "EXCHANGER_B"
    EXCHANGER_PRIMARY = "EXCHANGER_PRIMARY"
    EXCHANGER_COUNTER = "EXCHANGER_COUNTER"
    LAND_OWNER = "LAND_OWNER"
    CONTRACTOR = "CONTRACTOR"
    DEVELOPER = "DEVELOPER"
    LESSOR = "LESSOR"
    LESSEE = "LESSEE"


class ContractFlowPersonType(str, enum.Enum):
    NATURAL_PERSON = "NATURAL_PERSON"
    LEGAL_PERSON = "LEGAL_PERSON"


class ContractFlowSigningStatus(str, enum.Enum):
    PENDING = "PENDING"
    SENT = "SENT"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class ContractFlowRecord(Base):
    """قرارداد در جریان New Flow (شناسهٔ رشته‌ای مثل contract-001)."""

    __tablename__ = "contract_flow_contracts"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    contract_type: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="DRAFT")
    current_step: Mapped[str] = mapped_column(String(64), nullable=False)
    # زیرحالت و SLA (معماری پروداکشن قرارداد) — اختیاری تا هم‌ترازی با state machine هدف
    substate: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    sla_deadlines_json: Mapped[Optional[dict[str, Any]]] = mapped_column(
        JsonBlob, nullable=True
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    terms_json: Mapped[Optional[dict[str, Any]]] = mapped_column(
        JsonBlob, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    parties: Mapped[list["ContractFlowParty"]] = relationship(
        back_populates="contract", cascade="all, delete-orphan"
    )
    home_info: Mapped[Optional["HomeInfo"]] = relationship(
        back_populates="contract", uselist=False, cascade="all, delete-orphan"
    )
    dating_info: Mapped[Optional["DatingInfo"]] = relationship(
        back_populates="contract", uselist=False, cascade="all, delete-orphan"
    )
    mortgage_info: Mapped[Optional["MortgageInfo"]] = relationship(
        back_populates="contract", uselist=False, cascade="all, delete-orphan"
    )
    renting_info: Mapped[Optional["RentingInfo"]] = relationship(
        back_populates="contract", uselist=False, cascade="all, delete-orphan"
    )
    signings: Mapped[list["Signing"]] = relationship(
        back_populates="contract", cascade="all, delete-orphan"
    )
    witnesses: Mapped[list["Witness"]] = relationship(
        back_populates="contract", cascade="all, delete-orphan"
    )


class ContractFlowParty(Base):
    __tablename__ = "contract_flow_parties"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    contract_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("contract_flow_contracts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    party_role: Mapped[str] = mapped_column(String(32), nullable=False)
    person_type: Mapped[str] = mapped_column(String(32), nullable=False)
    detail: Mapped[Optional[dict[str, Any]]] = mapped_column(JsonBlob, nullable=True)

    contract: Mapped["ContractFlowRecord"] = relationship(back_populates="parties")


class HomeInfo(Base):
    __tablename__ = "contract_flow_home_infos"

    contract_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("contract_flow_contracts.id", ondelete="CASCADE"),
        primary_key=True,
    )
    payload: Mapped[Optional[dict[str, Any]]] = mapped_column(JsonBlob, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    contract: Mapped["ContractFlowRecord"] = relationship(back_populates="home_info")


class DatingInfo(Base):
    __tablename__ = "contract_flow_dating_infos"

    contract_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("contract_flow_contracts.id", ondelete="CASCADE"),
        primary_key=True,
    )
    payload: Mapped[Optional[dict[str, Any]]] = mapped_column(JsonBlob, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    contract: Mapped["ContractFlowRecord"] = relationship(back_populates="dating_info")


class MortgageInfo(Base):
    __tablename__ = "contract_flow_mortgage_infos"

    contract_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("contract_flow_contracts.id", ondelete="CASCADE"),
        primary_key=True,
    )
    payload: Mapped[Optional[dict[str, Any]]] = mapped_column(JsonBlob, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    contract: Mapped["ContractFlowRecord"] = relationship(
        back_populates="mortgage_info"
    )


class RentingInfo(Base):
    __tablename__ = "contract_flow_renting_infos"

    contract_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("contract_flow_contracts.id", ondelete="CASCADE"),
        primary_key=True,
    )
    payload: Mapped[Optional[dict[str, Any]]] = mapped_column(JsonBlob, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    contract: Mapped["ContractFlowRecord"] = relationship(back_populates="renting_info")


class Signing(Base):
    __tablename__ = "contract_flow_signings"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    contract_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("contract_flow_contracts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    party_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    signer_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    user_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default=ContractFlowSigningStatus.PENDING.value
    )
    meta: Mapped[Optional[dict[str, Any]]] = mapped_column(JsonBlob, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    contract: Mapped["ContractFlowRecord"] = relationship(back_populates="signings")


class Witness(Base):
    __tablename__ = "contract_flow_witnesses"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    contract_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("contract_flow_contracts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    mobile: Mapped[str] = mapped_column(String(32), nullable=False)
    national_code: Mapped[str] = mapped_column(String(32), nullable=False)
    witness_type: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    witness_name: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    verified_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    audit: Mapped[Optional[dict[str, Any]]] = mapped_column(JsonBlob, nullable=True)

    contract: Mapped["ContractFlowRecord"] = relationship(back_populates="witnesses")
