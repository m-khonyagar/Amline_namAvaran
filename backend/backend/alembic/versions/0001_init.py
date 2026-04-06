"""init

Revision ID: 0001_init
Revises:
Create Date: 2026-03-09
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0001_init"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("mobile", sa.String(length=32), nullable=False),
        sa.Column("national_code", sa.String(length=16), nullable=True),
        sa.Column("name", sa.String(length=128), nullable=True),
        sa.Column(
            "role",
            sa.Enum("User", "Agent", "Admin", "Moderator", name="userrole"),
            nullable=False,
            server_default="User",
        ),
        sa.Column("tenant_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("referral_code", sa.String(length=32), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_mobile", "users", ["mobile"], unique=True)
    op.create_index("ix_users_national_code", "users", ["national_code"], unique=False)
    op.create_index("ix_users_referral_code", "users", ["referral_code"], unique=True)

    op.create_table(
        "properties",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("owner_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("city", sa.String(length=64), nullable=False),
        sa.Column("address", sa.String(length=256), nullable=False),
        sa.Column("area", sa.Numeric(10, 2), nullable=False),
        sa.Column("rooms", sa.Integer(), nullable=False),
        sa.Column("year_built", sa.Integer(), nullable=True),
        sa.Column("property_type", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_properties_owner_id", "properties", ["owner_id"], unique=False)

    op.create_table(
        "contracts",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column(
            "property_id",
            sa.Uuid(),
            sa.ForeignKey("properties.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("owner_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("tenant_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("contract_type", sa.String(length=64), nullable=False),
        sa.Column("deposit_amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("rent_amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("draft", "signed", "active", "terminated", "expired", name="contractstatus"),
            nullable=False,
            server_default="draft",
        ),
        sa.Column("tracking_code", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_contracts_property_id", "contracts", ["property_id"], unique=False)
    op.create_index("ix_contracts_owner_id", "contracts", ["owner_id"], unique=False)
    op.create_index("ix_contracts_tenant_id", "contracts", ["tenant_id"], unique=False)
    op.create_index("ix_contracts_status", "contracts", ["status"], unique=False)
    op.create_index("ix_contracts_tracking_code", "contracts", ["tracking_code"], unique=True)

    op.create_table(
        "contract_signatures",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("contract_id", sa.Uuid(), sa.ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("signature_method", sa.String(length=32), nullable=False),
        sa.Column("signed_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_contract_signatures_contract_id", "contract_signatures", ["contract_id"], unique=False)
    op.create_index("ix_contract_signatures_user_id", "contract_signatures", ["user_id"], unique=False)
    op.create_index("ix_contract_signatures_signed_at", "contract_signatures", ["signed_at"], unique=False)

    op.create_table(
        "documents",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("contract_id", sa.Uuid(), sa.ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("html_s3_key", sa.String(length=512), nullable=True),
        sa.Column("pdf_s3_key", sa.String(length=512), nullable=True),
        sa.Column("html_local_path", sa.String(length=512), nullable=True),
        sa.Column("pdf_local_path", sa.String(length=512), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_documents_contract_id", "documents", ["contract_id"], unique=False)

    op.create_table(
        "payments",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("contract_id", sa.Uuid(), sa.ForeignKey("contracts.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("payer_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("payment_type", sa.String(length=32), nullable=False),
        sa.Column(
            "status",
            sa.Enum("pending", "completed", "failed", "refunded", name="paymentstatus"),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_payments_contract_id", "payments", ["contract_id"], unique=False)
    op.create_index("ix_payments_payer_id", "payments", ["payer_id"], unique=False)
    op.create_index("ix_payments_status", "payments", ["status"], unique=False)
    op.create_index("ix_payments_paid_at", "payments", ["paid_at"], unique=False)

    op.create_table(
        "wallets",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("balance", sa.Numeric(14, 2), nullable=False, server_default="0"),
    )
    op.create_index("ix_wallets_user_id", "wallets", ["user_id"], unique=True)

    op.create_table(
        "wallet_transactions",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("wallet_id", sa.Uuid(), sa.ForeignKey("wallets.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("type", sa.String(length=32), nullable=False),
        sa.Column("reference_id", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_wallet_transactions_wallet_id", "wallet_transactions", ["wallet_id"], unique=False)
    op.create_index("ix_wallet_transactions_created_at", "wallet_transactions", ["created_at"], unique=False)

    op.create_table(
        "referrals",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("referrer_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("referred_user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("reward_amount", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_referrals_referrer_id", "referrals", ["referrer_id"], unique=False)
    op.create_index("ix_referrals_referred_user_id", "referrals", ["referred_user_id"], unique=False)

    op.create_table(
        "campaigns",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("type", sa.String(length=64), nullable=False),
        sa.Column("discount_percent", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
    )
    op.create_index("ix_campaigns_status", "campaigns", ["status"], unique=False)

    op.create_table(
        "notifications",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("type", sa.String(length=64), nullable=False),
        sa.Column("channel", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"], unique=False)
    op.create_index("ix_notifications_status", "notifications", ["status"], unique=False)
    op.create_index("ix_notifications_created_at", "notifications", ["created_at"], unique=False)

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("action", sa.String(length=128), nullable=False),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"], unique=False)
    op.create_index("ix_audit_logs_timestamp", "audit_logs", ["timestamp"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_audit_logs_timestamp", table_name="audit_logs")
    op.drop_index("ix_audit_logs_user_id", table_name="audit_logs")
    op.drop_table("audit_logs")

    op.drop_index("ix_notifications_created_at", table_name="notifications")
    op.drop_index("ix_notifications_status", table_name="notifications")
    op.drop_index("ix_notifications_user_id", table_name="notifications")
    op.drop_table("notifications")

    op.drop_index("ix_campaigns_status", table_name="campaigns")
    op.drop_table("campaigns")

    op.drop_index("ix_referrals_referred_user_id", table_name="referrals")
    op.drop_index("ix_referrals_referrer_id", table_name="referrals")
    op.drop_table("referrals")

    op.drop_index("ix_wallet_transactions_created_at", table_name="wallet_transactions")
    op.drop_index("ix_wallet_transactions_wallet_id", table_name="wallet_transactions")
    op.drop_table("wallet_transactions")

    op.drop_index("ix_wallets_user_id", table_name="wallets")
    op.drop_table("wallets")

    op.drop_index("ix_payments_paid_at", table_name="payments")
    op.drop_index("ix_payments_status", table_name="payments")
    op.drop_index("ix_payments_payer_id", table_name="payments")
    op.drop_index("ix_payments_contract_id", table_name="payments")
    op.drop_table("payments")

    op.drop_index("ix_documents_contract_id", table_name="documents")
    op.drop_table("documents")

    op.drop_index("ix_contract_signatures_signed_at", table_name="contract_signatures")
    op.drop_index("ix_contract_signatures_user_id", table_name="contract_signatures")
    op.drop_index("ix_contract_signatures_contract_id", table_name="contract_signatures")
    op.drop_table("contract_signatures")

    op.drop_index("ix_contracts_tracking_code", table_name="contracts")
    op.drop_index("ix_contracts_status", table_name="contracts")
    op.drop_index("ix_contracts_tenant_id", table_name="contracts")
    op.drop_index("ix_contracts_owner_id", table_name="contracts")
    op.drop_index("ix_contracts_property_id", table_name="contracts")
    op.drop_table("contracts")

    op.drop_index("ix_properties_owner_id", table_name="properties")
    op.drop_table("properties")

    op.drop_index("ix_users_referral_code", table_name="users")
    op.drop_index("ix_users_national_code", table_name="users")
    op.drop_index("ix_users_mobile", table_name="users")
    op.drop_table("users")

    op.execute("DROP TYPE IF EXISTS contractstatus")
    op.execute("DROP TYPE IF EXISTS paymentstatus")
    op.execute("DROP TYPE IF EXISTS userrole")

