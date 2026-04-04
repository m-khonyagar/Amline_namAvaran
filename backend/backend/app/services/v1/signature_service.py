from __future__ import annotations

import os
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional


class SignatureMethod(str, Enum):
    SELF_OTP = "SELF_OTP"
    AGENT_OTP = "AGENT_OTP"
    ADMIN_OTP = "ADMIN_OTP"
    AUTO = "AUTO"

from app.repositories.memory.state import get_store
from app.services.v1.otp_service import get_otp_service, mask_phone, normalize_mobile_ir


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _party_mobile(row: dict[str, Any], default: str) -> str:
    m = row.get("mobile")
    if m:
        return str(m)
    npd = row.get("natural_person_detail")
    if isinstance(npd, dict) and npd.get("mobile"):
        return str(npd["mobile"])
    lpd = row.get("legal_person_detail")
    if isinstance(lpd, dict):
        signers = lpd.get("signers") or []
        if signers and isinstance(signers[0], dict) and signers[0].get("mobile"):
            return str(signers[0]["mobile"])
    return default


def _resolve_party(
    contract: dict[str, Any], party_id: Optional[str | int]
) -> tuple[dict[str, Any] | None, Optional[str]]:
    parties = contract.get("parties") or {}
    ordered: list[tuple[str, dict[str, Any]]] = []
    for bucket in ("landlords", "tenants"):
        for row in parties.get(bucket) or []:
            ordered.append((bucket, row))

    if party_id is not None and str(party_id).strip() != "":
        pid = str(party_id)
        for _bucket, row in ordered:
            if str(row.get("id")) == pid:
                return row, row.get("id") if isinstance(row.get("id"), str) else pid

    for _bucket, row in ordered:
        if not row.get("signed"):
            rid = row.get("id")
            return row, str(rid) if rid is not None else None

    if ordered:
        row = ordered[0][1]
        rid = row.get("id")
        return row, str(rid) if rid is not None else None

    return None, None


def _estimate_contract_value_rial(contract: dict[str, Any]) -> int:
    """برای S5: آستانه خودکار از terms یا اجاره."""
    terms = contract.get("terms") or {}
    if isinstance(terms, dict):
        tp = terms.get("total_price")
        if isinstance(tp, int) and tp > 0:
            return tp
    ri = contract.get("renting_info") or {}
    if isinstance(ri, dict):
        rent = ri.get("rent_amount") or ri.get("monthly_rent")
        if isinstance(rent, int) and rent > 0:
            return rent * 12
    inv = contract.get("payments") or {}
    if isinstance(inv, dict) and inv.get("total_amount"):
        try:
            return int(inv["total_amount"])
        except (TypeError, ValueError):
            pass
    return 0


def _append_signature_event(
    contract: dict[str, Any],
    *,
    kind: str,
    party_id: Optional[str],
    phone_masked: str,
    ip: Optional[str],
    user_agent: Optional[str],
    extra: Optional[dict[str, Any]] = None,
) -> None:
    ev: dict[str, Any] = {
        "type": kind,
        "timestamp": _now_iso(),
        "ip": ip,
        "user_agent": user_agent,
        "party_id": party_id,
        "phone_masked": phone_masked,
    }
    if extra:
        ev.update(extra)
    contract.setdefault("signature_events", []).append(ev)


