from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

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


def test_magic_otp_off_without_explicit_enable_in_clean_process() -> None:
    """Production-safe default: no env flag => no bypass (fresh interpreter, no conftest)."""
    backend_root = Path(__file__).resolve().parents[1]
    script = """
import os
os.environ.pop("AMLINE_OTP_MAGIC_ENABLED", None)
from app.services import magic_otp as mo
assert mo.magic_otp_enabled() is False
assert mo.is_magic_mobile("09107709601") is False
assert mo.verify_magic_pair("09107709601", "11111") is False
"""
    env = {k: v for k, v in os.environ.items() if k != "AMLINE_OTP_MAGIC_ENABLED"}
    proc = subprocess.run(
        [sys.executable, "-c", script],
        cwd=str(backend_root),
        capture_output=True,
        text=True,
        env=env,
        timeout=60,
    )
    assert proc.returncode == 0, proc.stdout + proc.stderr
