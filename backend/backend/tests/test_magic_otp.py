from __future__ import annotations

from app.services.magic_otp import (
    is_magic_mobile,
    magic_otp_code,
    normalize_mobile_ir,
    normalized_magic_mobile,
    verify_magic_pair,
)


def test_normalize_mobile_variants() -> None:
    assert normalize_mobile_ir("09107709601") == "09107709601"
    assert normalize_mobile_ir("9107709601") == "09107709601"
    assert normalize_mobile_ir("+989107709601") == "09107709601"


def test_verify_magic_pair_against_configured_magic() -> None:
    m = normalized_magic_mobile()
    c = magic_otp_code()
    assert verify_magic_pair(m, c) is True
    assert verify_magic_pair(m, "00000") is False
    assert verify_magic_pair("09121111111", c) is False


def test_is_magic_mobile_matches_normalized() -> None:
    m = normalized_magic_mobile()
    assert is_magic_mobile(m) is True
    assert is_magic_mobile("09121111111") is False
