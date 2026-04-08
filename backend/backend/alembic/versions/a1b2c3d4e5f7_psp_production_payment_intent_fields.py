"""PSP production: payment_intents provider + session token + verify audit

Revision ID: a1b2c3d4e5f7
Revises: f0e1d2c3b4a5
Create Date: 2026-04-03

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f7"
down_revision: Union[str, None] = "f0e1d2c3b4a5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "payment_intents",
        sa.Column("psp_provider", sa.String(length=32), nullable=True),
    )
    op.add_column(
        "payment_intents",
        sa.Column("psp_checkout_token", sa.Text(), nullable=True),
    )
    op.add_column(
        "payment_intents",
        sa.Column("last_verify_error", sa.String(length=512), nullable=True),
    )
    op.add_column(
        "payment_intents",
        sa.Column(
            "verify_attempt_count",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )


def downgrade() -> None:
    op.drop_column("payment_intents", "verify_attempt_count")
    op.drop_column("payment_intents", "last_verify_error")
    op.drop_column("payment_intents", "psp_checkout_token")
    op.drop_column("payment_intents", "psp_provider")
