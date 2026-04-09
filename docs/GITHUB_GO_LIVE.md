# GitHub و بک‌لاگ Go-Live

این سند **اتصال عملیاتی** بین [`GO_LIVE_SPRINT_BACKLOG.md`](./GO_LIVE_SPRINT_BACKLOG.md) و GitHub را مشخص می‌کند.

## قالب Issue

در GitHub: **New issue** → **Go-Live story**. عنوان را به شکل `[GL-P2-04] توضیح کوتاه` نگه دارید تا جستجو و اتوماسیون یکسان بماند.

## برچسب‌ها (یک‌بار در مخزن)

با [GitHub CLI](https://cli.github.com/) (`gh`) از ریشهٔ مخزن:

```bash
gh label create "go-live" --color "0E8A16" --description "Go-Live v1 track" 2>nul || exit 0
```

یا اسکریپت PowerShell (ایدمپوتنت):

```powershell
.\scripts\gh-go-live-labels.ps1
```

پس از ایجاد، می‌توانید روی Issueهای Go-Live برچسب `go-live` را نگه دارید و برای فاز از برچسب‌های `phase/P0` … `phase/P5` (اختیاری) استفاده کنید.

## PR

در بدنهٔ PR بنویسید: `Refs: #123` یا اگر Issue ندارید حداقل `Refs: GL-P2-04` تا در جستجو بیاید. قالب PR در [`.github/PULL_REQUEST_TEMPLATE.md`](../.github/PULL_REQUEST_TEMPLATE.md) چک‌باکس Go-Live دارد.

## Milestone

**[Go-Live v1](https://github.com/m-khonyagar/Amline_namAvaran/milestone/1)** — همهٔ استوری‌های `GL-P*` و `GL-PX*` به این milestone وصل شده‌اند. فهرست: [issueهای این milestone](https://github.com/m-khonyagar/Amline_namAvaran/issues?q=is%3Aissue+milestone%3A%22Go-Live+v1%22).

## ایجاد / همگام‌سازی Issueها (ایدمپوتنت)

از ریشهٔ مخزن (نیاز به `gh` و احراز هویت):

```bash
npm run go-live:issues
```

یا:

```bash
node scripts/create-go-live-issues.mjs
```

اسکریپت milestone را در صورت نبود می‌سازد و فقط برای شناسه‌هایی که هنوز Issue با همان پیشوند `[GL-…]` ندارند، Issue جدید می‌سازد (اجرای دوباره بی‌خطر است).
