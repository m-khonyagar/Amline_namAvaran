"""SSOT Contract Domain: ssot_contracts, ssot_contract_drafts, ssot_contract_parties, ssot_signatures

Revision ID: h1i2j3k4l5m6
Revises: g1h2i3j4k5l7
Create Date: 2026-04-17

جداول جدید برای دامنه SSOT قرارداد (Step 2):
  - ssot_contracts         : قرارداد نهایی با visibility و advisor
  - ssot_contract_drafts   : پیش‌نویس جدا (expires در ۷ روز)
  - ssot_contract_parties  : طرف‌های قرارداد با نقش و وضعیت امضا
  - ssot_signatures        : OTP و امضای هر طرف (قوانین: ۵ دقیقه انقضا، ۳ تلاش، ۱۵ دقیقه قفل)
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "h1i2j3k4l5m6"
down_revision: Union[str, None] = "g1h2i3j4k5l7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── ssot_contracts ────────────────────────────────────────────
    op.create_table(
        "ssot_contracts",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("contract_number", sa.String(length=64), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.Column(
            "visibility",
            sa.String(length=32),
            nullable=False,
            server_default="people_only",
        ),
        sa.Column("creator_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("advisor_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("tracking_code", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_ssot_contracts_status", "ssot_contracts", ["status"])
    op.create_index("ix_ssot_contracts_visibility", "ssot_contracts", ["visibility"])
    op.create_index("ix_ssot_contracts_creator_id", "ssot_contracts", ["creator_id"])
    op.create_index("ix_ssot_contracts_advisor_id", "ssot_contracts", ["advisor_id"])
    op.create_index("ix_ssot_contracts_tracking_code", "ssot_contracts", ["tracking_code"], unique=True)
    op.create_index(
        "ix_ssot_contracts_creator_visibility",
        "ssot_contracts",
        ["creator_id", "visibility"],
    )
    op.create_unique_constraint("uq_ssot_contracts_contract_number", "ssot_contracts", ["contract_number"])

    # ── ssot_contract_drafts ──────────────────────────────────────
    op.create_table(
        "ssot_contract_drafts",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column(
            "contract_id",
            sa.Uuid(),
            sa.ForeignKey("ssot_contracts.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("step", sa.String(length=64), nullable=False, server_default="init"),
        sa.Column("data", sa.JSON(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_ssot_contract_drafts_contract_id", "ssot_contract_drafts", ["contract_id"])
    op.create_index("ix_ssot_contract_drafts_user_id", "ssot_contract_drafts", ["user_id"])

    # ── ssot_contract_parties ─────────────────────────────────────
    op.create_table(
        "ssot_contract_parties",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column(
            "contract_id",
            sa.Uuid(),
            sa.ForeignKey("ssot_contracts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False, server_default="principal"),
        sa.Column(
            "signature_status",
            sa.String(length=32),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("invited_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("signed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_ssot_contract_parties_contract_id", "ssot_contract_parties", ["contract_id"])
    op.create_index("ix_ssot_contract_parties_user_id", "ssot_contract_parties", ["user_id"])
    op.create_index("ix_ssot_contract_parties_signature_status", "ssot_contract_parties", ["signature_status"])
    op.create_index(
        "ix_ssot_contract_parties_contract_user",
        "ssot_contract_parties",
        ["contract_id", "user_id"],
    )

    # ── ssot_signatures ───────────────────────────────────────────
    op.create_table(
        "ssot_signatures",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column(
            "contract_party_id",
            sa.Uuid(),
            sa.ForeignKey("ssot_contract_parties.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("otp_code", sa.String(length=16), nullable=True),
        sa.Column("otp_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("signature_hash", sa.String(length=128), nullable=True),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_ssot_signatures_contract_party_id", "ssot_signatures", ["contract_party_id"])


def downgrade() -> None:
    op.drop_index("ix_ssot_signatures_contract_party_id", table_name="ssot_signatures")
    op.drop_table("ssot_signatures")

    op.drop_index("ix_ssot_contract_parties_contract_user", table_name="ssot_contract_parties")
    op.drop_index("ix_ssot_contract_parties_signature_status", table_name="ssot_contract_parties")
    op.drop_index("ix_ssot_contract_parties_user_id", table_name="ssot_contract_parties")
    op.drop_index("ix_ssot_contract_parties_contract_id", table_name="ssot_contract_parties")
    op.drop_table("ssot_contract_parties")

    op.drop_index("ix_ssot_contract_drafts_user_id", table_name="ssot_contract_drafts")
    op.drop_index("ix_ssot_contract_drafts_contract_id", table_name="ssot_contract_drafts")
    op.drop_table("ssot_contract_drafts")

    op.drop_unique_constraint("uq_ssot_contracts_contract_number", "ssot_contracts")
    op.drop_index("ix_ssot_contracts_creator_visibility", table_name="ssot_contracts")
    op.drop_index("ix_ssot_contracts_tracking_code", table_name="ssot_contracts")
    op.drop_index("ix_ssot_contracts_advisor_id", table_name="ssot_contracts")
    op.drop_index("ix_ssot_contracts_creator_id", table_name="ssot_contracts")
    op.drop_index("ix_ssot_contracts_visibility", table_name="ssot_contracts")
    op.drop_index("ix_ssot_contracts_status", table_name="ssot_contracts")
    op.drop_table("ssot_contracts")
