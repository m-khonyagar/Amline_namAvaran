# دگرگونی سکوی Amline — فهرست اسناد

این پوشه **برنامهٔ اجرایی**، **وضعیت** و **الگوی PR** برای ۱۲ محور بحرانی/بزرگ/بهبودی را نگه می‌دارد.

| سند | کاربرد |
|-----|--------|
| [ROADMAP.md](./ROADMAP.md) | تحلیل وضعیت، طرح، محدودهٔ هر PR، وابستگی‌ها، معیار پذیرش |
| [PROGRESS.md](./PROGRESS.md) | گزارش پیشرفت (به‌روزرسانی دستی یا در پایان هر اسپرینت) |
| [GITHUB_BRANCH_AND_PR.md](./GITHUB_BRANCH_AND_PR.md) | نام شاخه، عنوان PR، و دستور `gh pr create` |
| [VERSIONING.md](./VERSIONING.md) | نسخه‌دهی تصاویر و قرارداد release |
| [artifacts/](./artifacts/) | نمونهٔ `turbo.json` و `package.json` ریشه تا PR مهاجرت مونوریپو |

## اسناد تکمیلی (ریپو)

| سند | موضوع |
|-----|--------|
| [../adr/0001-service-boundaries.md](../adr/0001-service-boundaries.md) | مرز سرویس‌ها |
| [../event-driven.md](../event-driven.md) | رویدادمحور |
| [../search-service.md](../search-service.md) | جستجو |
| [../wallet-settlement.md](../wallet-settlement.md) | کیف پول / تسویه |
| [../../services/notification-service/README.md](../../services/notification-service/README.md) | نوتیفیکیشن |
| [../../apps/mobile/README.md](../../apps/mobile/README.md) | موبایل |

## استک محلی Observability

پوشهٔ ریشه: [`../../infra/observability/README.md`](../../infra/observability/README.md)

## نکته

**PR واقعی** روی GitHub باید از شاخهٔ جدا ساخته و باز شود؛ این مخزن اسناد و مسیر اجرا را آماده می‌کند. بعد از `git push`، از [GITHUB_BRANCH_AND_PR.md](./GITHUB_BRANCH_AND_PR.md) استفاده کنید.
