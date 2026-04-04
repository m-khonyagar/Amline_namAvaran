# سناریوهای امضا (S1-S5) و پرداخت کمیسیون (P1-P4)

مرجع: [`Amline_Complete_Master_Spec_v2.md`](./Amline_Complete_Master_Spec_v2.md) §۴.۲–۴.۴  
کد: `app/services/v1/signature_service.py` (`SignatureMethod`)، OTP، audit (`AuditDbRepository` / رویدادهای state).

## امضا

| سناریو | رفتار مورد انتظار | پیاده‌سازی (فیلدها / رویداد) |
|--------|-------------------|-------------------------------|
| **S1** | طرف خودش OTP می‌گیرد و در لینک وارد می‌کند | `signature_method=SELF_OTP`؛ بدون `agent_user_id` |
| **S2** | کد به موبایل طرف می‌رود؛ کاتب در پنل وارد می‌کند | `AGENT_OTP` + `agent_user_id` + audit `contract.signature.agent` |
| **S3** | مثل S2 (حضوری) | همان S2؛ زیرنوع در metadata اختیاری `channel=in_person` |
| **S4** | ادمین کد یکبارمصرف به کاتب می‌دهد | `ADMIN_OTP` + audit `contract.signature.admin_assisted` + نقش ادمین در metadata |
| **S5** | زیر آستانه مبلغ + تنظیمات کاربر | `AUTO`؛ ثبت در `signature_events` با `kind=auto` |

## پرداخت کمیسیون

| سناریو | مجوز | کیف پول / درگاه | یادداشت |
|--------|------|------------------|---------|
| **P1** | — | طرف | intent معمول PSP یا ledger |
| **P2** | OTP جدا به موبایل طرف پس از درخواست کاتب | کاتب | پس از verify، برداشت از کیف کاتب و ثبت `paid_by_party_id` |
| **P3** | وکالت ثبت‌شده در سیستم | کیف طرف | نیاز به مدل `wallet_mandate` (فاز بعد) |
| **P4** | نقش مالی ادمین | درگاه داخلی / ثبت دستی | audit + `payment_method=ADMIN` |

## فلو T1 (ترکیبی)

1. `sign_on_behalf` با OTP امضا → موفق.
2. درخواست پرداخت کمیسیون برای همان `party_id`.
3. OTP دوم برای تأیید پرداخت از طرف → سپس charge.

## Audit (کدهای پیشنهادی)

- `contract.dispute.*` (موجود)
- `contract.signature.completed` با `signature_method`, `agent_user_id`
- `contract.commission.pay.agent` / `contract.commission.pay.admin`

برای جزئیات DB نگاه کنید به [`CONTRACT_DATA_MODELS.md`](./CONTRACT_DATA_MODELS.md).
