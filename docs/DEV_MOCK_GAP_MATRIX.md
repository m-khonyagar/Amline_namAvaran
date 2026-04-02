# ماتریس شکاف: فرانت‌اند ↔ dev-mock-api ↔ MSW

این سند مرجع هم‌ترازی `dev-mock-api` با درخواست‌های `admin-ui` / `amline-ui` است (بدون ویرایش فایل plan).

## قرارداد کلی

| منبع | نقش |
|------|-----|
| [dev-mock-api/main.py](../dev-mock-api/main.py) | FastAPI سبک، حافظهٔ موقت |
| [admin-ui/src/mocks](../admin-ui/src/mocks) | MSW — پوشش گسترده‌تر وقتی `VITE_USE_MSW=true` |
| [backend/backend/app/api/router.py](../backend/backend/app/api/router.py) | API production |

## admin-ui — مسیرهای apiClient (یکتا)

| مسیر HTTP | مصرف‌کنندهٔ نمونه | dev-mock (پس از تکمیل برنامه) | MSW |
|-----------|-------------------|--------------------------------|-----|
| GET/POST /auth/me، /admin/otp/send، /admin/login | useAuth | بله | بله |
| GET /admin/metrics/summary | DashboardPage | بله | بله |
| GET /admin/notifications، PATCH …/:id، POST …/read-all | Notifications* | بله | بله |
| GET/PATCH/POST/DELETE /admin/roles | RolesPage | بله | بله |
| GET /admin/audit، GET /admin/staff/activity، GET /admin/sessions | صفحات ادمین | بله | بله |
| GET/POST/PATCH /admin/crm/leads* | crmApi | بله | بله |
| GET /contracts/list، GET /contracts/:id، … wizard | contractApi | بله | بله |
| POST /admin/contracts/:id/approve\|reject\|revoke | ContractsPage، ContractDetailPage | بله (`mock_extended`) | بله |
| GET/PATCH /admin/users، GET …/:id/sub*، POST …/verification، bulk-import | UsersPage، UserDetailPage | بله | بله |
| GET /admin/analytics/users-summary، GET /admin/staff/options | UsersPage، UserDetailPage | بله | بله |
| GET /admin/ads | AdsPage | بله | بله |
| GET /admin/wallets | WalletsPage | بله (financials/wallets متفاوت — پروکسی ادمین به /admin/wallets) | بله |
| GET/POST/PATCH/DELETE /admin/workspace/* | WorkspacePage | بله | بله |
| GET/PATCH /admin/consultants/applications* | ConsultantsReviewPage | بله | بله |
| POST /contracts/:id/addendum* | AddendumForm | stub (`mock_extended`) | بله |

## amline-ui — مسیرهای اصلی

| مسیر | توضیح | dev-mock |
|------|--------|----------|
| /admin/* (از طریق rewrite) | OTP، login | بله |
| /auth/me | پس از login | بله |
| /contracts/list، /contracts/:id | لیست و جزئیات | بله |

## یادداشت

- مسیرهای `/admin/wallets` در MSW با `GET /admin/wallets`؛ در ماک قدیمی فقط `GET /financials/wallets` بود — هم‌ترازی با `GET /admin/wallets` در برنامه اضافه می‌شود.
- هم‌ترایی ۱۰۰٪ با backend واقعی هدف dev-mock نیست؛ هدف **عدم خطای 404 در UI توسعه** است.

## رگرسیون

- **pytest:** `dev-mock-api/tests/test_smoke.py` — `pip install -r dev-mock-api/requirements-dev.txt` سپس `python -m pytest tests/test_smoke.py -v`.
- **Playwright (اختیاری):** `admin-ui/tests/dev-mock-api-optional.spec.ts` در صورت اجرای `uvicorn` روی پورت ۸۰۸۰، `/health` و `/admin/users` را چک می‌کند؛ در غیر این صورت skip می‌شود.
- **amline-ui:** `playwright.config.ts` همچنان `dev-mock-api` و Next را با هم بالا می‌آورد (`npm run test:e2e` در `amline-ui`).
