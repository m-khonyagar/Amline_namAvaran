# فلو قرارداد خرید و فروش (SALE)

مرجع: [`Amline_Complete_Master_Spec_v2.md`](./Amline_Complete_Master_Spec_v2.md) §۳.۳  
SSOT kind: `SALE` — نوع API: `BUYING_AND_SELLING`.

## مراحل محصول

1. انتخاب نوع «خرید و فروش» در ویزارد (`StartStep`).
2. طرفین: فروشنده / خریدار (همان endpointهای landlord/tenant در New Flow).
3. شرایط اختصاصی: `PATCH /api/v1/contracts/{id}/terms` با بدنه مطابق `SaleTerms` در [`CONTRACT_DATA_MODELS.md`](./CONTRACT_DATA_MODELS.md).
4. امضا و کمیسیون: [`SIGNATURE_PAYMENT_SCENARIOS.md`](./SIGNATURE_PAYMENT_SCENARIOS.md).
5. صف حقوقی: [`/contracts/legal-queue`](../admin-ui) → `POST /api/v1/legal/reviews`.

## فیلدهای کلیدی فرم (terms)

`property_address`, `total_price`, `payment_plan[]`, `transfer_date`, `has_encumbrance`, `encumbrance_details`.
