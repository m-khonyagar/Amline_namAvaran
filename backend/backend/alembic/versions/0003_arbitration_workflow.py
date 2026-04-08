"""arbitration workflow: messages + attachments

Revision ID: 0003_arbitration_workflow
Revises: 0002_phase3
Create Date: 2026-03-09
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0003_arbitration_workflow"
down_revision = "0002_phase3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "arbitration_messages",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("arbitration_id", sa.Uuid(), sa.ForeignKey("arbitrations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_arbitration_messages_arbitration_id", "arbitration_messages", ["arbitration_id"], unique=False)
    op.create_index("ix_arbitration_messages_author_id", "arbitration_messages", ["author_id"], unique=False)
    op.create_index("ix_arbitration_messages_created_at", "arbitration_messages", ["created_at"], unique=False)

    op.create_table(
        "arbitration_attachments",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("arbitration_id", sa.Uuid(), sa.ForeignKey("arbitrations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("uploader_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("filename", sa.String(length=256), nullable=False),
        sa.Column("content_type", sa.String(length=128), nullable=False, server_default="application/octet-stream"),
        sa.Column("size_bytes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("s3_key", sa.String(length=512), nullable=True),
        sa.Column("local_path", sa.String(length=512), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_arbitration_attachments_arbitration_id",
        "arbitration_attachments",
        ["arbitration_id"],
        unique=False,
    )
    op.create_index("ix_arbitration_attachments_uploader_id", "arbitration_attachments", ["uploader_id"], unique=False)
    op.create_index("ix_arbitration_attachments_created_at", "arbitration_attachments", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_arbitration_attachments_created_at", table_name="arbitration_attachments")
    op.drop_index("ix_arbitration_attachments_uploader_id", table_name="arbitration_attachments")
    op.drop_index("ix_arbitration_attachments_arbitration_id", table_name="arbitration_attachments")
    op.drop_table("arbitration_attachments")

    op.drop_index("ix_arbitration_messages_created_at", table_name="arbitration_messages")
    op.drop_index("ix_arbitration_messages_author_id", table_name="arbitration_messages")
    op.drop_index("ix_arbitration_messages_arbitration_id", table_name="arbitration_messages")
    op.drop_table("arbitration_messages")
