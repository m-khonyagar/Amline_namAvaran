# معماری چند‌بُعدی املاین (الگوی اسنپ + مشاور املاک)

## سه سطح محصول

| سطح | بسته | پورت توسعهٔ نمونه | کاربر |
|-----|------|-------------------|--------|
| مصرف‌کننده / مالک | `amline-ui` (Next.js) | 3000 | متقاضی قرارداد، امضا، پیگیری |
| مشاور املاک | `consultant-ui` (Vite) | 3004 | ثبت‌نام، پرونده، لید، مزایا |
| پشتیبانی / کارشناس | `admin-ui` (Vite) | 3002 | کاربران، قراردادها، **پرونده مشاوران**، CRM |

## APIهای مشاور (قرارداد فرانت با بک‌اند)

- `POST /consultant/auth/register` — ایجاد کاربر مشاور + پرونده `SUBMITTED`
- `POST /consultant/auth/login` — ورود با موبایل (در MSW بدون OTP)
- `GET /consultant/me` — پروفایل و سطح تأیید
- `GET /consultant/application` — وضعیت پروندهٔ حرفه‌ای
- `GET /consultant/dashboard/summary` — آمار و مزایا
- `GET /consultant/leads` — لیدهای اختصاصی

## ادمین — بررسی پرونده

- `GET /admin/consultants/applications`
- `PATCH /admin/consultants/applications/:id` — نقش‌ها: `consultants:read` / `consultants:write`

## MSW و همگام‌سازی

دو Worker جدا روی دو پورت = **دو حافظهٔ mock جدا**. برای تست end-to-end مشاور↔ادمین با دادهٔ یکسان، `VITE_API_URL` را به API واقعی (یا یک سرور mock مرکزی) بزنید.

## ربات‌ها (بله / ایتا / تلگرام)

بستهٔ `channel-gateway` نوع‌های نرمال‌شده و لینک handoff به وب را تعریف می‌کند. پیاده‌سازی سرور:

1. یک endpoint وب‌هوک برای هر کانال
2. پارس → `NormalizedInboundMessage`
3. سرویس intent (قرارداد، وضعیت، پنل مشاور)
4. صدور توکن کوتاه‌عمر و هدایت به `amline-ui/auth/channel-handoff` یا `consultant-ui`

---

صفحهٔ وب مصرف‌کننده: `/auth/channel-handoff` در `amline-ui`.
