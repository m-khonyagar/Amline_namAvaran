# گزارش پیشرفت — دگرگونی سکو

آخرین به‌روزرسانی: پس از merge اسکلهٔ rate limit، اسناد، observability، SEO dashboard، CI admin e2e.

| # | محور | وضعیت | یادداشت |
|---|------|--------|---------|
| 1 | Turborepo / NX | **جزئی انجام** | workspace ریشه: `admin-ui`, `site`, `packages/amline-ui-core`؛ `amline-ui` و `seo-dashboard` جدا |
| 2 | CI/CD کامل | **جزئی انجام** | CI سخت، deploy production دستی + نمونه SSH؛ versioning خودکار هنوز نیست |
| 3 | Rate limit / OTP / JWT | **جزئی انجام** | SlowAPI سراسری + Redis اختیاری؛ OTP قبلی در `ops.py`؛ JWT production هشدار در startup |
| 4 | Observability | **جزئی انجام** | compose + داشبورد Grafana نمونه؛ alert/runbook کامل نیست |
| 5 | جداسازی سرویس‌ها | اسناد | `docs/adr/0001-service-boundaries.md` |
| 6 | Event-driven | اسناد + infra | `docs/event-driven.md`، `infra/nats/docker-compose.yml` |
| 7 | Notification service | اسکلت | `services/notification-service/README.md` |
| 8 | Search service | اسناد | `docs/search-service.md` |
| 9 | Next/React یکپارچه | **بازمانده** | `site` 15، `amline-ui` 14 — نیاز به PR جدا |
| 10 | تست جامع | **جزئی انجام** | pytest؛ Playwright `amline-ui` + **`admin-ui-e2e`** در CI |
| 11 | Wallet / Settlement | اسناد | `docs/wallet-settlement.md` |
| 12 | Mobile | اسناد | `apps/mobile/README.md` |

**انجام‌نشدهٔ واقعی (نیاز کد/زمان جدا):** ارتقای Next 15 برای `amline-ui`، میکروسرویس‌های runtime، wallet ledger، اپ Expo commit‌شده، versioning/tag در CI، alertهای Grafana.

برای به‌روزرسانی این جدول پس از هر PR، لینک PR را در ستون یادداشت بگذارید.
