"""Merge migration: resolve two 0008_* heads into a single head.

Both 0008_fix_consultant_user_id_type and 0008_market_requirements_promo_codes
branch off from 0007_wizard_commission_paid.  This merge revision reunifies the
migration graph so that `alembic upgrade head` works without the
"Multiple head revisions" error.

Revision ID: 0009_merge_heads
Revises:     0008_fix_consultant_user_id_type, 0008_market_requirements_promo_codes
Create Date: 2026-04-08
"""
from __future__ import annotations

from alembic import op

revision = "0009_merge_heads"
down_revision = (
    "0008_fix_consultant_user_id_type",
    "0008_market_promo",
)
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
