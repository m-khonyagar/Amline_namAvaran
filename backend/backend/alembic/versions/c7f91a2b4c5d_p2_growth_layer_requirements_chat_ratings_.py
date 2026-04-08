"""p2 growth layer requirements chat ratings analytics listing extras

Revision ID: c7f91a2b4c5d
Revises: 55e218881a26
Create Date: 2026-04-03 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c7f91a2b4c5d"
down_revision: Union[str, None] = "55e218881a26"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("listings") as batch_op:
        batch_op.add_column(sa.Column("area_sqm", sa.Numeric(12, 2), nullable=True))
        batch_op.add_column(sa.Column("room_count", sa.Integer(), nullable=True))

    op.create_table(
        "property_requirements",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("owner_user_id", sa.String(length=64), nullable=False),
        sa.Column("deal_type", sa.String(length=32), nullable=False),
        sa.Column("budget_min", sa.Numeric(14, 2), nullable=False),
        sa.Column("budget_max", sa.Numeric(14, 2), nullable=False),
        sa.Column("location_keywords", sa.String(length=512), nullable=False),
        sa.Column("title_hint", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_property_requirements_owner_user_id"),
        "property_requirements",
        ["owner_user_id"],
        unique=False,
    )

    op.create_table(
        "conversations",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("listing_id", sa.String(length=36), nullable=True),
        sa.Column("requirement_id", sa.String(length=36), nullable=True),
        sa.Column("created_by", sa.String(length=64), nullable=False),
        sa.Column("participants_json", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["listing_id"], ["listings.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["requirement_id"], ["property_requirements.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_conversations_listing_id"), "conversations", ["listing_id"], unique=False)
    op.create_index(
        op.f("ix_conversations_requirement_id"), "conversations", ["requirement_id"], unique=False
    )

    op.create_table(
        "messages",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("conversation_id", sa.String(length=36), nullable=False),
        sa.Column("sender_id", sa.String(length=64), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_messages_conversation_id"), "messages", ["conversation_id"], unique=False
    )
    op.create_index(op.f("ix_messages_sender_id"), "messages", ["sender_id"], unique=False)

    op.create_table(
        "ratings",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("target_type", sa.String(length=32), nullable=False),
        sa.Column("target_id", sa.String(length=64), nullable=False),
        sa.Column("rater_id", sa.String(length=64), nullable=False),
        sa.Column("stars", sa.Integer(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_ratings_target_type"), "ratings", ["target_type"], unique=False)
    op.create_index(op.f("ix_ratings_target_id"), "ratings", ["target_id"], unique=False)
    op.create_index(op.f("ix_ratings_rater_id"), "ratings", ["rater_id"], unique=False)
    # SQLite: use batch mode for ADD CONSTRAINT (Alembic migrates via SQLite in CI).
    with op.batch_alter_table("ratings") as batch_op:
        batch_op.create_unique_constraint(
            "uq_ratings_target_rater", ["target_type", "target_id", "rater_id"]
        )

    op.create_table(
        "analytics_events",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("event_name", sa.String(length=128), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=True),
        sa.Column("session_id", sa.String(length=64), nullable=True),
        sa.Column("properties_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_analytics_events_event_name"), "analytics_events", ["event_name"], unique=False
    )
    op.create_index(
        op.f("ix_analytics_events_user_id"), "analytics_events", ["user_id"], unique=False
    )
    op.create_index(
        op.f("ix_analytics_events_session_id"), "analytics_events", ["session_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_analytics_events_session_id"), table_name="analytics_events")
    op.drop_index(op.f("ix_analytics_events_user_id"), table_name="analytics_events")
    op.drop_index(op.f("ix_analytics_events_event_name"), table_name="analytics_events")
    op.drop_table("analytics_events")

    with op.batch_alter_table("ratings") as batch_op:
        batch_op.drop_constraint("uq_ratings_target_rater", type_="unique")
    op.drop_index(op.f("ix_ratings_rater_id"), table_name="ratings")
    op.drop_index(op.f("ix_ratings_target_id"), table_name="ratings")
    op.drop_index(op.f("ix_ratings_target_type"), table_name="ratings")
    op.drop_table("ratings")

    op.drop_index(op.f("ix_messages_sender_id"), table_name="messages")
    op.drop_index(op.f("ix_messages_conversation_id"), table_name="messages")
    op.drop_table("messages")

    op.drop_index(op.f("ix_conversations_requirement_id"), table_name="conversations")
    op.drop_index(op.f("ix_conversations_listing_id"), table_name="conversations")
    op.drop_table("conversations")

    op.drop_index(op.f("ix_property_requirements_owner_user_id"), table_name="property_requirements")
    op.drop_table("property_requirements")

    with op.batch_alter_table("listings") as batch_op:
        batch_op.drop_column("room_count")
        batch_op.drop_column("area_sqm")
