# فلو قرارداد معاوضه (EXCHANGE)

مرجع: Master Spec v2 §۳.۳ — SSOT kind: `EXCHANGE` — نوع API: `EXCHANGE`.

## مراحل

1. شروع با `contract_type: EXCHANGE` در `POST /api/v1/contracts/start`.
2. نقش‌های مجاز طرفین: `EXCHANGER_FIRST` / `EXCHANGER_SECOND` (در DB و terms؛ ویزارد فعلاً برچسب «طرف اول/دوم»).
3. `PATCH .../terms` با `ExchangeTerms`: دو آدرس ملک، `price_difference`, `payment_plan`.
4. امضا و پرداخت مانند سایر انواع.
