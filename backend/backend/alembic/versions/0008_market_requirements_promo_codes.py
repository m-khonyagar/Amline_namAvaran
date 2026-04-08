"""market_requirements + promo_codes + seed demo rows for market feed

Revision ID: 0008_market_promo
Revises: 0007_wizard_commission_paid
Create Date: 2026-04-06
"""

from __future__ import annotations

import datetime as dt
import uuid

import sqlalchemy as sa
from alembic import op

revision = "0008_market_promo"
down_revision = "0007_wizard_commission_paid"
branch_labels = None
depends_on = None

_NOW = dt.datetime.now(dt.timezone.utc)

_SEED_IDS = [
    uuid.UUID("a1111111-1111-1111-1111-111111111101"),
    uuid.UUID("a1111111-1111-1111-1111-111111111102"),
    uuid.UUID("a1111111-1111-1111-1111-111111111103"),
    uuid.UUID("a1111111-1111-1111-1111-111111111104"),
    uuid.UUID("a1111111-1111-1111-1111-111111111105"),
    uuid.UUID("a1111111-1111-1111-1111-111111111106"),
]


def upgrade() -> None:
    op.create_table(
        "market_requirements",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="QUEUED"),
        sa.Column("queue_message", sa.Text(), nullable=True),
        sa.Column("publish_title", sa.String(length=512), nullable=False),
        sa.Column("city_label", sa.String(length=128), nullable=False, server_default=""),
        sa.Column("neighborhood_label", sa.String(length=128), nullable=False, server_default=""),
        sa.Column("price_label", sa.String(length=256), nullable=False, server_default="توافقی"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("property_type_id", sa.String(length=64), nullable=True),
        sa.Column("property_type_label", sa.String(length=128), nullable=True),
        sa.Column("min_area", sa.Float(), nullable=True),
        sa.Column("total_price", sa.Float(), nullable=True),
        sa.Column("build_year", sa.Float(), nullable=True),
        sa.Column("renovated", sa.Boolean(), nullable=True),
        sa.Column("rooms", sa.String(length=32), nullable=True),
        sa.Column("amenities", sa.JSON(), nullable=True),
    )
    op.create_index("ix_market_requirements_user_id", "market_requirements", ["user_id"])
    op.create_index("ix_market_requirements_kind", "market_requirements", ["kind"])
    op.create_index("ix_market_requirements_status", "market_requirements", ["status"])
    op.create_index("ix_market_requirements_city_label", "market_requirements", ["city_label"])

    op.create_table(
        "promo_codes",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("discount_type", sa.String(length=32), nullable=False, server_default="PERCENTAGE"),
        sa.Column("discount_value", sa.Float(), nullable=False, server_default="0"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("note", sa.String(length=256), nullable=True),
    )
    op.create_index("ix_promo_codes_code", "promo_codes", ["code"], unique=True)
    op.create_index("ix_promo_codes_active", "promo_codes", ["active"])

    seeds = [
        {
            "id": _SEED_IDS[0],
            "created_at": _NOW,
            "user_id": None,
            "kind": "buy",
            "status": "PUBLISHED",
            "queue_message": None,
            "publish_title": "آگهی خرید و فروش آپارتمان",
            "city_label": "قم",
            "neighborhood_label": "پردیسان",
            "price_label": "۱۲ میلیارد تومان",
            "description": "آپارتمان ۹۰ متری، نوساز، نزدیک بلوار.",
            "property_type_id": None,
            "property_type_label": None,
            "min_area": None,
            "total_price": None,
            "build_year": None,
            "renovated": None,
            "rooms": None,
            "amenities": None,
        },
        {
            "id": _SEED_IDS[1],
            "created_at": _NOW,
            "user_id": None,
            "kind": "rent",
            "status": "PUBLISHED",
            "queue_message": None,
            "publish_title": "آگهی رهن و اجاره آپارتمان",
            "city_label": "قم",
            "neighborhood_label": "قنوات",
            "price_label": "رهن ۵۰۰ / اجاره ۸ میلیون",
            "description": "دو خواب، پارکینگ و انباری.",
            "property_type_id": None,
            "property_type_label": None,
            "min_area": None,
            "total_price": None,
            "build_year": None,
            "renovated": None,
            "rooms": None,
            "amenities": None,
        },
        {
            "id": _SEED_IDS[2],
            "created_at": _NOW,
            "user_id": None,
            "kind": "barter",
            "status": "PUBLISHED",
            "queue_message": None,
            "publish_title": "معاوضه ملک با آپارتمان",
            "city_label": "تهران",
            "neighborhood_label": "ونک",
            "price_label": "توافقی",
            "description": "زمین تجاری به‌ازای آپارتمان در قم.",
            "property_type_id": None,
            "property_type_label": None,
            "min_area": None,
            "total_price": None,
            "build_year": None,
            "renovated": None,
            "rooms": None,
            "amenities": None,
        },
        {
            "id": _SEED_IDS[3],
            "created_at": _NOW,
            "user_id": None,
            "kind": "buy",
            "status": "PUBLISHED",
            "queue_message": None,
            "publish_title": "خرید ویلایی مسکونی",
            "city_label": "قم",
            "neighborhood_label": "جعفریه",
            "price_label": "۸ میلیارد تومان",
            "description": "بنای ۲۵۰ متر، حیاط اختصاصی.",
            "property_type_id": None,
            "property_type_label": None,
            "min_area": None,
            "total_price": None,
            "build_year": None,
            "renovated": None,
            "rooms": None,
            "amenities": None,
        },
        {
            "id": _SEED_IDS[4],
            "created_at": _NOW,
            "user_id": None,
            "kind": "rent",
            "status": "PUBLISHED",
            "queue_message": None,
            "publish_title": "اجاره مغازه تجاری",
            "city_label": "قم",
            "neighborhood_label": "مرکز",
            "price_label": "اجاره ۱۵ میلیون",
            "description": "بر اصلی، مناسب خرده‌فروشی.",
            "property_type_id": None,
            "property_type_label": None,
            "min_area": None,
            "total_price": None,
            "build_year": None,
            "renovated": None,
            "rooms": None,
            "amenities": None,
        },
        {
            "id": _SEED_IDS[5],
            "created_at": _NOW,
            "user_id": None,
            "kind": "barter",
            "status": "PUBLISHED",
            "queue_message": None,
            "publish_title": "معاوضه آپارتمان با مغازه",
            "city_label": "قم",
            "neighborhood_label": "سلفچگان",
            "price_label": "هم‌ارزش",
            "description": "آپارتمان ۱۱۰ متری با مغازه ۴۰ متری.",
            "property_type_id": None,
            "property_type_label": None,
            "min_area": None,
            "total_price": None,
            "build_year": None,
            "renovated": None,
            "rooms": None,
            "amenities": None,
        },
    ]

    t = sa.table(
        "market_requirements",
        sa.column("id", sa.Uuid()),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("user_id", sa.Uuid()),
        sa.column("kind", sa.String()),
        sa.column("status", sa.String()),
        sa.column("queue_message", sa.Text()),
        sa.column("publish_title", sa.String()),
        sa.column("city_label", sa.String()),
        sa.column("neighborhood_label", sa.String()),
        sa.column("price_label", sa.String()),
        sa.column("description", sa.Text()),
        sa.column("property_type_id", sa.String()),
        sa.column("property_type_label", sa.String()),
        sa.column("min_area", sa.Float()),
        sa.column("total_price", sa.Float()),
        sa.column("build_year", sa.Float()),
        sa.column("renovated", sa.Boolean()),
        sa.column("rooms", sa.String()),
        sa.column("amenities", sa.JSON()),
    )
    op.bulk_insert(t, seeds)


def downgrade() -> None:
    op.drop_index("ix_promo_codes_active", table_name="promo_codes")
    op.drop_index("ix_promo_codes_code", table_name="promo_codes")
    op.drop_table("promo_codes")
    op.drop_index("ix_market_requirements_city_label", table_name="market_requirements")
    op.drop_index("ix_market_requirements_status", table_name="market_requirements")
    op.drop_index("ix_market_requirements_kind", table_name="market_requirements")
    op.drop_index("ix_market_requirements_user_id", table_name="market_requirements")
    op.drop_table("market_requirements")
