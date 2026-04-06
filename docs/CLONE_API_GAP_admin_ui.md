# شکاف API: Hamgit `admin-ui` (کلون) ↔ `Amline_namAvaran/admin-ui`

منبع مقایسه: استخراج محلی در `.reference/hamgit-admin-ui/` از `amline_repos_cloned.zip` (نگه‌داری خارج از Git؛ مسیر در `.gitignore`).

## هم‌ترازی اخیر (انجام‌شده در dev-mock)

| مسیر Hamgit | وضعیت در `dev-mock-api` |
|-------------|-------------------------|
| `GET /admin/financials/wallets` | **اضافه شد** — همان payload تقریبی `GET /admin/wallets` |
| `POST /admin/financials/wallets/manual-charge` | **stub** `{ok: true}` |
| `POST /admin/financials/wallets/bulk-manual-charge` | **stub** `{ok: true}` |
| `GET /admin/pr-contracts/list` | **اضافه شد** — `{items: [], total: 0, page, limit}` |
| `GET /admin/pr-contracts/{id}` | **404** تا وقتی ردیفی در `state.pr_contracts` نباشد |

صفحهٔ **`PRContractsPage`** دیگر خالی (`null`) نیست؛ لیست را از `/admin/pr-contracts/list` می‌خواند.

## تفاوت مهم قرارداد کاربر

| Hamgit (قدیمی) | فعلی `Amline_namAvaran` |
|------------------|-------------------------|
| `POST /admin/contracts/start` | `POST /contracts/start` (ویزارد کاربر) |
| مسیرهای گستردهٔ ` /admin/pr-contracts/*` | عمدتاً ویزارد `/contracts/*` + بخشی از ادمین |

برای همسان‌سازی کامل با backend Hamgit باید یا **proxy/rewrite** یا **لایهٔ API** در فرانت تصمیم گرفته شود؛ خارج از scope یک PR.

## حوزه‌های بزرگ هنوز بدون پورت کامل

از فایل‌های `.reference/hamgit-admin-ui/src/data/api/`:

- **`prcontract.js`** — ده‌ها endpoint (parties، property، OTP sign، …)
- **`contract-payments.js`** — پرداخت‌ها، commission، finalize
- **`requirement.js`** — آگهی wanted/swaps
- **`settlements.js`**
- **`user.js`** — `access-token`, `user-existence`, `verify-information`, …
- **`stats.js`** — `/v1/admin/stats/*`
- **`clauses`** — `/admin/contracts/base-clauses`

این‌ها در MSW/dev-mock فعلی **پوشش کامل** ندارند؛ برای هر ماژول باید task جدا و قرارداد JSON مشخص شود.

## مرحلهٔ بعد پیشنهادی

1. انتخاب **یک** ماژول (مثلاً فقط `prcontract` parties) و افزودن تدریجی به `dev-mock-api` + صفحهٔ TSX.
2. یا اتصال مستقیم فرانت به **backend واقعی** Hamgit در محیط staging به‌جای گسترش بی‌پایان mock.

مطالعهٔ زمینه: [CLONE_SOURCES_AND_PORTING.md](./CLONE_SOURCES_AND_PORTING.md)
