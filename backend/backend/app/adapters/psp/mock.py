"""Mock PSP — no external HTTP; for tests and local dev."""

from __future__ import annotations

from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from app.models.payment import PaymentIntent
    from app.repositories.v1.p1_repositories import PaymentRepository


class MockPspAdapter:
    provider_key = "mock"

    def resume_checkout_url(self, intent: PaymentIntent) -> Optional[str]:
        if intent.psp_checkout_token:
            return (
                f"https://mock-psp.example/pay?intent={intent.id}"
                f"&token={intent.psp_checkout_token}&amount={intent.amount_cents}"
            )
        return None

    def initiate_checkout(
        self,
        repo: PaymentRepository,
        intent: PaymentIntent,
        callback_url: str,
    ) -> str:
        existing = self.resume_checkout_url(intent)
        if existing and intent.psp_provider == self.provider_key:
            return existing
        token = f"mock-{intent.id[:8]}"
        repo.set_psp_session(intent, provider=self.provider_key, checkout_token=token)
        return (
            f"https://mock-psp.example/pay?intent={intent.id}"
            f"&amount={intent.amount_cents}&cur={intent.currency}&token={token}"
        )