class SignatureService:
    def request_contract_sign(
        self,
        contract_id: str,
        *,
        party_id: Optional[str | int],
        mobile_override: Optional[str],
        client_ip: Optional[str],
        user_agent: Optional[str],
    ) -> dict[str, Any]:
        store = get_store()
        c = store.get_contract(contract_id)
        row, resolved_party_id = _resolve_party(c, party_id)
        default_phone = store.mock_user.get("mobile") or "09120000000"
        if row is None:
            phone = mobile_override or default_phone
            pid = None
        else:
            phone = mobile_override or _party_mobile(row, default_phone)
            pid = resolved_party_id

        otp = get_otp_service()
        return otp.create_and_send(
            phone=phone,
            contract_id=contract_id,
            party_id=pid,
            purpose="contract_sign",
            request_ip=client_ip,
            request_user_agent=user_agent,
        )

    def verify_contract_sign(
        self,
        contract_id: str,
        *,
        otp: str,
        mobile: str,
        party_id: Optional[str | int],
        salt: Optional[str],
        challenge_id: Optional[str],
        client_ip: Optional[str],
        user_agent: Optional[str],
        signature_method: SignatureMethod = SignatureMethod.SELF_OTP,
        agent_user_id: Optional[str] = None,
        otp_purpose: str = "contract_sign",
    ) -> dict[str, Any]:
        store = get_store()
        c = store.get_contract(contract_id)
        row, resolved_party_id = _resolve_party(c, party_id)

        rec = get_otp_service().verify(
            contract_id=contract_id,
            phone=mobile,
            purpose=otp_purpose,  # type: ignore[arg-type]
            otp=otp,
            challenge_id=challenge_id,
            verify_ip=client_ip,
            verify_user_agent=user_agent,
        )

        pid = rec.party_id or resolved_party_id
        phone_norm = normalize_mobile_ir(mobile)

        if row is not None and pid and str(row.get("id")) == str(pid):
            row["signed"] = True
            row["signed_at"] = _now_iso()
            row["signature_audit"] = {
                "method": signature_method.value,
                "timestamp": _now_iso(),
                "ip": client_ip,
                "user_agent": user_agent,
                "salt": salt,
                "agent_user_id": agent_user_id,
            }
        elif pid:
            parties = c.setdefault("parties", {})
            for bucket in ("landlords", "tenants"):
                for p in parties.get(bucket) or []:
                    if str(p.get("id")) == str(pid):
                        p["signed"] = True
                        p["signed_at"] = _now_iso()
                        p["signature_audit"] = {
                            "method": signature_method.value,
                            "timestamp": _now_iso(),
                            "ip": client_ip,
                            "user_agent": user_agent,
                            "salt": salt,
                            "agent_user_id": agent_user_id,
                        }
                        row = p
                        break

        _append_signature_event(
            c,
            kind="contract_sign_verified",
            party_id=str(pid) if pid else None,
            phone_masked=mask_phone(phone_norm),
            ip=client_ip,
            user_agent=user_agent,
            extra={
                "challenge_id": rec.id,
                "salt": salt,
                "signature_method": signature_method.value,
                "agent_user_id": agent_user_id,
            },
        )

        if c.get("step") == "SIGNING" and c.get("status") == "DRAFT":
            c["status"] = "SIGNING"

        return {"ok": True}

    def sign_as_agent(
        self,
        contract_id: str,
        *,
        party_id: str | int,
        otp_code: str,
        agent_user_id: str,
        mobile: str,
        salt: Optional[str] = None,
        challenge_id: Optional[str] = None,
        client_ip: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> dict[str, Any]:
        """امضا توسط کاتب/نماینده با همان مسیر verify OTP؛ ممیزی با agent_user_id."""
        return self.verify_contract_sign(
            contract_id,
            otp=otp_code,
            mobile=mobile,
            party_id=party_id,
            salt=salt,
            challenge_id=challenge_id,
            client_ip=client_ip,
            user_agent=user_agent,
            signature_method=SignatureMethod.AGENT_OTP,
            agent_user_id=agent_user_id,
        )

    def request_witness(
        self,
        contract_id: str,
        *,
        mobile: str,
        national_code: str,
        witness_type: Optional[str],
        witness_name: Optional[str],
        client_ip: Optional[str],
        user_agent: Optional[str],
    ) -> dict[str, Any]:
        store = get_store()
        store.get_contract(contract_id)
        otp = get_otp_service()
        return otp.create_and_send(
            phone=mobile,
            contract_id=contract_id,
            party_id=None,
            purpose="witness",
            request_ip=client_ip,
            request_user_agent=user_agent,
            witness_national_code=national_code,
            witness_type=witness_type,
        )

    def verify_witness(
        self,
        contract_id: str,
        *,
        otp: str,
        mobile: str,
        national_code: str,
        salt: Optional[str],
        witness_type: Optional[str],
        challenge_id: Optional[str],
        client_ip: Optional[str],
        user_agent: Optional[str],
        next_step: Optional[str],
    ) -> dict[str, Any]:
        store = get_store()
        c = store.get_contract(contract_id)

        rec = get_otp_service().verify(
            contract_id=contract_id,
            phone=mobile,
            purpose="witness",
            otp=otp,
            challenge_id=challenge_id,
            verify_ip=client_ip,
            verify_user_agent=user_agent,
            national_code=national_code,
        )

        phone_norm = normalize_mobile_ir(mobile)
        masked = mask_phone(phone_norm)
        witness_state = c.setdefault("witness", {})
        witness_state["verified"] = True
        witness_state["verified_at"] = _now_iso()
        witness_state["witness_type"] = witness_type or rec.witness_type
        witness_state["national_code"] = national_code
        witness_state["audit"] = {
            "ip": client_ip,
            "user_agent": user_agent,
            "salt": salt,
        }

        _append_signature_event(
            c,
            kind="witness_verified",
            party_id=None,
            phone_masked=masked,
            ip=client_ip,
            user_agent=user_agent,
            extra={
                "national_code": national_code,
                "witness_type": witness_type or rec.witness_type,
                "salt": salt,
            },
        )

        nxt = next_step or "FINISH"
        c["step"] = nxt
        c["status"] = "COMPLETED"
        return {"ok": True, "next_step": nxt}

    def _admin_assist_mobile(self) -> str:
        store = get_store()
        return (
            os.getenv("AMLINE_ADMIN_ASSIST_MOBILE", "").strip()
            or str(store.mock_user.get("mobile") or "09120000000")
        )

    def request_admin_assist_sign(
        self,
        contract_id: str,
        *,
        party_id: str,
        client_ip: Optional[str],
        user_agent: Optional[str],
    ) -> dict[str, Any]:
        """S4: OTP به موبایل ادمین/کارشناس املاین."""
        store = get_store()
        store.get_contract(contract_id)
        phone = self._admin_assist_mobile()
        otp = get_otp_service()
        return otp.create_and_send(
            phone=phone,
            contract_id=contract_id,
            party_id=str(party_id),
            purpose="admin_assisted_sign",
            request_ip=client_ip,
            request_user_agent=user_agent,
        )

    def verify_admin_assist_sign(
        self,
        contract_id: str,
        *,
        otp: str,
        mobile: str,
        party_id: str,
        agent_user_id: str,
        salt: Optional[str],
        challenge_id: Optional[str],
        client_ip: Optional[str],
        user_agent: Optional[str],
    ) -> dict[str, Any]:
        return self.verify_contract_sign(
            contract_id,
            otp=otp,
            mobile=mobile,
            party_id=party_id,
            salt=salt,
            challenge_id=challenge_id,
            client_ip=client_ip,
            user_agent=user_agent,
            signature_method=SignatureMethod.ADMIN_OTP,
            agent_user_id=agent_user_id,
            otp_purpose="admin_assisted_sign",
        )

    def apply_auto_sign_if_eligible(
        self,
        contract_id: str,
        *,
        client_ip: Optional[str],
        user_agent: Optional[str],
    ) -> dict[str, Any]:
        """S5: در صورت فعال بودن env و زیر آستانه."""
        if os.getenv("AMLINE_CONTRACT_AUTO_SIGN_ENABLED", "").lower() not in (
            "1",
            "true",
            "yes",
        ):
            return {"ok": False, "reason": "auto_sign_disabled"}
        max_rial = int(os.getenv("AMLINE_CONTRACT_AUTO_SIGN_MAX_RIAL", "0") or "0")
        store = get_store()
        c = store.get_contract(contract_id)
        val = _estimate_contract_value_rial(c)
        if max_rial <= 0 or val > max_rial:
            return {
                "ok": False,
                "reason": "above_threshold_or_invalid_max",
                "value": val,
                "max": max_rial,
            }
        parties = c.setdefault("parties", {})
        signed_ids: list[str] = []
        for bucket in ("landlords", "tenants", "sellers", "buyers"):
            for row in parties.get(bucket) or []:
                if not isinstance(row, dict):
                    continue
                if row.get("signed"):
                    continue
                pid = row.get("id")
                if not pid:
                    continue
                row["signed"] = True
                row["signed_at"] = _now_iso()
                row["signature_audit"] = {
                    "method": SignatureMethod.AUTO.value,
                    "timestamp": _now_iso(),
                    "ip": client_ip,
                    "user_agent": user_agent,
                }
                signed_ids.append(str(pid))
                _append_signature_event(
                    c,
                    kind="contract_sign_auto",
                    party_id=str(pid),
                    phone_masked="AUTO",
                    ip=client_ip,
                    user_agent=user_agent,
                    extra={"signature_method": SignatureMethod.AUTO.value},
                )
        return {"ok": True, "signed_party_ids": signed_ids}


_sig: SignatureService | None = None


def get_signature_service() -> SignatureService:
    global _sig
    if _sig is None:
        _sig = SignatureService()
    return _sig
