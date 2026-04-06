"""phase3 arbitration + tenant score history

Revision ID: 0002_phase3
Revises: 0001_init
Create Date: 2026-03-09
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0002_phase3"
down_revision = "0001_init"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "arbitrations",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("contract_id", sa.Uuid(), sa.ForeignKey("contracts.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("claimant_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("respondent_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("reason", sa.String(length=128), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.Enum("open", "under_review", "resolved", "rejected", name="arbitrationstatus"),
            nullable=False,
            server_default="open",
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolver_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("resolution", sa.Text(), nullable=True),
    )
    op.create_index("ix_arbitrations_contract_id", "arbitrations", ["contract_id"], unique=False)
    op.create_index("ix_arbitrations_claimant_id", "arbitrations", ["claimant_id"], unique=False)
    op.create_index("ix_arbitrations_respondent_id", "arbitrations", ["respondent_id"], unique=False)
    op.create_index("ix_arbitrations_status", "arbitrations", ["status"], unique=False)
    op.create_index("ix_arbitrations_created_at", "arbitrations", ["created_at"], unique=False)
    op.create_index("ix_arbitrations_resolved_at", "arbitrations", ["resolved_at"], unique=False)
    op.create_index("ix_arbitrations_resolver_id", "arbitrations", ["resolver_id"], unique=False)

    op.create_table(
        "tenant_score_events",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("delta", sa.Integer(), nullable=False),
        sa.Column("reason", sa.String(length=64), nullable=False),
        sa.Column("reference_id", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_tenant_score_events_user_id", "tenant_score_events", ["user_id"], unique=False)
    op.create_index("ix_tenant_score_events_created_at", "tenant_score_events", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_tenant_score_events_created_at", table_name="tenant_score_events")
    op.drop_index("ix_tenant_score_events_user_id", table_name="tenant_score_events")
    op.drop_table("tenant_score_events")

    op.drop_index("ix_arbitrations_resolver_id", table_name="arbitrations")
    op.drop_index("ix_arbitrations_resolved_at", table_name="arbitrations")
    op.drop_index("ix_arbitrations_created_at", table_name="arbitrations")
    op.drop_index("ix_arbitrations_status", table_name="arbitrations")
    op.drop_index("ix_arbitrations_respondent_id", table_name="arbitrations")
    op.drop_index("ix_arbitrations_claimant_id", table_name="arbitrations")
    op.drop_index("ix_arbitrations_contract_id", table_name="arbitrations")
    op.drop_table("arbitrations")

    op.execute("DROP TYPE IF EXISTS arbitrationstatus")
