"""crm_tasks table

Revision ID: 0005_crm_tasks
Revises: 0004_wizard_crm_roles
Create Date: 2026-04-02
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0005_crm_tasks"
down_revision = "0004_wizard_crm_roles"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "crm_tasks",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("lead_id", sa.String(64), nullable=False),
        sa.Column("title", sa.String(256), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("done", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_crm_tasks_lead_id", "crm_tasks", ["lead_id"])


def downgrade() -> None:
    op.drop_index("ix_crm_tasks_lead_id", "crm_tasks")
    op.drop_table("crm_tasks")
