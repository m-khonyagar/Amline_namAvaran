"""Merge two parallel 0008 heads into a single linear history.

Both 0008_mkt_promo and 0008_fix_consultant_user_id_type
branched from 0007_wizard_commission_paid independently, creating two Alembic
heads and blocking `alembic upgrade head` in CI and production.

This merge migration has both as down_revision so that the chain becomes linear
again. No schema changes are made here.

Revision ID: 0009_merge_0008_heads
Revises: 0008_mkt_promo, 0008_fix_consultant_user_id_type
Create Date: 2026-04-08
"""

from __future__ import annotations

revision = "0009_merge_0008_heads"
down_revision = (
    "0008_mkt_promo",
    "0008_fix_consultant_user_id_type",
)
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
