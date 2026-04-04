# نگاشت وضعیت قرارداد — سند v2 ↔ کد `backend/backend`

مرجع محصول: [`Amline_Complete_Master_Spec_v2.md`](./Amline_Complete_Master_Spec_v2.md) §۳.۱  
مرجع کد: `app/domain/contracts/ssot.py` (`ContractLifecycleStatus`)، `contract_flow` `status` رشته، `contract_state_machine.py`.

## وضعیت‌های سند v2 (هدف محصول)

`DRAFT`, `AWAITING_SIGNATURES`, `SIGNED`, `REVIEWED_BY_EXPERT`, `FINALIZED`, `TERMINATED`

## نگاشت پیشنهادی به مقادیر فعلی SSOT / API

| v2 (نمایش محصول) | مقدار داخلی فعلی (SSOT / store) | یادداشت |
|-------------------|-----------------------------------|---------|
| DRAFT | `DRAFT` | یکسان |
| AWAITING_SIGNATURES | `PENDING_SIGNATURES` | نام متفاوت؛ API می‌تواند alias برگرداند |
| SIGNED | `EXECUTED` | پس از تکمیل امضاها؛ یا `IN_PROGRESS` بسته به فاز pipeline |
| REVIEWED_BY_EXPERT | `substate=legal_approved` + status پایه `EXECUTED` یا `IN_PROGRESS` | تا وقتی جدول lifecycle ادغام نشده |
| FINALIZED | `COMPLETED` | کد رهگیری + PDF نهایی |
| TERMINATED | `CANCELLED` یا `REVOKED` | تفکیک انقضا / فسخ در `substate` |

## قاعده API

- **ورودی/خروجی v2:** می‌توان در لایهٔ schema با فیلد `lifecycle_v2` یا نگاشت دوطرفه در سرویس expose کرد.
- **ذخیره:** تا migration کامل، همان رشته‌های SSOT ذخیره شوند تا تست‌های موجود نشکنند؛ لایه نگاشت تبدیل v2↔SSOT را متمرکز کند.

## گام بعد

پس از یکپارچه‌سازی، `ContractLifecycleStatus` می‌تواند مستقیماً به نام‌های v2 تغییر کند **یا** enum جدا `ContractProductStatusV2` با تابع `to_storage()` نگه داشته شود.
