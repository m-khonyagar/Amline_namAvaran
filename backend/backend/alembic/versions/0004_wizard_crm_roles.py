"""wizard_contracts, crm_leads, crm_activities, roles

Revision ID: 0004_wizard_crm_roles
Revises: 0003_arbitration_workflow
Create Date: 2026-04-01
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0004_wizard_crm_roles"
down_revision = "0003_arbitration_workflow"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "wizard_contracts",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("contract_type", sa.String(64), nullable=False, server_default="PROPERTY_RENT"),
        sa.Column("party_type", sa.String(32), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="DRAFT"),
        sa.Column("step", sa.String(64), nullable=False, server_default="LANDLORD_INFORMATION"),
        sa.Column("parties", sa.JSON(), nullable=True),
        sa.Column("owner_id", sa.String(64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_wizard_contracts_owner_id", "wizard_contracts", ["owner_id"])
    op.create_index("ix_wizard_contracts_status", "wizard_contracts", ["status"])

    op.create_table(
        "crm_leads",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("full_name", sa.String(128), nullable=False),
        sa.Column("mobile", sa.String(32), nullable=False),
        sa.Column("need_type", sa.String(32), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="NEW"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("assigned_to", sa.String(64), nullable=True),
        sa.Column("contract_id", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_crm_leads_mobile", "crm_leads", ["mobile"])
    op.create_index("ix_crm_leads_status", "crm_leads", ["status"])

    op.create_table(
        "crm_activities",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("lead_id", sa.String(64), nullable=False),
        sa.Column("type", sa.String(64), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("user_id", sa.String(64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_crm_activities_lead_id", "crm_activities", ["lead_id"])

    op.create_table(
        "roles",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("description", sa.String(256), nullable=True),
        sa.Column("permissions", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_roles_name", "roles", ["name"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_roles_name", "roles")
    op.drop_table("roles")
    op.drop_index("ix_crm_activities_lead_id", "crm_activities")
    op.drop_table("crm_activities")
    op.drop_index("ix_crm_leads_status", "crm_leads")
    op.drop_index("ix_crm_leads_mobile", "crm_leads")
    op.drop_table("crm_leads")
    op.drop_index("ix_wizard_contracts_status", "wizard_contracts")
    op.drop_index("ix_wizard_contracts_owner_id", "wizard_contracts")
    op.drop_table("wizard_contracts")
