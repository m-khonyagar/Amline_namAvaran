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


async def request_contract_pdf(
    contract_id: str,
    contract_data: dict[str, Any],
) -> Optional[str]:
    """
    درخواست تولید PDF قرارداد از سرویس pdf-generator.
    در صورت موفقیت URL فایل را برمی‌گرداند، در غیر این صورت None.
    """
    url = f"{settings.pdf_generator_url}/generate/pr-contract"
    payload = {
        "contract_id": contract_id,
        "start_date": contract_data.get("start_date", ""),
        "end_date": contract_data.get("end_date", ""),
        "landlord": {
            "full_name": contract_data.get("landlord_name", "نامشخص"),
            "national_id": contract_data.get("landlord_national_id", ""),
            "phone": contract_data.get("landlord_mobile", ""),
        },
        "tenant": {
            "full_name": contract_data.get("tenant_name", "نامشخص"),
            "national_id": contract_data.get("tenant_national_id", ""),
            "phone": contract_data.get("tenant_mobile", ""),
        },
        "property": {
            "address": contract_data.get("property_address", ""),
            "postal_code": contract_data.get("postal_code", ""),
            "area": contract_data.get("area_m2", 0),
            "type": contract_data.get("property_use_type", "مسکونی"),
        },
        "monthly_rent": contract_data.get("rent_amount", 0),
        "deposit": contract_data.get("deposit_amount", 0),
        "payments": contract_data.get("payment_stages", []),
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
