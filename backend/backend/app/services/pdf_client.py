"""
PDF Generator client — calls the pdf-generator microservice.
Falls back gracefully if the service is unavailable.
"""
from __future__ import annotations

import logging
from typing import Any, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


def _pdf_payments_from_parties(parties: dict[str, Any]) -> list[dict[str, Any]]:
    """مراحل پرداخت (ریال) → تومان برای قالب PDF."""
    raw = (
        parties.get("sale_payment_stages")
        or parties.get("rent_payment_stages")
        or parties.get("mortgage_payment_stages")
        or parties.get("payment_stages")
        or []
    )
    if not isinstance(raw, list):
        return []
    out: list[dict[str, Any]] = []
    for p in raw:
        if not isinstance(p, dict):
            continue
        amt = int(p.get("amount", 0) or 0)
        out.append(
            {
                "amount": max(0, amt // 10),
                "due_date": str(p.get("due_date", "") or ""),
                "payment_type": str(p.get("payment_type", "") or ""),
                "description": p.get("description"),
            }
        )
    return out


async def request_contract_pdf(
    contract_id: str,
    contract_type: str,
    contract_data: dict[str, Any],
) -> Optional[str]:
    """
    درخواست تولید PDF قرارداد از سرویس pdf-generator.
    در صورت موفقیت URL فایل را برمی‌گرداند، در غیر این صورت None.
    """
    url = f"{settings.pdf_generator_url}/generate/pr-contract"
    rent_rial = int(contract_data.get("rent_amount", 0) or 0)
    dep_rial = int(contract_data.get("deposit_amount", 0) or 0)
    sale_rial = int(contract_data.get("sale_price", 0) or 0)
    payload = {
        "contract_id": contract_id,
        "contract_kind": contract_type or "PROPERTY_RENT",
        "start_date": contract_data.get("start_date", contract_data.get("lease_start_date", "")),
        "end_date": contract_data.get("end_date", contract_data.get("lease_end_date", "")),
        "landlord": {
            "full_name": contract_data.get("landlord_name", contract_data.get("seller_display_name", "نامشخص")),
            "national_id": contract_data.get("landlord_national_id", ""),
            "phone": contract_data.get("landlord_mobile", ""),
        },
        "tenant": {
            "full_name": contract_data.get("tenant_name", contract_data.get("buyer_display_name", "نامشخص")),
            "national_id": contract_data.get("tenant_national_id", ""),
            "phone": contract_data.get("tenant_mobile", ""),
        },
        "property": {
            "address": contract_data.get("property_address", ""),
            "postal_code": str(contract_data.get("postal_code", "") or ""),
            "area": float(contract_data.get("area_m2", 0) or 0),
            "type": contract_data.get("property_use_type", "مسکونی"),
        },
        "monthly_rent": max(0, rent_rial // 10),
        "deposit": max(0, dep_rial // 10),
        "sale_total_price": max(0, sale_rial // 10),
        "payments": _pdf_payments_from_parties(contract_data),
        "clauses": [],
        "save_to_minio": True,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("file_url")
            logger.warning("pdf-generator returned %s: %s", resp.status_code, resp.text[:200])
            return None
    except Exception as exc:
        logger.warning("pdf-generator unavailable: %s", exc)
        return None
