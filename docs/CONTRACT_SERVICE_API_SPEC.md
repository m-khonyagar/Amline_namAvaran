# مشخصات API سرویس قرارداد (Contract Service)

مرجع محصول: [`Amline_Complete_Master_Spec_v2.md`](./Amline_Complete_Master_Spec_v2.md)  
مرجع as-built: مسیرهای `/api/v1/contracts/*` در [`backend/backend/app/api/v1/endpoints/contracts.py`](../backend/backend/app/api/v1/endpoints/contracts.py) و روترهای مرتبط؛ OpenAPI تولیدشده از FastAPI.

## اصول

- نسخه‌گذاری: **`/api/v1`**.
- خطا: `ErrorResponse` یکدست (`error.code`, `error.message`, …).
- احراز هویت: هدرهای موجود پروژه (`Authorization`, در dev اختیاری).

## نقشه endpoint (هدف + وضعیت)

| عمل | متد و مسیر | توضیح |
|-----|------------|--------|
| ایجاد پیش‌نویس | `POST /api/v1/contracts` | `contract_type` + `ssot_kind` مشتق؛ parties اولیه اختیاری |
| جزئیات | `GET /api/v1/contracts/{id}` | شامل `terms`, `external_refs`, `lifecycle_v2` (اختیاری) |
| به‌روزرسانی مرحله ویزارد | `POST` بخش‌های home-info / renting / … | مطابق New Flow |
| شرایط پلی‌مورفیک | `PATCH /api/v1/contracts/{id}/terms` | بدنه `ContractTermsPatchBody` |
| کمیسیون | `POST` / `GET /api/v1/contracts/{id}/commissions` | لیست در حافظه تا هم‌ترازی DB کامل |
| وضعیت / گام بعد | `GET /api/v1/contracts/{id}/status` | `next_step`, `ssot_kind` |
| OTP امضا | `POST .../otp/send`, `POST .../otp/verify` | طبق پیاده‌سازی فعلی |
| امضا (کاتب / خودکار) | `POST .../sign` با `signature_method`, `agent_user_id` | |
| امضای نمایندگی + OTP طرف | `POST .../sign/agent-request` | T1/S2-S4 — در صورت نبود، در همان `sign` با فلگ |
| شاهد | `POST .../witnesses`, … | موجود |
| ارجاع حقوقی | `POST /api/v1/legal/reviews` (یا مسیر admin) | صف `LegalReview` |
| اختلاف | `POST /api/v1/contracts/{id}/disputes` | [`dispute_routes.py`](../backend/backend/app/api/v1/dispute_routes.py) |
| refs خارجی | `PATCH .../external-refs` | `khodnevis_id`, `katib_id`, `tracking_code` |
| کمیسیون | `POST /api/v1/contracts/{id}/commissions` | ایجاد ردیف کمیسیون |
| پرداخت کمیسیون (P2) | `POST /api/v1/contracts/{id}/commissions/{cid}/delegate-pay/request` + `.../verify` | OTP به موبایل طرف |
| امضای کاتب | `POST /api/v1/contracts/{id}/sign/agent/verify` | body: `AgentSignVerifyBody` |
| امضای S4 ادمین | `POST .../sign/admin-assist/request` + `.../sign/admin-assist/verify` | `AMLINE_ADMIN_ASSIST_MOBILE` |
| امضای خودکار S5 | `POST .../sign/auto` | `AMLINE_CONTRACT_AUTO_SIGN_ENABLED` + `AMLINE_CONTRACT_AUTO_SIGN_MAX_RIAL` |

## بدنه نمونه: `terms` برای SALE

```json
{
  "kind": "SALE",
  "property_address": "...",
  "total_price": 12000000000,
  "payment_plan": [{"type": "ONLINE", "amount": 5000000000, "due_date": "2026-05-01"}],
  "transfer_date": "2026-06-01",
  "has_encumbrance": false
}
```

## هم‌ترازی OpenAPI

برای سند رسمی، خروجی `GET /openapi.json` از اپ FastAPI را در CI ذخیره یا با `redocly` منتشر کنید. این فایل **قرارداد معنایی** است؛ مسیرهای دقیق پس از هر PR با diff OpenAPI کنترل شوند.
