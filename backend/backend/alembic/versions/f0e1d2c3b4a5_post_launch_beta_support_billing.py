"""post launch: beta, onboarding, support, billing, agency/region, gamification, FTS doc

Revision ID: f0e1d2c3b4a5
Revises: e8a9b0c1d2e3
Create Date: 2026-04-03 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f0e1d2c3b4a5"
down_revision: Union[str, None] = "e8a9b0c1d2e3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "agencies",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("name_fa", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=64), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_agencies_slug"), "agencies", ["slug"], unique=True)

    op.create_table(
        "regions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("code", sa.String(length=32), nullable=False),
        sa.Column("name_fa", sa.String(length=128), nullable=False),
        sa.Column("parent_id", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["parent_id"], ["regions.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_regions_code"), "regions", ["code"], unique=True)
    op.create_index(op.f("ix_regions_parent_id"), "regions", ["parent_id"], unique=False)

    op.create_table(
        "beta_invitations",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("token_hash", sa.String(length=128), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("invited_by_user_id", sa.String(length=64), nullable=True),
        sa.Column("accepted_user_id", sa.String(length=64), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_beta_invitations_email"), "beta_invitations", ["email"], unique=False)
    op.create_index(
        op.f("ix_beta_invitations_token_hash"), "beta_invitations", ["token_hash"], unique=True
    )

    op.create_table(
        "onboarding_events",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("step", sa.String(length=64), nullable=False),
        sa.Column("payload_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_onboarding_events_user_id"), "onboarding_events", ["user_id"], unique=False)
    op.create_index(op.f("ix_onboarding_events_step"), "onboarding_events", ["step"], unique=False)

    op.create_table(
        "support_tickets",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("subject", sa.String(length=512), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("priority", sa.String(length=16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_support_tickets_user_id"), "support_tickets", ["user_id"], unique=False)

    op.create_table(
        "support_messages",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("ticket_id", sa.String(length=36), nullable=False),
        sa.Column("author_user_id", sa.String(length=64), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["ticket_id"], ["support_tickets.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_support_messages_ticket_id"), "support_messages", ["ticket_id"], unique=False)

    op.create_table(
        "subscription_plans",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("name_fa", sa.String(length=255), nullable=False),
        sa.Column("price_cents", sa.Integer(), nullable=False),
        sa.Column("cycle", sa.String(length=32), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("meta_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_subscription_plans_code"), "subscription_plans", ["code"], unique=True)

    op.create_table(
        "user_subscriptions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("plan_id", sa.String(length=36), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["plan_id"], ["subscription_plans.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_user_subscriptions_user_id"), "user_subscriptions", ["user_id"], unique=False)

    op.create_table(
        "user_gamification",
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("points", sa.Integer(), nullable=False),
        sa.Column("level", sa.Integer(), nullable=False),
        sa.Column("badges_json", sa.Text(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("user_id"),
    )

    op.create_table(
        "client_error_reports",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("fingerprint", sa.String(length=128), nullable=True),
        sa.Column("message", sa.String(length=1024), nullable=False),
        sa.Column("stack", sa.Text(), nullable=True),
        sa.Column("url", sa.String(length=2048), nullable=True),
        sa.Column("user_id", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_client_error_reports_fingerprint"), "client_error_reports", ["fingerprint"], unique=False
    )
    op.create_index(
        op.f("ix_client_error_reports_user_id"), "client_error_reports", ["user_id"], unique=False
    )

    with op.batch_alter_table("listings") as batch_op:
        batch_op.add_column(sa.Column("agency_id", sa.String(length=36), nullable=True))
        batch_op.add_column(sa.Column("region_id", sa.String(length=36), nullable=True))
        batch_op.add_column(sa.Column("search_document", sa.Text(), nullable=True))
    op.create_index(op.f("ix_listings_agency_id"), "listings", ["agency_id"], unique=False)
    op.create_index(op.f("ix_listings_region_id"), "listings", ["region_id"], unique=False)

    with op.batch_alter_table("crm_leads") as batch_op:
        batch_op.add_column(sa.Column("agency_id", sa.String(length=36), nullable=True))
    op.create_index(op.f("ix_crm_leads_agency_id"), "crm_leads", ["agency_id"], unique=False)

    conn = op.get_bind()
    if conn.dialect.name == "postgresql":
        op.execute(
            """
            CREATE INDEX IF NOT EXISTS ix_listings_search_gin
            ON listings
            USING gin (to_tsvector('simple', coalesce(search_document, '')));
            """
        )


def downgrade() -> None:
    conn = op.get_bind()
    if conn.dialect.name == "postgresql":
        op.execute("DROP INDEX IF EXISTS ix_listings_search_gin")

    op.drop_index(op.f("ix_crm_leads_agency_id"), table_name="crm_leads")
    with op.batch_alter_table("crm_leads") as batch_op:
        batch_op.drop_column("agency_id")

    op.drop_index(op.f("ix_listings_region_id"), table_name="listings")
    op.drop_index(op.f("ix_listings_agency_id"), table_name="listings")
    with op.batch_alter_table("listings") as batch_op:
        batch_op.drop_column("search_document")
        batch_op.drop_column("region_id")
        batch_op.drop_column("agency_id")

    op.drop_index(op.f("ix_client_error_reports_user_id"), table_name="client_error_reports")
    op.drop_index(op.f("ix_client_error_reports_fingerprint"), table_name="client_error_reports")
    op.drop_table("client_error_reports")

    op.drop_table("user_gamification")

    op.drop_index(op.f("ix_user_subscriptions_user_id"), table_name="user_subscriptions")
    op.drop_table("user_subscriptions")

    op.drop_index(op.f("ix_subscription_plans_code"), table_name="subscription_plans")
    op.drop_table("subscription_plans")

    op.drop_index(op.f("ix_support_messages_ticket_id"), table_name="support_messages")
    op.drop_table("support_messages")

    op.drop_index(op.f("ix_support_tickets_user_id"), table_name="support_tickets")
    op.drop_table("support_tickets")

    op.drop_index(op.f("ix_onboarding_events_step"), table_name="onboarding_events")
    op.drop_index(op.f("ix_onboarding_events_user_id"), table_name="onboarding_events")
    op.drop_table("onboarding_events")

    op.drop_index(op.f("ix_beta_invitations_token_hash"), table_name="beta_invitations")
    op.drop_index(op.f("ix_beta_invitations_email"), table_name="beta_invitations")
    op.drop_table("beta_invitations")

    op.drop_index(op.f("ix_regions_parent_id"), table_name="regions")
    op.drop_index(op.f("ix_regions_code"), table_name="regions")
    op.drop_table("regions")

    op.drop_index(op.f("ix_agencies_slug"), table_name="agencies")
    op.drop_table("agencies")
