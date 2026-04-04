"""contract production: flow SLA fields, payment contract link, disputes, ledger hold, reversal link

Revision ID: e1f2a3b4c5d6
Revises: d4e5f6a7b8c9
Create Date: 2026-04-04

توجه: جدول `contract_flow_contracts` ممکن است فقط از طریق `create_all` در dev وجود داشته باشد.
در `upgrade` اگر جدول نباشد، ستون‌های flow نادیده گرفته می‌شوند تا زنجیره Alembic روی DBهای قدیمی نشکند.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "e1f2a3b4c5d6"
down_revision: Union[str, None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = inspect(conn)
    table_names = set(insp.get_table_names())

    if "contract_flow_contracts" in table_names:
        op.add_column(
            "contract_flow_contracts",
            sa.Column("substate", sa.String(length=64), nullable=True),
        )
        op.add_column(
            "contract_flow_contracts",
            sa.Column("sla_deadlines_json", sa.JSON(), nullable=True),
        )
        op.add_column(
            "contract_flow_contracts",
            sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        )

    op.add_column(
        "payment_intents",
        sa.Column("contract_id", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "payment_intents",
        sa.Column("party_id", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "payment_intents",
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        op.f("ix_payment_intents_contract_id"),
        "payment_intents",
        ["contract_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_payment_intents_party_id"),
        "payment_intents",
        ["party_id"],
        unique=False,
    )

    op.add_column(
        "wallet_ledger_entries",
        sa.Column("reversal_of_entry_id", sa.String(length=36), nullable=True),
    )
    op.create_foreign_key(
        "fk_wallet_ledger_reversal",
        "wallet_ledger_entries",
        "wallet_ledger_entries",
        ["reversal_of_entry_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        op.f("ix_wallet_ledger_entries_reversal_of_entry_id"),
        "wallet_ledger_entries",
        ["reversal_of_entry_id"],
        unique=False,
    )

    op.create_table(
        "contract_disputes",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("contract_id", sa.String(length=64), nullable=False),
        sa.Column("raised_by_party_id", sa.String(length=64), nullable=True),
        sa.Column("category", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("resolution_type", sa.String(length=32), nullable=True),
        sa.Column("resolver_user_id", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_contract_disputes_contract_id"),
        "contract_disputes",
        ["contract_id"],
        unique=False,
    )

    op.create_table(
        "contract_dispute_evidence",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("dispute_id", sa.String(length=36), nullable=False),
        sa.Column("type", sa.String(length=32), nullable=False),
        sa.Column("storage_uri", sa.Text(), nullable=False),
        sa.Column("hash_sha256", sa.String(length=64), nullable=True),
        sa.Column("submitted_by", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["dispute_id"],
            ["contract_disputes.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_contract_dispute_evidence_dispute_id"),
        "contract_dispute_evidence",
        ["dispute_id"],
        unique=False,
    )

    op.create_table(
        "ledger_holds",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("wallet_or_ledger_account", sa.String(length=64), nullable=False),
        sa.Column("amount_cents", sa.BigInteger(), nullable=False),
        sa.Column("currency", sa.String(length=8), nullable=False),
        sa.Column("dispute_id", sa.String(length=36), nullable=True),
        sa.Column("reason", sa.String(length=256), nullable=True),
        sa.Column("released_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["dispute_id"],
            ["contract_disputes.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_ledger_holds_dispute_id"),
        "ledger_holds",
        ["dispute_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_ledger_holds_dispute_id"), table_name="ledger_holds")
    op.drop_table("ledger_holds")
    op.drop_index(
        op.f("ix_contract_dispute_evidence_dispute_id"),
        table_name="contract_dispute_evidence",
    )
    op.drop_table("contract_dispute_evidence")
    op.drop_index(op.f("ix_contract_disputes_contract_id"), table_name="contract_disputes")
    op.drop_table("contract_disputes")

    op.drop_index(
        op.f("ix_wallet_ledger_entries_reversal_of_entry_id"),
        table_name="wallet_ledger_entries",
    )
    op.drop_constraint("fk_wallet_ledger_reversal", "wallet_ledger_entries", type_="foreignkey")
    op.drop_column("wallet_ledger_entries", "reversal_of_entry_id")

    op.drop_index(op.f("ix_payment_intents_party_id"), table_name="payment_intents")
    op.drop_index(op.f("ix_payment_intents_contract_id"), table_name="payment_intents")
    op.drop_column("payment_intents", "paid_at")
    op.drop_column("payment_intents", "party_id")
    op.drop_column("payment_intents", "contract_id")

    conn = op.get_bind()
    insp = inspect(conn)
    if "contract_flow_contracts" in insp.get_table_names():
        op.drop_column("contract_flow_contracts", "version")
        op.drop_column("contract_flow_contracts", "sla_deadlines_json")
        op.drop_column("contract_flow_contracts", "substate")
