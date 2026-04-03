"""crm lead optional province and city FKs

Revision ID: e8a9b0c1d2e3
Revises: c7f91a2b4c5d
Create Date: 2026-04-03 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e8a9b0c1d2e3"
down_revision: Union[str, None] = "c7f91a2b4c5d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("crm_leads") as batch_op:
        batch_op.add_column(sa.Column("province_id", sa.String(length=8), nullable=True))
        batch_op.add_column(sa.Column("city_id", sa.String(length=36), nullable=True))
        batch_op.create_foreign_key(
            "fk_crm_leads_province_id",
            "provinces",
            ["province_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.create_foreign_key(
            "fk_crm_leads_city_id",
            "cities",
            ["city_id"],
            ["id"],
            ondelete="SET NULL",
        )
    op.create_index(op.f("ix_crm_leads_province_id"), "crm_leads", ["province_id"], unique=False)
    op.create_index(op.f("ix_crm_leads_city_id"), "crm_leads", ["city_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_crm_leads_city_id"), table_name="crm_leads")
    op.drop_index(op.f("ix_crm_leads_province_id"), table_name="crm_leads")
    with op.batch_alter_table("crm_leads") as batch_op:
        batch_op.drop_constraint("fk_crm_leads_city_id", type_="foreignkey")
        batch_op.drop_constraint("fk_crm_leads_province_id", type_="foreignkey")
        batch_op.drop_column("city_id")
        batch_op.drop_column("province_id")
