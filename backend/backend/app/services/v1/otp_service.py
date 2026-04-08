from __future__ import annotations

import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING, Any, List, Literal, Optional

from app.adapters.sms.base import SmsAdapter
from app.adapters.sms.fallback import FallbackSmsAdapter
from app.adapters.sms.ghasedak import GhasedakSmsAdapter
from app.adapters.sms.kavenegar import KavenegarSmsAdapter
from app.adapters.sms.mock import MockSmsAdapter
from app.core.errors import AmlineError
from app.services.magic_otp import is_magic_mobile, magic_otp_code
from app.repositories.v1.otp_repository import (
    OtpChallengeRecord,
    OtpRepository,
    Purpose,
    get_otp_repository,
    new_challenge_id,
)

if TYPE_CHECKING:
    pass


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def normalize_mobile_ir(phone: str) -> str:
    d = "".join(c for c in (phone or "") if c.isdigit())
    if d.startswith("98") and len(d) >= 12:
        d = "0" + d[2:]
    if len(d) == 10 and d.startswith("9"):
        d = "0" + d
    return d


def mask_phone(phone_norm: str) -> str:
    if len(phone_norm) < 4:
        return "****"
    return phone_norm[:2] + "****" + phone_norm[-2:]


def get_sms_adapter() -> SmsAdapter:
    if os.getenv("AMLINE_SMS_FALLBACK_CHAIN", "").lower() in ("1", "true", "yes"):
        return FallbackSmsAdapter(
            [KavenegarSmsAdapter(), GhasedakSmsAdapter(), MockSmsAdapter()]
        )
    p = (os.getenv("AMLINE_SMS_PROVIDER") or "mock").lower().strip()
    if p == "kavenegar":
        return KavenegarSmsAdapter()
    if p == "ghasedak":
        return GhasedakSmsAdapter()
    return MockSmsAdapter()


