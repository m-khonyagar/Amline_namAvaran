# منابع کلون‌شده و نقشهٔ توسعهٔ مبتنی بر آن‌ها

این سند **مرجع معماری** است برای هم‌راستا کردن مخزن فعلی (`Amline_namAvaran`) با بسته‌های محلی زیر. جایگزین **کپی بی‌قیدوشرط** کل پروژهٔ قدیمی به‌جای monorepo فعلی نیست — آن کار رگرسیون و از دست رفتن TypeScript/MSW/dev-mock را به همراه دارد.

## ۰) اقدام فوری انجام‌شده (قدم بعد از سند قبلی)

- استخراج **`amline_repos_cloned/admin-ui`** به **`Amline_namAvaran/.reference/hamgit-admin-ui/`** (خارج از Git؛ در `.gitignore`).
- سند شکاف: **[CLONE_API_GAP_admin_ui.md](./CLONE_API_GAP_admin_ui.md)**.
- فهرست فیچر/مزیت Hamgit و parity: **[HAMGIT_FEATURES_PARITY.md](./HAMGIT_FEATURES_PARITY.md)** + UI هاب `/admin/hamgit-port` با `VITE_FLAG_HAMGIT_PORT=true`.
- در `dev-mock-api`: alias **`/admin/financials/wallets`** + stub شارژ دستی؛ **`/admin/pr-contracts/list`** و جزئیات خالی.
- در `admin-ui`: صفحهٔ **قراردادهای PR** از حالت خالی خارج شد و به لیست mock وصل است.

## ۱) مسیرهای منبع (روی دیسک شما)

| مسیر | نقش |
|------|-----|
| `D:\فنی املاین\clone Code` | نمونهٔ کار Hamgit: پوشه‌هایی مانند `hamgit-amline\admin-ui` (خروجی build + `node_modules` در برخی کلون‌ها)، اسکریپت‌های کمکی |
| `D:\فنی املاین\amline_repos_cloned.zip` | آرشیو چند-repo (~۲۷۸MB): `admin-ui`, `backend`, `site`, `ui`, `pdf-generator`, `divar-robot`, `deployment` و لایه‌های `amline_repos_extracted` با `*.tar.gz` و snapshotهای commit |

برای کار عمیق روی سورس، بهتر است zip را در پوشهٔ موقت (مثلاً `D:\فنی املاین\amline_repos_cloned_extracted`) **Extract** کنید و با همین سند تطبیق دهید.

## ۲) فهرست سطح بالای داخل `amline_repos_cloned.zip` (از فهرست‌گیری ZIP)

- `amline_repos_cloned/admin-ui/` — پنل ادمین (Vite، **JS/JSX**، SASS، Radix UI، `@dnd-kit`, Leaflet، Liara/nginx/Dockerfile)
- `amline_repos_cloned/backend/`
- `amline_repos_cloned/site/`
- `amline_repos_cloned/ui/`
- `amline_repos_cloned/pdf-generator/`
- `amline_repos_cloned/divar-robot/`
- `amline_repos_cloned/deployment/`
- `amline_repos_extracted/*.tar.gz` و پوشه‌های `*-main-*` — snapshotهای قابل مقایسه با commit

## ۳) تفاوت با `Amline_namAvaran` (پایهٔ فعلی توسعه)

| جنبه | منبع کلون/ZIP (`admin-ui`) | `Amline_namAvaran/admin-ui` |
|------|----------------------------|-----------------------------|
| زبان | عمدتاً **JS/JSX** | **TypeScript** |
| استایل | SASS + Tailwind | عمدتاً Tailwind |
| قرارداد dev | متفاوت با MSW + `dev-mock-api` فعلی | MSW، `dev-mock-api`، proxy Vite، Playwright |
| وابستگی‌ها | Radix، dnd-kit، react-table، leaflet، … | مجموعهٔ متفاوت (هم‌پوشانی جزئی) |

**تصمیم پیشنهادی:** مخزن **`Amline_namAvaran` روی GitHub** منبع اصلی «توسعهٔ جلو» بماند؛ از کلون/ZIP فقط برای **بازآوری فیچر، UI، یا قرارداد API** به‌صورت **مرحله‌ای** استفاده شود (هر فیچر = PR جدا + تست).

## ۴) نقشهٔ ادغام تدریجی (قابل اجرا در اسپرینت‌ها)

1. **قرارداد API:** مسیرهای `admin-ui` قدیمی را با `contractApi.ts` / backend واقعی یا `dev-mock-api` فعلی diff بگیرید؛ فقط **شکاف**ها را در mock یا فرانت ببندید.
2. **UI/UX:** کامپوننت‌های ارزشمند (مثلاً جدول، نقشه، فرم) را **بازنویسی به TSX** در ساختار فعلی کپی نکنید — الگو بگیرید و دوباره بنویسید تا type و lint یکدست بماند.
3. **backend از zip:** با `backend/backend` داخل monorepo (در `.gitignore` به‌عنوان embedded) یا backend جدا مقایسه شود؛ ادغام نیاز به تصمیم جداگانهٔ تیم دارد.
4. **deployment:** پوشهٔ `deployment` و فایل‌های Liara/nginx در zip را با pipeline فعلی مقایسه کنید؛ فقط در صورت نیاز به استقرار Hamgit/Liara همسان‌سازی شود.
5. **سایر سرویس‌ها:** `divar-robot`, `pdf-generator`, `site` — هر کدام اپ جدا؛ در monorepo فعلی یا به‌صورت ساب‌ماژول/ریپو جدا نگه داشته شوند.

## ۵) اسکریپت‌های داخل `clone Code`

فایل‌هایی مانند `hamgit-oneclick-clone.ps1` ممکن است برای راحتی، **توکن دسترسی (PAT)** در متن داشته باشند. آن را **هرگز** به این مخزن commit نکنید.

- اگر چنین فایلی دارید: **فوراً در سرویس گیت (Hamgit/GitLab) توکن را Rotate/Revoke کنید** و اسکریپت را با `$env:HAMGIT_TOKEN` یا Secret Manager جایگزین کنید.

## ۶) ارتباط با اسناد دیگر

- [LOCAL_DEV.md](./LOCAL_DEV.md) — پورت‌ها و پروفایل MSW/proxy  
- [DEV_MOCK_GAP_MATRIX.md](./DEV_MOCK_GAP_MATRIX.md) — تطبیق endpoint با mock  
- [ENV_SECRETS_INVENTORY.md](./ENV_SECRETS_INVENTORY.md) — فهرست نام متغیرها (بدون مقدار)

---

**جمع‌بندی:** توسعهٔ «مبتنی بر» این دو منبع یعنی **استخراج نیازمندی و فیچر به‌صورت کنترل‌شده** داخل `Amline_namAvaran`، نه جایگزینی یک‌بارهٔ کل کد قدیمی. برای هر ماژول مشخص، issue/PR جدا تعریف کنید.
