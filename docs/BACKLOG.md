# بک‌لاگ — Issueهای پیشنهادی برای GitHub

متن‌های زیر را می‌توانید به‌صورت Issue جدا در ریپو کپی کنید.

---

## [P0] استقرار: متغیرهای amline-ui در production

**بدنه:**  
طبق `docs/PRODUCTION_CHECKLIST.md` مقدار `NEXT_PUBLIC_API_BASE_URL` در pipeline/build پروداکشن ست شود. تأیید شود `NEXT_PUBLIC_ENABLE_DEV_BYPASS` در env سرور وجود ندارد یا `false` است. تست دستی: login → لیست قراردادها → ویزارد.

**برچسب‌ها:** `priority/P0`, `deployment`, `amline-ui`

---

## [P0] قرارداد: قرارداد سرتاسری روی staging

**بدنه:**  
از `POST /contracts/start` تا امضا/کمیسیون و `GET /contracts/{id}/pdf` روی API واقعی (نه mock) اجرا شود. پاسخ لیست با فیلدهای `party_type` و `parties` با UI هم‌خوان باشد.

**برچسب‌ها:** `priority/P0`, `backend`, `qa`

---

## [P1] CI: amline-ui Playwright در هر PR

**بدنه:**  
Job در `.github/workflows/ci.yml` اضافه شده؛ در صورت flaky بودن، timeout و retry را تنظیم کنید. سند: `docs/LOCAL_DEV.md`.

**برچسب‌ها:** `priority/P1`, `ci`, `amline-ui`

---

## [P1] فیگما: قفل کپی تب‌های «قراردادهای من»

**بدنه:**  
نام و ترتیب سه تب و متن دقیق پیل‌ها را با طراح تأیید کنید؛ در صورت نیاز `amline-ui/lib/myContractsUi.ts` به‌روز شود.

**برچسب‌ها:** `priority/P1`, `design`, `amline-ui`

---

## [P1] consultant-ui: اتصال به API واقعی

**بدنه:**  
جایگزینی یا تکمیل MSW با endpointهای `/consultant/*` روی بک‌اند؛ تست empty/loading/error با پاسخ واقعی.

**برچسب‌ها:** `priority/P1`, `consultant-ui`, `backend`

---

## [P2] DRY: الگوهای CSS admin و amline

**بدنه:**  
بدون شکستن محدودیت `@import` + `@layer` در Next، بخش مشترک را در `packages/amline-ui-core` نگه دارید (سند `DESIGN.md`).

**برچسب‌ها:** `priority/P2`, `tech-debt`

---

## [P2] a11y: هدر و کارت‌های قرارداد

**بدنه:**  
فوکوس، `aria-label` برای دکمه‌های آیکن، کنtrast در dark mode.

**برچسب‌ها:** `priority/P2`, `a11y`
