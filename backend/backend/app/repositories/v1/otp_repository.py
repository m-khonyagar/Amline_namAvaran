"""In-memory OTP challenges (P0#3); replace with DB/Redis for production."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Literal, Optional

Purpose = Literal[
    "contract_sign",
    "witness",
    "admin_assisted_sign",
    "commission_pay_delegate",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class OtpChallengeRecord:
    id: str
    code: str
    phone_normalized: str
    contract_id: str
    party_id: Optional[str]
    purpose: Purpose
    expires_at: datetime
    attempts: int
    max_attempts: int
    locked_until: Optional[datetime]
    created_at: datetime
    request_ip: Optional[str]
    request_user_agent: Optional[str]
    salt: Optional[str] = None
    witness_national_code: Optional[str] = None
    witness_type: Optional[str] = None


@dataclass
class OtpRepository:
    """Stores active OTP challenges keyed by id and by (contract, phone, purpose)."""

    _by_id: Dict[str, OtpChallengeRecord] = field(default_factory=dict)
    _active_key: Dict[tuple[str, str, Purpose], str] = field(default_factory=dict)

    def put_challenge(self, rec: OtpChallengeRecord) -> None:
        key = (rec.contract_id, rec.phone_normalized, rec.purpose)
        old_id = self._active_key.get(key)
        if old_id and old_id in self._by_id:
            del self._by_id[old_id]
        self._by_id[rec.id] = rec
        self._active_key[key] = rec.id

    def get(self, challenge_id: str) -> Optional[OtpChallengeRecord]:
        return self._by_id.get(challenge_id)

    def find_active(
        self, contract_id: str, phone_normalized: str, purpose: Purpose
    ) -> Optional[OtpChallengeRecord]:
        key = (contract_id, phone_normalized, purpose)
        cid = self._active_key.get(key)
        if not cid:
            return None
        rec = self._by_id.get(cid)
        if not rec:
            return None
        now = _utcnow()
        if rec.expires_at <= now:
            self._remove(rec)
            return None
        if rec.locked_until and rec.locked_until > now:
            return rec
        return rec

    def _remove(self, rec: OtpChallengeRecord) -> None:
        self._by_id.pop(rec.id, None)
        key = (rec.contract_id, rec.phone_normalized, rec.purpose)
        if self._active_key.get(key) == rec.id:
            del self._active_key[key]

    def delete_challenge(self, rec: OtpChallengeRecord) -> None:
        self._remove(rec)

    def clear_expired_lock(self, rec: OtpChallengeRecord) -> None:
        now = _utcnow()
        if rec.locked_until and rec.locked_until <= now:
            rec.locked_until = None
            rec.attempts = 0


_repo: Optional[OtpRepository] = None


def get_otp_repository() -> OtpRepository:
    global _repo
    if _repo is None:
        _repo = OtpRepository()
    return _repo


def new_challenge_id() -> str:
    return str(uuid.uuid4())
