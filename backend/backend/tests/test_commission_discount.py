import pytest

from app.domain.commission_discount import (
    apply_percent_discount_to_invoice,
    invoice_with_optional_discount,
    lookup_discount_percent,
    parse_discount_percent_map,
)


def test_parse_discount_map():
    m = parse_discount_percent_map(" A:10 , :bad, NOPE, X:0, Y:100, Z:50 ")
    assert m == {"A": 10, "Z": 50}


def test_lookup():
    assert lookup_discount_percent("AMLINE50:50", "amline50") == 50
    assert lookup_discount_percent("", "X") is None


def test_apply_percent():
    base = {
        "commission": 5_000_000,
        "tax": 500_000,
        "tracking_code_fee": 50_000,
        "total_amount": 5_550_000,
        "landlord_share": 2_775_000,
        "tenant_share": 2_775_000,
    }
    out = apply_percent_discount_to_invoice(base, 50)
    assert out["gross_total_amount"] == 5_550_000
    assert out["discount_amount"] == 2_775_000
    assert out["total_amount"] == 2_775_000
    assert out["landlord_share"] + out["tenant_share"] == out["total_amount"]


def test_invoice_optional_reject_invalid():
    base = {"total_amount": 1000, "landlord_share": 500, "tenant_share": 500}
    out = invoice_with_optional_discount(base, "X:10", None, reject_invalid=False)
    assert out["total_amount"] == 1000
    with pytest.raises(ValueError, match="invalid_discount_code"):
        invoice_with_optional_discount(base, "X:10", "BAD", reject_invalid=True)
