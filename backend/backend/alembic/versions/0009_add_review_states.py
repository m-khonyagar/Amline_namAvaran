"""اضافه کردن فیلدهای review_status و escalation_deadline به جدول contracts (v5.0)

Revision ID: 0009_add_review_states
Revises: 0008_market_requirements_promo_codes
Create Date: 2026-04-15
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0009_add_review_states"
down_revision = "0008_market_requirements_promo_codes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # اضافه کردن فیلد review_status — وضعیت بررسی کارشناس
    op.add_column(
        "contracts",
        sa.Column("review_status", sa.String(length=64), nullable=True),
    )
    op.create_index("ix_contracts_review_status", "contracts", ["review_status"], unique=False)

    # اضافه کردن فیلد escalation_deadline — مهلت SLA برای ارجاع
    op.add_column(
        "contracts",
        sa.Column("escalation_deadline", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("contracts", "escalation_deadline")
    op.drop_index("ix_contracts_review_status", table_name="contracts")
    op.drop_column("contracts", "review_status")
