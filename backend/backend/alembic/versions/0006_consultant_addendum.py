"""consultant_profiles, addendums, uploaded_files tables

Revision ID: 0006_consultant_addendum
Revises: 0005_crm_tasks
Create Date: 2026-04-06
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0006_consultant_addendum"
down_revision = "0005_crm_tasks"
branch_labels = None
depends_on = None


def _table_exists(name: str) -> bool:
    bind = op.get_bind()
    return sa.inspect(bind).has_table(name)


def upgrade() -> None:
    if not _table_exists("consultant_profiles"):
        op.create_table(
            "consultant_profiles",
            sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
            sa.Column("user_id", sa.Uuid(), nullable=True),
            sa.Column("full_name", sa.String(128), nullable=False),
            sa.Column("mobile", sa.String(32), nullable=False, unique=True),
            sa.Column("national_code", sa.String(20), nullable=False),
            sa.Column("license_no", sa.String(64), nullable=False),
            sa.Column("city", sa.String(64), nullable=False),
            sa.Column("agency_name", sa.String(128), nullable=True),
            sa.Column("verification_tier", sa.String(32), nullable=False, server_default="NONE"),
            sa.Column("application_status", sa.String(32), nullable=False, server_default="SUBMITTED"),
            sa.Column("credit_score", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("active_contracts_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("assigned_leads_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index("ix_consultant_profiles_mobile", "consultant_profiles", ["mobile"])

    if not _table_exists("addendums"):
        op.create_table(
            "addendums",
            sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
            sa.Column("contract_id", sa.Uuid(), nullable=False),
            sa.Column("subject", sa.String(256), nullable=False),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column("status", sa.String(32), nullable=False, server_default="DRAFT"),
            sa.Column("created_by", sa.String(64), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_addendums_contract_id", "addendums", ["contract_id"])

    if not _table_exists("uploaded_files"):
        op.create_table(
            "uploaded_files",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
            sa.Column("url", sa.String(512), nullable=True),
            sa.Column("file_type", sa.String(64), nullable=False),
            sa.Column("owner_id", sa.String(64), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )


def downgrade() -> None:
    if _table_exists("uploaded_files"):
        op.drop_table("uploaded_files")
    if _table_exists("addendums"):
        op.drop_index("ix_addendums_contract_id", "addendums")
        op.drop_table("addendums")
    if _table_exists("consultant_profiles"):
        op.drop_index("ix_consultant_profiles_mobile", "consultant_profiles")
        op.drop_table("consultant_profiles")
