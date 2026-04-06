"""Parse and apply commission invoice discount codes (percent off gross total, rial)."""
from __future__ import annotations

from typing import Any, Dict, Optional


def parse_discount_percent_map(raw: str) -> dict[str, int]:
    """CSV like CODE:percent,CODE2:percent — percent is 1–99 off total_amount."""
    out: dict[str, int] = {}
    if not raw or not raw.strip():
        return out
    for part in raw.split(","):
        part = part.strip()
        if not part or ":" not in part:
            continue
        key, val = part.split(":", 1)
        k = key.strip().upper()
        if not k:
            continue
        try:
            pct = int(val.strip())
        except ValueError:
            continue
        if 1 <= pct <= 99:
            out[k] = pct
    return out


def lookup_discount_percent(codes_csv: str, code: Optional[str]) -> Optional[int]:
    if not code or not str(code).strip():
        return None
    m = parse_discount_percent_map(codes_csv)
    return m.get(str(code).strip().upper())


def apply_percent_discount_to_invoice(base: Dict[str, Any], percent: int) -> Dict[str, Any]:
    """Reduce total_amount by percent; split net 50/50. Preserves commission/tax lines (gross breakdown)."""
    gross = int(base["total_amount"])
    discount = gross * int(percent) // 100
    net = max(0, gross - discount)
    landlord = net // 2
    tenant = net - landlord
    out = dict(base)
    out["gross_total_amount"] = gross
    out["discount_amount"] = discount
    out["discount_percent"] = int(percent)
    out["total_amount"] = net
    out["landlord_share"] = landlord
    out["tenant_share"] = tenant
    return out


def invoice_with_optional_discount(
    base: Dict[str, Any],
    codes_csv: str,
    discount_code: Optional[str],
    *,
    reject_invalid: bool,
) -> Dict[str, Any]:
    """
    If discount_code is empty, return base unchanged (no extra keys).
    If set and invalid: raise ValueError when reject_invalid else return base.
    """
    code = (discount_code or "").strip()
    if not code:
        return dict(base)
    pct = lookup_discount_percent(codes_csv, code)
    if pct is None:
        if reject_invalid:
            raise ValueError("invalid_discount_code")
        return dict(base)
    return apply_percent_discount_to_invoice(base, pct)
