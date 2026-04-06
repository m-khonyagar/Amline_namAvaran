# راهنمای طراحی یکپارچه اَملاین

این سند برای هم‌راستا نگه‌داشتن UI بین **پنل کاربر (`amline-ui`)**، **ادمین (`admin-ui`)**، **مشاور (`consultant-ui`)** و **سایت (`site`)** است.

## توکن‌ها و رنگ برند

- منبع: `packages/amline-ui-core/amline-tokens.css`
- رنگ اصلی برند: `--amline-primary` (#179A9C) و hover: `--amline-primary-hover`
- پس‌زمینه/متن/سطح: `--amline-bg`, `--amline-fg`, `--amline-surface`, `--amline-border`, `--amline-fg-muted`, `--amline-fg-subtle`

در کامپوننت‌ها ترجیحاً از کلاس‌های Tailwind با `var(--amline-…)` یا کلاس‌های از پیش تعریف‌شده استفاده کنید، نه hex جدا از توکن.

## تایپوگرافی فارسی

| کلاس            | کاربرد                          |
|-----------------|----------------------------------|
| `amline-display`| عنوان صفحه (مثلاً H1 اصلی)      |
| `amline-title`  | عنوان بخش یا کارت              |
| `amline-body`   | پاراگراف توضیح                  |
| `amline-caption`| برچسب فیلد، زیرنویس، متن کم‌رنگ |

تعریف در `amline-ui/app/globals.css` و `consultant-ui/src/index.css` (و معادل در `admin-ui/src/index.css`) هم‌معناست.

## دکمه و ورودی (فقط `amline-ui` و `admin-ui`)

در `amline-ui` پس از `@tailwind utilities`: `btn`, `btn-primary`, `btn-outline`, `input`, `card`, `label`, …

`consultant-ui` فعلاً همان الگو را با کلاس‌های صریح روی المنت‌ها دنبال می‌کند (شعاع `--amline-radius-md`، حلقه فوکوس `--amline-ring`).

## مشاور (`consultant-ui`)

- **بارگذاری:** `PageLoader` — اسپینر + پیام یکدست
- **خالی / خطا:** `EmptyState` — آیکن، عنوان، توضیح، و در صورت نیاز دکمه یا `Link`
- **لایه:** `ConsultantLayout` — ناوبری فعال با `bg-[var(--amline-primary-muted)]` و `text-[var(--amline-primary)]`

## جهت و فونت

- RTL و `lang="fa"` در اپ‌های Next؛ مشاور روی `dir="rtl"` در روت لایه
- فونت: Vazirmatn (در `amline-ui` از `next/font`؛ در بقیه از Google Fonts یا سیستم)

## سایت بازاریابی

- `site/app/globals.css` توکن‌های اَملاین را import می‌کند؛ رنگ‌های اصلی CTA و لینک‌ها باید با `--amline-primary` هم‌خوان باشند.

## تغییرات بعدی

هر تغییر در پالت یا شعاع، ابتدا در `amline-tokens.css` و سپس در صورت نیاز در `theme-tokens.js` (برای Tailwind) اعمال شود تا همهٔ اپ‌ها یک‌جا به‌روز شوند.

## اسناد مرتبط

- استقرار و امنیت env: `docs/PRODUCTION_CHECKLIST.md`
- اجرای لوکال mock + پنل کاربر: `docs/LOCAL_DEV.md` و `scripts/dev-user-stack.ps1`
- Issueهای پیشنهادی: `docs/BACKLOG.md`
