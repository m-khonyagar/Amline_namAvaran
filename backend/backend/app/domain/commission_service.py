"""
PRContractCommissionService — ported from clone's prcontract_commission_service.py.

Calculates commission amounts for property rent and sale contracts.
All amounts are in Toman (Iranian currency).
"""
from __future__ import annotations

from dataclasses import dataclass, field

from app.domain.contract_enums import ProvinceType


@dataclass
class PRContractCommissionService:
    """
    Calculates Amline platform commission for property rent contracts.

    Commission rules (from clone):
    - Rent commission: 30% of monthly rent (40% if rent <= 100,000 Toman)
    - Deposit commission: 0.6% of deposit amount
    - Sale commission: 0.5% of sale price (1% if price <= 10M Toman)
    - Tax: 10% of total commission
    - Tracking code: 50,000 Toman flat fee
    - Each party pays half the total commission
    """
    tracking_code_generation_cost: int = 50_000  # 50,000 Toman

    rent_commission_pct: float = field(default=0.3, repr=False)           # 30%
    rent_commission_pct_low: float = field(default=0.4, repr=False)       # 40% for rent <= 100k
    rent_low_threshold: int = field(default=100_000, repr=False)

    deposit_commission_pct: float = field(default=0.006, repr=False)      # 0.6%

    sale_commission_pct: float = field(default=0.005, repr=False)         # 0.5%
    sale_commission_pct_low: float = field(default=0.01, repr=False)      # 1% for price <= 10M
    sale_low_threshold: int = field(default=10_000_000, repr=False)
    sale_low_extra: int = field(default=50_000, repr=False)               # +50k for higher bracket

    tax_pct: float = field(default=0.1, repr=False)                       # 10%

    def _round_down(self, amount: float) -> int:
        """Round down to nearest 1,000 Toman."""
        return int(amount * 0.001) * 1000

    def calculate_rent_commission(self, rent_amount: int, deposit_amount: int) -> int:
        """
        Total commission for a rent contract (before tax).
        Each party pays half → divide by 2.
        """
        if rent_amount <= self.rent_low_threshold:
            rent_part = rent_amount * self.rent_commission_pct_low
        else:
            rent_part = rent_amount * self.rent_commission_pct + 10_000

        deposit_part = deposit_amount * self.deposit_commission_pct
        return self._round_down((rent_part + deposit_part) / 2)

    def calculate_sale_commission(self, sale_amount: int, province: ProvinceType) -> int:
        """
        Commission for a sale contract (each party's share).
        Tehran and other provinces have same rates in current version.
        """
        if sale_amount <= self.sale_low_threshold:
            commission = sale_amount * self.sale_commission_pct_low
        else:
            commission = sale_amount * self.sale_commission_pct + self.sale_low_extra
        return self._round_down(commission / 2)

    def calculate_tax(self, commission_amount: int) -> int:
        """10% VAT on commission."""
        return self._round_down(commission_amount * self.tax_pct)

    def calculate_total_with_tax(self, commission_amount: int) -> int:
        """Commission + tax."""
        return commission_amount + self.calculate_tax(commission_amount)

    def calculate_sale_invoice(
        self,
        sale_amount_toman: int,
        province: ProvinceType = ProvinceType.TEHRAN,
        include_tracking_code: bool = True,
    ) -> dict:
        """
        فاکتور کمیسیون خرید و فروش (مبالغ به تومان؛ هم‌ارز خروجی calculate_invoice).
        """
        per_party = self.calculate_sale_commission(sale_amount_toman, province)
        commission_full = per_party * 2
        tax = self.calculate_tax(commission_full)
        tracking = self.tracking_code_generation_cost if include_tracking_code else 0
        total = commission_full + tax + tracking
        return {
            "commission": commission_full,
            "tax": tax,
            "tracking_code_fee": tracking,
            "total_amount": total,
            "landlord_share": total // 2,
            "tenant_share": total - (total // 2),
        }

    def calculate_invoice(
        self,
        rent_amount: int,
        deposit_amount: int,
        province: ProvinceType = ProvinceType.TEHRAN,
        include_tracking_code: bool = True,
    ) -> dict:
        """
        Full invoice breakdown for a rent contract.
        Returns dict with landlord_share, tenant_share, tax, tracking_code, total.
        """
        commission = self.calculate_rent_commission(rent_amount, deposit_amount)
        tax = self.calculate_tax(commission)
        tracking = self.tracking_code_generation_cost if include_tracking_code else 0
        total = commission + tax + tracking
        return {
            "commission": commission,
            "tax": tax,
            "tracking_code_fee": tracking,
            "total_amount": total,
            "landlord_share": total // 2,
            "tenant_share": total - (total // 2),
        }
