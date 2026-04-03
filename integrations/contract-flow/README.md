# جریان قرارداد New Flow (SwaggerHub 0.1.3)

این پوشه مرجع **یکپارچگی** بین بک‌اند (`backend/backend`) و `dev-mock-api` است.

## نسخه

- **flow_version:** `0.1.3` (در پاسخ `POST /contracts/start` و بدنهٔ قرارداد در حافظه)

## فهرست endpointهای قرارداد (همان مسیر در `/api/v1` و legacy mount)

| # | متد | مسیر | توضیح |
|---|-----|------|--------|
| 1 | GET | `/contracts/resolve-info` | سلامت مسیر |
| 2 | POST | `/contracts/start` | شروع؛ گام اول: `LANDLORD_INFORMATION` |
| 3 | GET | `/contracts/list` | فهرست |
| 4 | GET | `/contracts/{id}` | جزئیات (+ `next_step` و بخش‌ها در صورت وجود) |
| 5 | GET | `/contracts/{id}/status` | وضعیت + `next_step` |
| 6 | GET | `/contracts/{id}/commission/invoice` | فاکتور کمیسیون (mock) |
| 7 | POST | `/contracts/{id}/revoke` | لغو |
| 8 | POST | `/contracts/{id}/party/landlord` | ایجاد طرف مالک |
| 9 | PATCH | `/contracts/{id}/party/{party_id}` | به‌روزرسانی طرف |
| 10 | POST | `/contracts/{id}/party/landlord/set` | پایان گام مالک → `next_step` |
| 11 | POST | `/contracts/{id}/party/tenant` | ایجاد مستأجر |
| 12 | POST | `/contracts/{id}/party/tenant/set` | پایان گام مستأجر |
| 13 | DELETE | `/contracts/{id}/party/{party_id}` | حذف طرف |
| 14 | POST | `/contracts/{id}/home-info` | `payload` اختیاری + `next_step` |
| 15 | POST | `/contracts/{id}/dating` | همان الگو |
| 16 | POST | `/contracts/{id}/mortgage` | همان الگو؛ بعد از آن رهن/اجاره یا امضا |
| 17 | POST | `/contracts/{id}/renting` | فقط اگر نوع قرارداد خرید/فروش **نباشد** |
| 18 | POST | `/contracts/{id}/sign/request` | درخواست امضای OTP |
| 19 | POST | `/contracts/{id}/sign` | مسیر legacy ادمین |
| 20 | POST | `/contracts/{id}/sign/verify` | تأیید OTP امضا |
| 21 | POST | `/contracts/{id}/sign/set` | پایان بخش امضا → `WITNESS` |
| 22 | POST | `/contracts/{id}/add-witness` | آماده‌سازی شاهد |
| 23 | POST | `/contracts/{id}/witness/request` | درخواست شاهد |
| 24 | POST | `/contracts/{id}/witness/send-otp` | همان مسیر جایگزین |
| 25 | POST | `/contracts/{id}/witness/verify` | تأیید شاهد + `next_step` (پیش‌فرض `FINISH`) |

## State machine (خلاصه)

`LANDLORD_INFORMATION` → `TENANT_INFORMATION` → `PLACE_INFORMATION` → `DATING` → `MORTGAGE` → (`RENTING` یا مستقیم `SIGNING` برای خرید و فروش) → `SIGNING` → `WITNESS` → `FINISH`

## اعتبارسنجی گام سخت

با متغیر محیطی `AMLINE_CONTRACT_STRICT_FLOW=1` روی بک‌اند اصلی، انتقال گام‌ها به پیش‌نیاز گام جاری وابسته می‌شود (پیش‌فرض: غیرفعال).

## مدل‌های ORM

جداول با پیشوند `contract_flow_*` در `app.models.contract_flow` تعریف شده‌اند و برای مهاجرت Postgres آماده‌اند؛ ذخیرهٔ زمان اجرا فعلاً در `MemoryStore` است.
