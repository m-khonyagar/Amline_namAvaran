"""wizard_contracts.commission_paid_at for bank-mock / wallet commission tracking

Revision ID: 0007_wizard_commission_paid
Revises: 0006_consultant_addendum
Create Date: 2026-04-06
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0007_wizard_commission_paid"
down_revision = "0006_consultant_addendum"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "wizard_contracts",
        sa.Column("commission_paid_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("wizard_contracts", "commission_paid_at")