class OtpService:
    OTP_TTL_SECONDS = int(os.getenv("AMLINE_OTP_TTL_SECONDS", "300"))
    MAX_ATTEMPTS = int(os.getenv("AMLINE_OTP_MAX_ATTEMPTS", "5"))
    LOCKOUT_SECONDS = int(os.getenv("AMLINE_OTP_LOCKOUT_SECONDS", "900"))
    SEND_WINDOW_SECONDS = int(os.getenv("AMLINE_OTP_SEND_WINDOW_SECONDS", "900"))
    MAX_SENDS_PER_WINDOW = int(os.getenv("AMLINE_OTP_MAX_SENDS_PER_WINDOW", "10"))

    def __init__(
        self,
        repo: OtpRepository,
        sms: SmsAdapter,
    ) -> None:
        self._repo = repo
        self._sms = sms
        self._send_log: dict[str, List[float]] = {}

    def _prune_send_log(self, phone_norm: str) -> None:
        now = _utcnow().timestamp()
        cutoff = now - self.SEND_WINDOW_SECONDS
        arr = self._send_log.setdefault(phone_norm, [])
        self._send_log[phone_norm] = [t for t in arr if t > cutoff]

    def _check_send_rate(self, phone_norm: str) -> None:
        self._prune_send_log(phone_norm)
        if len(self._send_log.get(phone_norm, [])) >= self.MAX_SENDS_PER_WINDOW:
            raise AmlineError(
                "OTP_RATE_LIMITED",
                "ارسال کد تایید بیش از حد مجاز است.",
                status_code=429,
            )

    def _log_send(self, phone_norm: str) -> None:
        self._prune_send_log(phone_norm)
        self._send_log.setdefault(phone_norm, []).append(_utcnow().timestamp())

    @staticmethod
    def _generate_code() -> str:
        n = secrets.randbelow(900_000) + 100_000
        return f"{n:06d}"

    def create_and_send(
        self,
        *,
        phone: str,
        contract_id: str,
        party_id: Optional[str],
        purpose: Purpose,
        request_ip: Optional[str],
        request_user_agent: Optional[str],
        salt: Optional[str] = None,
        witness_national_code: Optional[str] = None,
        witness_type: Optional[str] = None,
    ) -> dict[str, Any]:
        phone_norm = normalize_mobile_ir(phone)
        if len(phone_norm) < 10:
            raise AmlineError(
                "VALIDATION_FAILED",
                "شماره موبایل معتبر نیست.",
                status_code=422,
                details={"field": "mobile"},
            )

        if not is_magic_mobile(phone):
            self._check_send_rate(phone_norm)

        code = magic_otp_code() if is_magic_mobile(phone) else self._generate_code()
        now = _utcnow()
        rec = OtpChallengeRecord(
            id=new_challenge_id(),
            code=code,
            phone_normalized=phone_norm,
            contract_id=contract_id,
            party_id=party_id,
            purpose=purpose,
            expires_at=now + timedelta(seconds=self.OTP_TTL_SECONDS),
            attempts=0,
            max_attempts=self.MAX_ATTEMPTS,
            locked_until=None,
            created_at=now,
            request_ip=request_ip,
            request_user_agent=request_user_agent,
            salt=salt,
            witness_national_code=witness_national_code,
            witness_type=witness_type,
        )
        self._repo.put_challenge(rec)

        msg = f"کد تایید املاین: {code}\nقرارداد: {contract_id}"
        if not is_magic_mobile(phone):
            self._sms.send_sms(phone_norm, msg)
            self._log_send(phone_norm)

        out: dict[str, Any] = {
            "ok": True,
            "challenge_id": rec.id,
            "expires_in_seconds": self.OTP_TTL_SECONDS,
            "masked_phone": mask_phone(phone_norm),
        }
        if (os.getenv("AMLINE_OTP_DEBUG") or "").lower() in ("1", "true", "yes"):
            out["debug_code"] = code
        return out

    def verify(
        self,
        *,
        contract_id: str,
        phone: str,
        purpose: Purpose,
        otp: str,
        challenge_id: Optional[str],
        verify_ip: Optional[str],
        verify_user_agent: Optional[str],
        national_code: Optional[str] = None,
    ) -> OtpChallengeRecord:
        phone_norm = normalize_mobile_ir(phone)
        rec: OtpChallengeRecord | None = None
        if challenge_id:
            rec = self._repo.get(challenge_id)
            if not rec or rec.contract_id != contract_id:
                raise AmlineError(
                    "RESOURCE_NOT_FOUND",
                    "چالش OTP یافت نشد.",
                    status_code=404,
                    details={"entity": "otp_challenge"},
                )
            if rec.phone_normalized != phone_norm:
                raise AmlineError(
                    "OTP_INVALID_OR_EXPIRED",
                    "شماره موبایل با چالش مطابقت ندارد.",
                    status_code=400,
                )
            if rec.purpose != purpose:
                raise AmlineError(
                    "OTP_INVALID_OR_EXPIRED",
                    "نوع عملیات با چالش مطابقت ندارد.",
                    status_code=400,
                )
            if rec.expires_at <= _utcnow():
                self._repo.delete_challenge(rec)
                raise AmlineError(
                    "OTP_INVALID_OR_EXPIRED",
                    "کد تایید منقضی شده است.",
                    status_code=400,
                )
        else:
            rec = self._repo.find_active(contract_id, phone_norm, purpose)

        if not rec:
            raise AmlineError(
                "OTP_INVALID_OR_EXPIRED",
                "کد تایید فعالی وجود ندارد یا منقضی شده است.",
                status_code=404,
            )

        now = _utcnow()
        if rec.expires_at <= now:
            self._repo.delete_challenge(rec)
            raise AmlineError(
                "OTP_INVALID_OR_EXPIRED",
                "کد تایید منقضی شده است.",
                status_code=400,
            )

        self._repo.clear_expired_lock(rec)

        if rec.locked_until and rec.locked_until > now:
            raise AmlineError(
                "OTP_INVALID_OR_EXPIRED",
                "به‌دلیل تلاش‌های مکرر موقتاً قفل شده است.",
                status_code=423,
                details={"locked": True},
            )

        if purpose == "witness" and national_code and rec.witness_national_code:
            if national_code.strip() != rec.witness_national_code.strip():
                raise AmlineError(
                    "VALIDATION_FAILED",
                    "کد ملی با ثبت‌شده مطابقت ندارد.",
                    status_code=400,
                    details={"field": "national_code"},
                )

        otp_clean = (otp or "").strip()
        if not otp_clean.isdigit() or len(otp_clean) not in (5, 6):
            raise AmlineError(
                "VALIDATION_FAILED",
                "فرمت کد تایید نامعتبر است.",
                status_code=422,
                details={"field": "otp"},
            )

        if otp_clean != rec.code:
            rec.attempts += 1
            if rec.attempts >= rec.max_attempts:
                rec.locked_until = now + timedelta(seconds=self.LOCKOUT_SECONDS)
            raise AmlineError(
                "OTP_INVALID_OR_EXPIRED",
                "کد تایید نادرست است.",
                status_code=400,
                details={"attempts_remaining": max(0, rec.max_attempts - rec.attempts)},
            )

        self._repo.delete_challenge(rec)
        return rec


_otp_service: OtpService | None = None


def get_otp_service() -> OtpService:
    global _otp_service
    if _otp_service is None:
        _otp_service = OtpService(get_otp_repository(), get_sms_adapter())
    return _otp_service
