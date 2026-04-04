# گزارش پیشرفت — دگرگونی سکو

آخرین به‌روزرسانی: 2026-04-04 (تقریبی — هنگام merge اسناد را به‌روز کنید).

| # | محور | وضعیت | آخرین یادداشت |
|---|------|--------|----------------|
| 1 | Turborepo / NX | برنامه‌ریزی | نمونه در `artifacts/`؛ اجرای lockfile یکپارچه در انتظار PR |
| 2 | CI/CD کامل | جزئی | ci.yml + staging deploy؛ deploy production نیاز به اتصال واقعی |
| 3 | Rate limit / OTP / JWT | جزئی | OTP path limit در `ops.py`؛ Redis + JWT سخت در انتظار PR |
| 4 | Observability | **شروع** | `infra/observability` برای dev اضافه شد |
| 5 | جداسازی سرویس‌ها | برنامه‌ریزی | ADR پیشنهاد شود |
| 6 | Event-driven | برنامه‌ریزی | — |
| 7 | Notification service | برنامه‌ریزی | وابسته به ۶ |
| 8 | Search service | کشف | Meilisearch ادغام جزئی موجود است |
| 9 | Next/React یکپارچه | برنامه‌ریزی | site=15، amline-ui=14 |
| 10 | تست جامع | جزئی | pytest + Playwright amline-ui |
| 11 | Wallet / Settlement | برنامه‌ریزی | — |
| 12 | Mobile | برنامه‌ریزی | — |

**راهنمای به‌روزرسانی**: پس از merge هر PR، ردیف را به «انجام‌شده» یا «در حال اجرا» تغییر دهید و لینک PR را در ستون یادداشت بگذارید.
