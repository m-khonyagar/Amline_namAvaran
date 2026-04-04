"""Placeholder adapters for external systems named in Amline SSOT (v2.0 target).

Production integrations for e‑sign (Khodnevis, Katib), PSPs (Zarinpal, IDPay, NextPay),
and SMS live under ``app/integrations/`` and env-driven providers (see ``PSP_INTEGRATION.md``).
This module documents the intended boundary until each adapter is fully SSOT-aligned.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any, Protocol


class AdapterStatus(str, Enum):
    NOT_CONFIGURED = "not_configured"
    STUB = "stub"
    LIVE = "live"


@dataclass
class AdapterInfo:
    name: str
    status: AdapterStatus
    notes: str


class EsignProvider(Protocol):
    """Khodnevis / Katib — contract PDF submission & status (SSOT signature flows S1–S5)."""

    def submit_document(self, contract_id: str, payload: dict[str, Any]) -> dict[str, Any]: ...

    def poll_status(self, external_ref: str) -> dict[str, Any]: ...


class SmsGatewayProvider(Protocol):
    """SMS OTP / notifications (Ghasedak chain documented in repo)."""

    def send_otp(self, phone: str, message: str, metadata: dict[str, Any]) -> dict[str, Any]: ...


def ssot_adapter_registry() -> list[AdapterInfo]:
    """Introspection for admin/ops — not an HTTP route yet."""
    return [
        AdapterInfo("khodnevis", AdapterStatus.NOT_CONFIGURED, "Wire to SSOT S1–S5 handoff"),
        AdapterInfo("katib", AdapterStatus.NOT_CONFIGURED, "Wire to SSOT S1–S5 handoff"),
        AdapterInfo("psp_zarinpal", AdapterStatus.STUB, "See payment service + PSP_INTEGRATION.md"),
        AdapterInfo("psp_idpay", AdapterStatus.STUB, "See payment service + PSP_INTEGRATION.md"),
        AdapterInfo("psp_nextpay", AdapterStatus.STUB, "See payment service + PSP_INTEGRATION.md"),
        AdapterInfo("sms_ghasedak", AdapterStatus.STUB, "See OTP / notification services"),
    ]
