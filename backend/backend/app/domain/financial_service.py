"""
Financial domain service — ported from clone's financial module.

Handles invoice creation, commission calculation, and payment tracking
for property rent and sale contracts.
"""
from __future__ import annotations

import datetime as dt
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class InvoiceStatus(str, Enum):
    PAID = "PAID"
    NOT_PAID = "NOT_PAID"


class InvoiceClearingStatus(str, Enum):
    CLEARED = "CLEARED"
    NOT_CLEARED = "NOT_CLEARED"
    REQUESTED = "REQUESTED"


class TransactionStatus(str, Enum):
    SUCCESS = "SUCCESS"
    PENDING = "PENDING"
    FAILED = "FAILED"


class InvoiceItemType(str, Enum):
    TAX = "TAX"
    TRACKING_CODE = "TRACKING_CODE"
    DELIVERY = "DELIVERY"
    DISCOUNT = "DISCOUNT"
    WALLET_CREDIT = "WALLET_CREDIT"


@dataclass
class InvoiceItem:
    type: InvoiceItemType
    amount: int
    description: str = ""


@dataclass
class Invoice:
    """
    فاکتور پرداخت کمیسیون قرارداد.
    initial_amount: مبلغ پایه کمیسیون (قبل از آیتم‌های اضافی)
    items: آیتم‌های اضافی (مالیات، کد رهگیری، تخفیف)
    """
    payer_user_id: str
    payee_user_id: str
    initial_amount: int
    created_by: str
    status: InvoiceStatus = InvoiceStatus.NOT_PAID
    clearing_status: InvoiceClearingStatus = InvoiceClearingStatus.NOT_CLEARED
    items: list[InvoiceItem] = field(default_factory=list)
    paid_at: Optional[dt.datetime] = None
    contract_id: Optional[str] = None

    @property
    def final_amount(self) -> int:
        """مبلغ نهایی = مبلغ پایه + مجموع آیتم‌ها."""
        return self.initial_amount + sum(item.amount for item in self.items)

    def mark_as_paid(self, paid_at: Optional[dt.datetime] = None) -> None:
        self.status = InvoiceStatus.PAID
        self.paid_at = paid_at or dt.datetime.now(dt.timezone.utc)

    def apply_discount(self, discount_amount: int) -> None:
        self.items.append(InvoiceItem(
            type=InvoiceItemType.DISCOUNT,
            amount=-abs(discount_amount),
            description="تخفیف",
        ))

    def apply_wallet_credit(self, credit_amount: int) -> None:
        self.items.append(InvoiceItem(
            type=InvoiceItemType.WALLET_CREDIT,
            amount=-abs(credit_amount),
            description="اعتبار کیف پول",
        ))

    def to_dict(self) -> dict:
        return {
            "payer_user_id": self.payer_user_id,
            "payee_user_id": self.payee_user_id,
            "initial_amount": self.initial_amount,
            "final_amount": self.final_amount,
            "status": self.status.value,
            "clearing_status": self.clearing_status.value,
            "paid_at": self.paid_at.isoformat() if self.paid_at else None,
            "contract_id": self.contract_id,
            "items": [
                {"type": i.type.value, "amount": i.amount, "description": i.description}
                for i in self.items
            ],
        }


class ContractInvoiceBuilder:
    """
    سازنده فاکتور قرارداد.
    از CommissionService برای محاسبه مبلغ پایه استفاده می‌کند
    و آیتم‌های مالیات و کد رهگیری را اضافه می‌کند.
    """

    TAX_RATE = 0.1              # 10% مالیات
    TRACKING_CODE_FEE = 50_000  # 50,000 تومان کد رهگیری

    def _round_down(self, amount: float) -> int:
        return int(amount * 0.001) * 1000

    def build_rent_invoice(
        self,
        payer_user_id: str,
        payee_user_id: str,
        created_by: str,
        rent_amount: int,
        deposit_amount: int,
        contract_id: Optional[str] = None,
        include_tracking_code: bool = True,
    ) -> Invoice:
        """فاکتور کمیسیون قرارداد رهن و اجاره."""
        # محاسبه کمیسیون پایه
        if rent_amount <= 100_000:
            rent_commission = rent_amount * 0.4
        else:
            rent_commission = rent_amount * 0.3 + 10_000
        deposit_commission = deposit_amount * 0.006
        base_commission = self._round_down((rent_commission + deposit_commission) / 2)

        invoice = Invoice(
            payer_user_id=payer_user_id,
            payee_user_id=payee_user_id,
            initial_amount=base_commission,
            created_by=created_by,
            contract_id=contract_id,
        )

        # مالیات
        tax = self._round_down(base_commission * self.TAX_RATE)
        invoice.items.append(InvoiceItem(
            type=InvoiceItemType.TAX,
            amount=tax,
            description="مالیات بر ارزش افزوده ۱۰٪",
        ))

        # کد رهگیری
        if include_tracking_code:
            invoice.items.append(InvoiceItem(
                type=InvoiceItemType.TRACKING_CODE,
                amount=self.TRACKING_CODE_FEE,
                description="هزینه کد رهگیری",
            ))

        return invoice

    def build_sale_invoice(
        self,
        payer_user_id: str,
        payee_user_id: str,
        created_by: str,
        sale_amount: int,
        contract_id: Optional[str] = None,
    ) -> Invoice:
        """فاکتور کمیسیون قرارداد خرید و فروش."""
        if sale_amount <= 10_000_000:
            commission = sale_amount * 0.01
        else:
            commission = sale_amount * 0.005 + 50_000
        base_commission = self._round_down(commission / 2)

        invoice = Invoice(
            payer_user_id=payer_user_id,
            payee_user_id=payee_user_id,
            initial_amount=base_commission,
            created_by=created_by,
            contract_id=contract_id,
        )

        tax = self._round_down(base_commission * self.TAX_RATE)
        invoice.items.append(InvoiceItem(
            type=InvoiceItemType.TAX,
            amount=tax,
            description="مالیات بر ارزش افزوده ۱۰٪",
        ))

        return invoice
