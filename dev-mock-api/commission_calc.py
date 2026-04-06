"""
Commission math aligned with backend PRContractCommissionService (no app.* import).
Used by dev-mock-api when running outside the backend package path.
"""
from __future__ import annotations

from typing import Any, Dict


def _round_down(amount: float) -> int:
    return int(amount * 0.001) * 1000


TRACKING = 50_000
TAX_PCT = 0.1
RENT_LOW_THRESHOLD = 100_000
SALE_LOW_THRESHOLD = 10_000_000


def calculate_sale_invoice_rial(sale_price_rial: int) -> Dict[str, Any]:
    """sale_price_rial → invoice fields in rial (same scaling as backend ×10 from toman)."""
    sale_toman = sale_price_rial // 10
    if sale_toman <= SALE_LOW_THRESHOLD:
        raw = sale_toman * 0.01
    else:
        raw = sale_toman * 0.005 + 50_000
    per_party = _round_down(raw / 2)
    commission_full = per_party * 2
    tax = _round_down(commission_full * TAX_PCT)
    total = commission_full + tax + TRACKING
    return {
        "commission": commission_full * 10,
        "tax": tax * 10,
        "tracking_code_fee": TRACKING * 10,
        "total_amount": total * 10,
        "landlord_share": (total // 2) * 10,
        "tenant_share": (total - (total // 2)) * 10,
    }


def calculate_rent_invoice_rial(rent_rial: int, deposit_rial: int) -> Dict[str, Any]:
    rent = rent_rial // 10
    dep = deposit_rial // 10
    if rent <= RENT_LOW_THRESHOLD:
        rent_part = rent * 0.4
    else:
        rent_part = rent * 0.3 + 10_000
    deposit_part = dep * 0.006
    commission = _round_down((rent_part + deposit_part) / 2)
    tax = _round_down(commission * TAX_PCT)
    total = commission + tax + TRACKING
    return {
        "commission": commission * 10,
        "tax": tax * 10,
        "tracking_code_fee": TRACKING * 10,
        "total_amount": total * 10,
        "landlord_share": (total // 2) * 10,
        "tenant_share": (total - (total // 2)) * 10,
    }


def commission_invoice_from_contract_dict(c: Dict[str, Any]) -> Dict[str, Any]:
    parties = c.get("parties") or {}
    if not isinstance(parties, dict):
        parties = {}
    ct = c.get("type") or "PROPERTY_RENT"
    if ct == "BUYING_AND_SELLING":
        sale_rial = int(parties.get("sale_price", 0) or 0)
        if sale_rial > 0:
            return calculate_sale_invoice_rial(sale_rial)
    rent_rial = int(parties.get("rent_amount", 0) or 0)
    dep_rial = int(parties.get("deposit_amount", 0) or 0)
    if rent_rial > 0 or dep_rial > 0:
        return calculate_rent_invoice_rial(rent_rial, dep_rial)
    return {
        "commission": 5_000_000,
        "tax": 500_000,
        "tracking_code_fee": 50_000,
        "total_amount": 5_550_000,
        "landlord_share": 2_775_000,
        "tenant_share": 2_775_000,
    }
