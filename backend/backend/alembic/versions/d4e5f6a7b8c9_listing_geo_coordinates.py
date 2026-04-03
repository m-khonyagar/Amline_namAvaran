"""listing latitude/longitude for maps + Meilisearch _geo

Revision ID: d4e5f6a7b8c9
Revises: a1b2c3d4e5f7
Create Date: 2026-04-03

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, None] = "a1b2c3d4e5f7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("listings", sa.Column("latitude", sa.Numeric(10, 7), nullable=True))
    op.add_column("listings", sa.Column("longitude", sa.Numeric(10, 7), nullable=True))


def downgrade() -> None:
    op.drop_column("listings", "longitude")
    op.drop_column("listings", "latitude")
