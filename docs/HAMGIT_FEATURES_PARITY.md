# استخراج فیچرها و مزیت‌های پنل Hamgit (مرجع) ↔ پلتفرم فعلی

منبع ساختار منو و ماژول‌ها: `.reference/hamgit-admin-ui/src/layouts/app/AppSidebar.jsx` و پوشهٔ `src/features/` (~۴۰۰ فایل).

## ۱) داشبورد و نقش‌ها

| مزیت Hamgit | مسیر / رفتار | پلتفرم فعلی (`Amline_namAvaran`) |
|-------------|--------------|-----------------------------------|
| داشبورد | `/` | ✅ `/dashboard` + KPI از `/admin/metrics/summary` |
| منوی تو در تو + محدودیت نقش | `rolesHaveAccess` روی آیتم‌ها | ✅ `PermissionGuard` + `permissions` در `auth/me` |
| خروج / پروفایل | footer sidebar | ✅ `MainLayout` |

## ۲) قراردادها

| فیچر Hamgit | مسیر UI | API نمونه (Hamgit) | وضعیت فعلی |
|-------------|---------|-------------------|------------|
| ایجاد قرارداد | `/contracts/new` | `POST /admin/contracts/start` | ✅ ویزارد `/contracts/wizard` با `POST /contracts/start` |
| رهن و اجاره (PR) | `/contracts/prs`, `/contracts/prs/:id/*` | ده‌ها ` /admin/pr-contracts/*` | ⚠️ لیست + mock سبک؛ جزئیات در نقشهٔ [CLONE_API_GAP_admin_ui.md](./CLONE_API_GAP_admin_ui.md) |
| بند پیش‌فرض عادی/ضمانتی | `/clauses/default`, `/clauses/guaranteed` | `GET /admin/contracts/base-clauses` | 🔲 هاب Hamgit + stub mock |
| پرداخت/کمیسیون PR | زیرصفحه‌های PR | `contract-payments.js` | 🔲 |

## ۳) کاربران

| فیچر | Hamgit | فعلی |
|------|--------|------|
| ایجاد کاربر | `/users/new` | 🔲 (جزئیات کاربر + bulk) |
| لیست | `/users` | ✅ `UsersPage` |

## ۴) آگهی‌ها

| فیچر | Hamgit API | فعلی |
|------|------------|------|
| لیست/CRUD ملک | `/admin/ads/properties` | 🔲 stub در mock + صفحهٔ توسعه |
| درخواست بازدید | `/admin/ads/visit-requests` | 🔲 stub |
| لیست ساده | — | ✅ `/admin/ads` (mock فعلی) |

## ۵) نیازمندی‌ها (خرید/رهن، معاوضه)

| فیچر | Hamgit | فعلی |
|------|--------|------|
| CRUD wanted | `/admin/ads/wanted/properties` | 🔲 placeholder + استاب لیست خالی |
| معاوضه swaps | `/admin/ads/swaps` | 🔲 |

## ۶) کد تخفیف

| API Hamgit | فعلی |
|------------|------|
| `GET /financials/promos`, `POST .../generate` | 🔲 stub mock |

## ۷) پرداخت‌ها و تسویه

| فیچر | Hamgit | فعلی |
|------|--------|------|
| لینک پرداخت سفارشی | `/admin/custom-invoices/users`, `POST /admin/custom_payment_link` | ⚠️ لیست + دکمهٔ لینک mock؛ MSW + dev-mock |
| درخواست برداشت | `GET /admin/settlements/users`, `PATCH /admin/settlements` | ⚠️ لیست (خالی در mock)؛ MSW + dev-mock |

## ۸) کیف پول

| فیچر | Hamgit | فعلی |
|------|--------|------|
| لیست ادمین | `GET /admin/financials/wallets` | ✅ alias mock |
| شارژ دستی / گروهی | `POST .../manual-charge`, `bulk-manual-charge` | ✅ stub؛ UI فرم 🔲 |

## ۹) بازار (Market)

| فیچر | Hamgit | فعلی |
|------|--------|------|
| فایل خرید/فروش، رهن/اجاره، مشاور، وظایف، تنظیمات | مسیرهای `/market/*` + ده‌ها API | 🔲 فقط مستند در هاب |

## ۱۰) مزایای فنی Hamgit (برای حفظ در ادغام)

- **React Query** سراسری برای cache و mutation
- **جدول پیشرفته** (`@tanstack/react-table`) و **DnD** (`@dnd-kit`) در Kanban-like UI
- **نقشه** (Leaflet) در فرم‌های ملک
- **Radix** برای دیالوگ/منو با دسترسی‌پذیری بهتر
- **SASS** ماژولار برای تم قدیمی

پلتفرم فعلی: **TypeScript**, **Vitest/Playwright**, **MSW + dev-mock** — هدف ادغام: **بازنویسی تدریجی** به TS و حفظ قرارداد API یا adapter.

## ۱۱) فعال‌سازی UI ادغام در ادمین

با `VITE_FLAG_HAMGIT_PORT=true` منوی **«ادغام Hamgit»** و مسیر `/admin/hamgit-port` و زیرصفحه‌های placeholder باز می‌شود.

مسیرهای استاب Hamgit (مثل `GET /admin/settlements/users` و `GET /admin/custom-invoices/users`) در **MSW** (`admin-ui/src/mocks/hamgitPortHandlers.ts`) هم پوشش داده می‌شوند تا با `VITE_USE_MSW=true` همان شکل پاسخ `{ items, total }` بدون ۴۰۴ در دسترس باشد.

برای PR contracts: `VITE_FLAG_PR_CONTRACTS_PAGE=true` (پیش‌فرض در `.env.example` می‌تواند true باشد).

---

*این سند با پیشرفت پورت به‌روز شود؛ جزئیات endpoint در [CLONE_API_GAP_admin_ui.md](./CLONE_API_GAP_admin_ui.md).*
