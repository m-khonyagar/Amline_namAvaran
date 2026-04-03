"""Thumbor preset URL builder."""
from __future__ import annotations

import pytest

from app.core.thumbor_urls import THUMBOR_PRESETS, thumbor_image_url, thumbor_preset_url


def test_thumbor_preset_url_unknown_returns_none(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("THUMBOR_BASE_URL", "http://thumbor.test")
    monkeypatch.setenv("THUMBOR_SECURITY_KEY", "")
    assert thumbor_preset_url("k/x.jpg", "nope") is None


def test_thumbor_preset_matches_manual_size(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("THUMBOR_BASE_URL", "http://t")
    monkeypatch.setenv("THUMBOR_SECURITY_KEY", "")
    u1 = thumbor_preset_url("img/a.png", "card")
    u2 = thumbor_image_url("img/a.png", width=400, height=300)
    assert u1 == u2
    assert "400x300" in (u1 or "")


def test_presets_dict_nonempty() -> None:
    assert "thumb" in THUMBOR_PRESETS
    assert "card" in THUMBOR_PRESETS
