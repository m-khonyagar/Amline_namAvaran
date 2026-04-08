"""p1 platform visits crm wallet payment legal registry notify geo rbac audit

Revision ID: 55e218881a26
Revises: fd5df7bd8644
Create Date: 2026-04-03 04:46:20.278301

"""
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect, text


# revision identifiers, used by Alembic.
revision: str = '55e218881a26'
down_revision: Union[str, None] = 'fd5df7bd8644'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _refresh_tables(insp: Any) -> set[str]:
    return set(insp.get_table_names())


def _ix_names(insp: Any, table: str) -> set[str]:
    try:
        return {i["name"] for i in insp.get_indexes(table)}
    except Exception:
        return set()


def upgrade() -> None:
    """Create P1 tables when missing (no-op if 0001–0009 already created them)."""
    bind = op.get_bind()
    insp = inspect(bind)
    tables = _refresh_tables(insp)

    if "audit_log_entries" not in tables:
        op.create_table(
            'audit_log_entries',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('user_id', sa.String(length=64), nullable=False),
            sa.Column('action', sa.String(length=128), nullable=False),
            sa.Column('entity', sa.String(length=128), nullable=False),
            sa.Column('metadata_json', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.PrimaryKeyConstraint('id')
        )
        if op.f('ix_audit_log_entries_user_id') not in _ix_names(insp, 'audit_log_entries'):
            op.create_index(op.f('ix_audit_log_entries_user_id'), 'audit_log_entries', ['user_id'], unique=False)
        tables = _refresh_tables(inspect(bind))

    if "legal_reviews" not in tables:
        op.create_table(
            'legal_reviews',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('contract_id', sa.String(length=64), nullable=False),
            sa.Column('status', sa.Enum('PENDING', 'APPROVED', 'REJECTED', name='legalreviewstatus', native_enum=False, length=32), nullable=False),
            sa.Column('comment', sa.Text(), nullable=True),
            sa.Column('reviewer_id', sa.String(length=64), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('decided_at', sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint('id')
        )
        if op.f('ix_legal_reviews_contract_id') not in _ix_names(inspect(bind), 'legal_reviews'):
            op.create_index(op.f('ix_legal_reviews_contract_id'), 'legal_reviews', ['contract_id'], unique=False)
        tables = _refresh_tables(inspect(bind))

    if "notification_events" not in tables:
        op.create_table(
            'notification_events',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('channel', sa.Enum('SMS', 'EMAIL', 'PUSH', name='notificationchannel', native_enum=False, length=16), nullable=False),
            sa.Column('recipient', sa.String(length=255), nullable=False),
            sa.Column('template_key', sa.String(length=128), nullable=False),
            sa.Column('payload_json', sa.Text(), nullable=True),
            sa.Column('status', sa.Enum('QUEUED', 'SENT', 'FAILED', name='notificationstatus', native_enum=False, length=16), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.PrimaryKeyConstraint('id')
        )
        tables = _refresh_tables(inspect(bind))

    if "payment_intents" not in tables:
        op.create_table(
            'payment_intents',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('user_id', sa.String(length=64), nullable=False),
            sa.Column('amount_cents', sa.BigInteger(), nullable=False),
            sa.Column('currency', sa.String(length=8), nullable=False),
            sa.Column('idempotency_key', sa.String(length=128), nullable=False),
            sa.Column('status', sa.Enum('PENDING', 'COMPLETED', 'FAILED', name='paymentintentstatus', native_enum=False, length=32), nullable=False),
            sa.Column('psp_reference', sa.String(length=128), nullable=True),
            sa.Column('callback_payload', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('idempotency_key', name='uq_payment_idempotency')
        )
        if op.f('ix_payment_intents_user_id') not in _ix_names(inspect(bind), 'payment_intents'):
            op.create_index(op.f('ix_payment_intents_user_id'), 'payment_intents', ['user_id'], unique=False)
        tables = _refresh_tables(inspect(bind))

    if "provinces" not in tables:
        op.create_table(
            'provinces',
            sa.Column('id', sa.String(length=8), nullable=False),
            sa.Column('name_fa', sa.String(length=128), nullable=False),
            sa.Column('sort_order', sa.Integer(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.PrimaryKeyConstraint('id')
        )
        tables = _refresh_tables(inspect(bind))

    if "rbac_roles" not in tables:
        op.create_table(
            'rbac_roles',
            sa.Column('code', sa.String(length=32), nullable=False),
            sa.Column('label', sa.String(length=128), nullable=False),
            sa.Column('permissions_json', sa.Text(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.PrimaryKeyConstraint('code')
        )
        tables = _refresh_tables(inspect(bind))

    if "registry_jobs" not in tables:
        op.create_table(
            'registry_jobs',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('contract_id', sa.String(length=64), nullable=False),
            sa.Column('status', sa.Enum('SUBMITTED', 'PROCESSING', 'COMPLETED', 'FAILED', name='registryjobstatus', native_enum=False, length=32), nullable=False),
            sa.Column('tracking_code', sa.String(length=128), nullable=True),
            sa.Column('payload_json', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
            sa.PrimaryKeyConstraint('id')
        )
        insp = inspect(bind)
        if op.f('ix_registry_jobs_contract_id') not in _ix_names(insp, 'registry_jobs'):
            op.create_index(op.f('ix_registry_jobs_contract_id'), 'registry_jobs', ['contract_id'], unique=False)
        if op.f('ix_registry_jobs_tracking_code') not in _ix_names(inspect(bind), 'registry_jobs'):
            op.create_index(op.f('ix_registry_jobs_tracking_code'), 'registry_jobs', ['tracking_code'], unique=False)
        tables = _refresh_tables(inspect(bind))

    if "wallet_accounts" not in tables:
        op.create_table(
            'wallet_accounts',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('user_id', sa.String(length=64), nullable=False),
            sa.Column('currency', sa.String(length=8), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.PrimaryKeyConstraint('id')
        )
        if op.f('ix_wallet_accounts_user_id') not in _ix_names(inspect(bind), 'wallet_accounts'):
            op.create_index(op.f('ix_wallet_accounts_user_id'), 'wallet_accounts', ['user_id'], unique=True)
        tables = _refresh_tables(inspect(bind))

    if "cities" not in tables:
        op.create_table(
            'cities',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('province_id', sa.String(length=8), nullable=False),
            sa.Column('name_fa', sa.String(length=128), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(['province_id'], ['provinces.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        if op.f('ix_cities_province_id') not in _ix_names(inspect(bind), 'cities'):
            op.create_index(op.f('ix_cities_province_id'), 'cities', ['province_id'], unique=False)
        tables = _refresh_tables(inspect(bind))

    if "crm_leads" not in tables:
        op.create_table(
            'crm_leads',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('source', sa.Enum('LISTING', 'REQUIREMENT', 'VISIT', 'MANUAL', name='crmleadsource', native_enum=False, length=32), nullable=False),
            sa.Column('full_name', sa.String(length=255), nullable=False),
            sa.Column('mobile', sa.String(length=32), nullable=False),
            sa.Column('need_type', sa.String(length=32), nullable=False),
            sa.Column('status', sa.String(length=32), nullable=False),
            sa.Column('notes', sa.Text(), nullable=False),
            sa.Column('assigned_to', sa.String(length=64), nullable=True),
            sa.Column('contract_id', sa.String(length=64), nullable=True),
            sa.Column('listing_id', sa.String(length=36), nullable=True),
            sa.Column('requirement_id', sa.String(length=64), nullable=True),
            sa.Column('sla_due_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(['listing_id'], ['listings.id'], ondelete='SET NULL'),
            sa.PrimaryKeyConstraint('id')
        )
        insp = inspect(bind)
        if op.f('ix_crm_leads_mobile') not in _ix_names(insp, 'crm_leads'):
            op.create_index(op.f('ix_crm_leads_mobile'), 'crm_leads', ['mobile'], unique=False)
        if op.f('ix_crm_leads_sla_due_at') not in _ix_names(inspect(bind), 'crm_leads'):
            op.create_index(op.f('ix_crm_leads_sla_due_at'), 'crm_leads', ['sla_due_at'], unique=False)
        tables = _refresh_tables(inspect(bind))

    if "user_roles" not in tables:
        op.create_table(
            'user_roles',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('user_id', sa.String(length=64), nullable=False),
            sa.Column('role_code', sa.String(length=32), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(['role_code'], ['rbac_roles.code'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('user_id', 'role_code', name='uq_user_role')
        )
        if op.f('ix_user_roles_user_id') not in _ix_names(inspect(bind), 'user_roles'):
            op.create_index(op.f('ix_user_roles_user_id'), 'user_roles', ['user_id'], unique=False)
        tables = _refresh_tables(inspect(bind))

    if "wallet_ledger_entries" not in tables:
        op.create_table(
            'wallet_ledger_entries',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('account_id', sa.String(length=36), nullable=False),
            sa.Column('amount_cents', sa.BigInteger(), nullable=False),
            sa.Column('entry_type', sa.Enum('CREDIT', 'DEBIT', name='ledgerentrytype', native_enum=False, length=16), nullable=False),
            sa.Column('reference_type', sa.String(length=64), nullable=False),
            sa.Column('reference_id', sa.String(length=64), nullable=True),
            sa.Column('idempotency_key', sa.String(length=128), nullable=True),
            sa.Column('memo', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(['account_id'], ['wallet_accounts.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        if op.f('ix_wallet_ledger_entries_account_id') not in _ix_names(inspect(bind), 'wallet_ledger_entries'):
            op.create_index(op.f('ix_wallet_ledger_entries_account_id'), 'wallet_ledger_entries', ['account_id'], unique=False)
        tables = _refresh_tables(inspect(bind))

    if "crm_activities" not in tables:
        op.create_table(
            'crm_activities',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('lead_id', sa.String(length=36), nullable=False),
            sa.Column('type', sa.Enum('CALL', 'NOTE', 'FOLLOW_UP', name='crmactivitytype', native_enum=False, length=32), nullable=False),
            sa.Column('note', sa.Text(), nullable=False),
            sa.Column('user_id', sa.String(length=64), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(['lead_id'], ['crm_leads.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        if op.f('ix_crm_activities_lead_id') not in _ix_names(inspect(bind), 'crm_activities'):
            op.create_index(op.f('ix_crm_activities_lead_id'), 'crm_activities', ['lead_id'], unique=False)
        tables = _refresh_tables(inspect(bind))

    if "visits" not in tables:
        op.create_table(
            'visits',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('listing_id', sa.String(length=36), nullable=True),
            # crm_leads.id is UUID (0004_wizard_crm_roles); VARCHAR FK fails on PostgreSQL
            sa.Column('crm_lead_id', sa.Uuid(), nullable=True),
            sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('status', sa.Enum('REQUESTED', 'SCHEDULED', 'COMPLETED', 'NO_SHOW', 'CANCELLED', name='visitstatus', native_enum=False, length=32), nullable=False),
            sa.Column('outcome', sa.Enum('NONE', 'INTERESTED', 'NOT_INTERESTED', 'DEAL_STARTED', name='visitoutcome', native_enum=False, length=32), nullable=False),
            sa.Column('outcome_notes', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(['crm_lead_id'], ['crm_leads.id'], ondelete='SET NULL'),
            sa.ForeignKeyConstraint(['listing_id'], ['listings.id'], ondelete='SET NULL'),
            sa.PrimaryKeyConstraint('id')
        )
        insp = inspect(bind)
        if op.f('ix_visits_crm_lead_id') not in _ix_names(insp, 'visits'):
            op.create_index(op.f('ix_visits_crm_lead_id'), 'visits', ['crm_lead_id'], unique=False)
        if op.f('ix_visits_listing_id') not in _ix_names(inspect(bind), 'visits'):
            op.create_index(op.f('ix_visits_listing_id'), 'visits', ['listing_id'], unique=False)
        if op.f('ix_visits_scheduled_at') not in _ix_names(inspect(bind), 'visits'):
            op.create_index(op.f('ix_visits_scheduled_at'), 'visits', ['scheduled_at'], unique=False)

    _p1_seed_rbac_and_geo()


def _p1_seed_rbac_and_geo() -> None:
    conn = op.get_bind()
    try:
        n = conn.execute(text("SELECT COUNT(*) FROM rbac_roles")).scalar()
        if n is not None and int(n) > 0:
            return
    except Exception:
        return

    now = datetime.now(timezone.utc)
    roles = [
        ("admin", "مدیر سامانه", json.dumps(["*"])),
        (
            "agent",
            "کارشناس فروش",
            json.dumps(
                [
                    "crm:read",
                    "crm:write",
                    "contracts:read",
                    "visits:read",
                    "visits:write",
                    "listings:read",
                ]
            ),
        ),
        (
            "manager",
            "مدیر دفتر",
            json.dumps(
                [
                    "crm:*",
                    "contracts:*",
                    "listings:*",
                    "reports:read",
                    "wallets:read",
                    "wallets:write",
                    "legal:read",
                    "legal:write",
                    "notifications:read",
                    "notifications:write",
                    "roles:read",
                    "roles:write",
                ]
            ),
        ),
        (
            "support",
            "پشتیبانی",
            json.dumps(["crm:read", "users:read", "notifications:read"]),
        ),
    ]
    for code, label, perms in roles:
        conn.execute(
            text(
                "INSERT INTO rbac_roles (code, label, permissions_json, created_at) "
                "VALUES (:code, :label, :perms, :ts)"
            ),
            {"code": code, "label": label, "perms": perms, "ts": now},
        )
    provinces = [
        ("08", "تهران", 8),
        ("04", "اصفهان", 4),
        ("14", "فارس", 14),
        ("29", "خراسان رضوی", 29),
        ("07", "خوزستان", 7),
    ]
    for pid, name, so in provinces:
        conn.execute(
            text(
                "INSERT INTO provinces (id, name_fa, sort_order, created_at) "
                "VALUES (:id, :n, :so, :ts)"
            ),
            {"id": pid, "n": name, "so": so, "ts": now},
        )
    cities_data = [
        ("08", "تهران"),
        ("08", "ری"),
        ("04", "اصفهان"),
        ("04", "کاشان"),
        ("14", "شیراز"),
        ("29", "مشهد"),
        ("07", "اهواز"),
    ]
    for pid, cname in cities_data:
        conn.execute(
            text(
                "INSERT INTO cities (id, province_id, name_fa, created_at) "
                "VALUES (:id, :pid, :n, :ts)"
            ),
            {"id": str(uuid.uuid4()), "pid": pid, "n": cname, "ts": now},
        )


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index(op.f('ix_visits_scheduled_at'), table_name='visits')
    op.drop_index(op.f('ix_visits_listing_id'), table_name='visits')
    op.drop_index(op.f('ix_visits_crm_lead_id'), table_name='visits')
    op.drop_table('visits')
    op.drop_index(op.f('ix_crm_activities_lead_id'), table_name='crm_activities')
    op.drop_table('crm_activities')
    op.drop_index(op.f('ix_wallet_ledger_entries_account_id'), table_name='wallet_ledger_entries')
    op.drop_table('wallet_ledger_entries')
    op.drop_index(op.f('ix_user_roles_user_id'), table_name='user_roles')
    op.drop_table('user_roles')
    op.drop_index(op.f('ix_crm_leads_sla_due_at'), table_name='crm_leads')
    op.drop_index(op.f('ix_crm_leads_mobile'), table_name='crm_leads')
    op.drop_table('crm_leads')
    op.drop_index(op.f('ix_cities_province_id'), table_name='cities')
    op.drop_table('cities')
    op.drop_index(op.f('ix_wallet_accounts_user_id'), table_name='wallet_accounts')
    op.drop_table('wallet_accounts')
    op.drop_index(op.f('ix_registry_jobs_tracking_code'), table_name='registry_jobs')
    op.drop_index(op.f('ix_registry_jobs_contract_id'), table_name='registry_jobs')
    op.drop_table('registry_jobs')
    op.drop_table('rbac_roles')
    op.drop_table('provinces')
    op.drop_index(op.f('ix_payment_intents_user_id'), table_name='payment_intents')
    op.drop_table('payment_intents')
    op.drop_table('notification_events')
    op.drop_index(op.f('ix_legal_reviews_contract_id'), table_name='legal_reviews')
    op.drop_table('legal_reviews')
    op.drop_index(op.f('ix_audit_log_entries_user_id'), table_name='audit_log_entries')
    op.drop_table('audit_log_entries')
    # ### end Alembic commands ###
