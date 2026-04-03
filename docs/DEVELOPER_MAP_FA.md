# نقشهٔ توسعهٔ املاین (مرجع سریع)

این سند یک **نمای خلاصه** از monorepo است تا ورود به پروژه سریع‌تر شود. جزئیات عمیق‌تر در اسناد تخصصی‌تر آمده است.

## بسته‌ها و نقش هر کدام

| مسیر | فناوری | نقش کوتاه |
|------|--------|-----------|
| `backend/backend/app/` | FastAPI | API اصلی، دامنهٔ قرارداد، ادمین، احراز هویت و … |
| `admin-ui/` | React + Vite | پنل مدیریت (پورت dev در `vite.config`: **۳۰۰۲**) |
| `amline-ui/` | Next.js ۱۴ | داشبورد کاربر (پیش‌فرض Next: **۳۰۰۰**؛ در صورت تداخل با سایت، با `-p` جدا کنید) |
| `site/` | Next.js ۱۵ | سایت معرفی/مارکتینگ (پیش‌فرض **۳۰۰۰**؛ برای اجرای هم‌زمان معمولاً `next dev -p 3001`) |
| `packages/` | TypeScript | اشتراک کد فرانت‌اند (مثلاً `amline-ui-core`) |
| `services/` | متنوع | سرویس‌های جانبی (مثلاً `ml-pricing`) |
| `pdf-generator/` | — | تولید PDF |
| `qa-amline-tests/` | Playwright | تست‌های سرتاسری علیه محیط هدف |
| `integrations/` | قالب، SQL، n8n | یکپارچه‌سازی با ابزارهای بیرونی |

## اسناد مرتبط (شروع از اینجا)

- توسعهٔ Admin UI و حالت‌های MSW / proxy: [`DEV_ADMIN_UI.md`](./DEV_ADMIN_UI.md)
- قرارداد API فرانت‌اند با بک‌اند: [`FRONTEND_API_INTEGRATION.md`](./FRONTEND_API_INTEGRATION.md)
- یکپارچه‌سازی‌ها (Metabase، n8n، مشاهده‌پذیری و …): [`INTEGRATIONS.md`](./INTEGRATIONS.md)
- مشخصات جامع محصول (نسخهٔ هم‌تراز ریپو): [`AMLINE_MASTER_SPEC.md`](./AMLINE_MASTER_SPEC.md) و [`GITHUB_PRODUCT_SPEC_v5.md`](./GITHUB_PRODUCT_SPEC_v5.md)
- سیاست Git و بک‌اند: [`GIT_AND_BACKEND_POLICY.md`](./GIT_AND_BACKEND_POLICY.md)
- یادداشت ساختار چندپروژه‌ای: [`MONOREPO_NOTE.md`](./MONOREPO_NOTE.md)

## اجرای سریع تست‌ها (محلی)

- **بک‌اند:** از پوشهٔ `backend/backend` با `pytest` (نیاز به وابستگی‌های پایتون پروژه).
- **admin-ui:** `npm test` (Vitest) و در صورت نیاز `npm run test:e2e` (Playwright؛ نیاز به مرورگر و پیکربندی).
- **amline-ui:** `npm run test:e2e` در صورت تعریف سناریوها.
- **qa-amline-tests:** `npm test` — معمولاً به **URL و محیط زنده** وابسته است؛ بدون آن ممکن است رد شود.

## یادداشت برای عامل‌های خودکار (Sweep / Kiro)

برای جلوگیری از تغییر ناخواستهٔ زیرساخت، محدودهٔ امن ویرایش معمولاً این‌هاست:  
`backend/backend/app/`، `admin-ui/`، `amline-ui/`، `site/`، `pdf-generator/`، `qa-amline-tests/`، `docs/`، `packages/`، `services/`، `integrations/`.  
فایل‌هایی مانند `docker-compose.yml`، گردش‌کارهای `.github/workflows/`، اسکریپت‌های deploy و فایل‌های محیطی نباید بدون تصمیم صریح تیم لمس شوند.

---

*آخرین به‌روزرسانی این نقشه: هم‌راستا با وضعیت ریپو در ۲۰۲۶-۰۴-۰۳.*
