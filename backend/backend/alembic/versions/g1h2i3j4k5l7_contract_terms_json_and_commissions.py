"""contract v2: terms_json on flow + contract_commissions table

Revision ID: g1h2i3j4k5l7
Revises: e1f2a3b4c5d6
Create Date: 2026-04-03
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision: str = "g1h2i3j4k5l7"
down_revision: Union[str, None] = "e1f2a3b4c5d6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = inspect(conn)
    names = set(insp.get_table_names())

    if "contract_flow_contracts" in names:
        cols = {c["name"] for c in insp.get_columns("contract_flow_contracts")}
        if "terms_json" not in cols:
            op.add_column(
                "contract_flow_contracts",
                sa.Column("terms_json", sa.JSON(), nullable=True),
            )

    if "contract_commissions" not in names:
        op.create_table(
            "contract_commissions",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("contract_id", sa.String(length=64), nullable=False),
            sa.Column("commission_type", sa.String(length=32), nullable=False),
            sa.Column("paid_by", sa.String(length=32), nullable=False),
            sa.Column("amount", sa.Integer(), nullable=False),
            sa.Column("status", sa.String(length=16), nullable=False),
            sa.Column("payment_method", sa.String(length=16), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            op.f("ix_contract_commissions_contract_id"),
            "contract_commissions",
            ["contract_id"],
            unique=False,
        )


def downgrade() -> None:
    conn = op.get_bind()
    insp = inspect(conn)
    names = set(insp.get_table_names())

    if "contract_commissions" in names:
        op.drop_index(
            op.f("ix_contract_commissions_contract_id"),
            table_name="contract_commissions",
        )
        op.drop_table("contract_commissions")

    if "contract_flow_contracts" in names:
        cols = {c["name"] for c in insp.get_columns("contract_flow_contracts")}
        if "terms_json" in cols:
            op.drop_column("contract_flow_contracts", "terms_json")
