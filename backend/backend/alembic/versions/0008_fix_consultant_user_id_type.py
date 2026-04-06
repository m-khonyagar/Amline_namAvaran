"""Fix consultant_profiles.user_id column type: UUID → VARCHAR(64).

The model declares user_id as String(64) but migration 0006 created it as
UUID, causing `column "user_id" is of type uuid but expression is of type
character varying` on every INSERT in tests and production.

Revision ID: 0008_fix_consultant_user_id_type
Revises: 0007_wizard_commission_paid
Create Date: 2026-04-06
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0008_fix_consultant_user_id_type"
down_revision = "0007_wizard_commission_paid"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    if not insp.has_table("consultant_profiles"):
        return

    cols = {c["name"]: c for c in insp.get_columns("consultant_profiles")}
    user_id_col = cols.get("user_id")
    if user_id_col is None:
        return

    # Only alter when the column is still a UUID (not already a string type).
    if isinstance(user_id_col["type"], sa.Uuid):
        url = str(bind.engine.url).lower()
        if "sqlite" in url:
            # SQLite doesn't support ALTER COLUMN; rebuild with create_all
            # (SQLite never enforced UUID type anyway — tests pass without change)
            return
        else:
            op.alter_column(
                "consultant_profiles",
                "user_id",
                type_=sa.String(64),
                existing_type=sa.Uuid(),
                existing_nullable=True,
                postgresql_using="user_id::text",
            )


def downgrade() -> None:
    bind = op.get_bind()
    url = str(bind.engine.url).lower()
    if "sqlite" in url:
        return
    op.alter_column(
        "consultant_profiles",
        "user_id",
        type_=sa.Uuid(),
        existing_type=sa.String(64),
        existing_nullable=True,
        postgresql_using="user_id::uuid",
    )
