from __future__ import annotations

from typing import TYPE_CHECKING, Optional, Protocol, runtime_checkable

if TYPE_CHECKING:
    from app.models.payment import PaymentIntent
    from app.repositories.v1.p1_repositories import PaymentRepository


@runtime_checkable
class PspAdapter(Protocol):
    """Payment provider: create server-side session + redirect URL."""

    provider_key: str

    def initiate_checkout(
        self,
        repo: PaymentRepository,
        intent: PaymentIntent,
        callback_url: str,
    ) -> str:
        """Persist PSP session token on intent and return payer redirect URL."""
        ...

    def resume_checkout_url(self, intent: PaymentIntent) -> Optional[str]:
        """Rebuild checkout URL for idempotent intent create (same idempotency key)."""
        ...
