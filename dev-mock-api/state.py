"""Shared in-memory stores for dev-mock-api extended admin/workspace routes."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


workspace_tasks: List[Dict[str, Any]] = []
workspace_presence: List[Dict[str, Any]] = []
workspace_files: List[Dict[str, Any]] = []

ads: List[Dict[str, Any]] = [
    {
        "id": "ad-1",
        "title": "آگهی نمونه — فروش آپارتمان",
        "status": "ACTIVE",
        "city": "تهران",
        "created_at": now_iso(),
    }
]

user_timelines: Dict[str, List[Dict[str, Any]]] = {}
user_payments: Dict[str, List[Dict[str, Any]]] = {}
user_ledgers: Dict[str, List[Dict[str, Any]]] = {}
user_tickets: Dict[str, List[Dict[str, Any]]] = {}

staff_options: List[Dict[str, Any]] = [
    {"id": "mock-001", "name": "کاربر آزمایشی", "title": "مدیر"},
    {"id": "staff-2", "name": "کارشناس حقوقی", "title": "بررسی قرارداد"},
]

# قراردادهای PR (هم‌نام با API قدیمی Hamgit؛ در mock خالی تا UI لیست را نشان دهد)
pr_contracts: List[Dict[str, Any]] = []
