# توسعهٔ Admin UI (Vite)

## سناریوها

1. **MSW + بدون backend (پیش‌فرض dev)**  
   - `.env.local`: `VITE_USE_MSW` خالی نباشد یا نباشد (هر چیزی غیر از `false`).  
   - `VITE_API_URL` را خالی بگذارید تا درخواست‌ها به همان origin بروند و MSW آن‌ها را intercept کند.

2. **فقط Vite proxy (بدون MSW)**  
   - `VITE_USE_MSW=false`  
   - `VITE_DEV_PROXY_TARGET` را به URL backend تنظیم کنید (پیشنهادی: `https://api.amline.ir`).  
   - درخواست‌های نسبی به `/contracts`, `/admin`, `/auth`, … از طریق proxy به هدف ارسال می‌شوند (بدون CORS مرورگر به دامنهٔ دیگر).

3. **Backend جدا روی localhost**  
   - `VITE_USE_MSW=false`  
   - `VITE_DEV_PROXY_TARGET=http://localhost:8080` (یا پورت واقعی)

## CORS

اگر `VITE_API_URL` را مستقیم به `https://api...` بگذارید و از `localhost` صدا بزنید، CORS باید روی backend باز باشد. با **مسیر نسبی + proxy** این مشکل دور زده می‌شود.

## CRM

با `VITE_USE_CRM_API=true`، CRM از `GET/PATCH/POST /admin/crm/...` استفاده می‌کند؛ در dev با MSW، handlerهای نمونه در `src/mocks/handlers.ts` فعال‌اند.

## نکتهٔ مهم backend واقعی (production)

- در API فعلی، `POST /contracts/start` به `party_type` نیاز دارد.
- endpointهای فلوی جدید (`/contracts/{id}/party/...` و مراحل بعدی) اگر روی سرور `404` بدهند، frontend پیام «عدم دسترسی مرحله در backend فعلی» نمایش می‌دهد.
- قرارداد خرید/فروش فعلاً پشت فلگ `VITE_ENABLE_BUY_SELL_CONTRACT` نگه داشته شده است تا زمانی که backend آن را فعال کند.

---

## الگوهای جدید فرانت (React Query، Guard، خطا)

### React Query

- `QueryClientProvider` در `admin-ui/src/main.tsx` با `staleTime` ~۵ دقیقه و `retry: 1`.
- برای لیست‌ها از `queryKey` پایدار استفاده کنید؛ بعد از mutation با `invalidateQueries` هم‌خوان کنید.

### مجوز صفحه (`PermissionGuard`)

- حالت پیش‌فرض `mode="page"`: بدون مجوز، `ForbiddenPage` نمایش داده می‌شود.
- برای مخفی‌سازی بخشی از UI بدون صفحهٔ ۴۰۳ از `mode="silent"` استفاده کنید (مثلاً دکمهٔ ویرایش).

### خطای سراسری

- `ErrorBoundary` دور `<Outlet />` در `MainLayout`؛ خطاهای رندر با دکمهٔ تلاش مجدد.

### فلگ فیچر

- توابع `featureEnabled('NAME')` از `admin-ui/src/lib/featureFlags.ts` — متغیر env: `VITE_FLAG_<NAME>=true` (مثلاً `VITE_FLAG_PR_CONTRACTS_PAGE=true` برای مسیر «قراردادهای PR» در منو و `App.tsx`).

### Sentry

- پکیج `@sentry/react` نصب است؛ با `VITE_SENTRY_DSN` در استقرار، `initOptionalSentry()` در `main.tsx` سنتری را بالا می‌آورد. در dev به‌طور پیش‌فرض خاموش است مگر `VITE_SENTRY_DEV=true`.
- `ErrorBoundary` خطاها را با `Sentry.captureException` هم ارسال می‌کند (وقتی init فعال باشد).

### صندوق ورودی و اعلان‌ها

- `GET/PATCH /admin/notifications` و `POST /admin/notifications/read-all` در MSW نمونه؛ UI در `NotificationsBell` و صفحهٔ `/admin/inbox` با مجوز `notifications:read`.

### نقش‌ها (CRUD)

- `POST /admin/roles`، `PATCH /admin/roles/:id`، `DELETE /admin/roles/:id` در MSW؛ نقش `role-admin` قابل حذف نیست (۴۰۳).

### i18n

- `I18nProvider` در ریشه؛ `useI18n().t('key')` — دیکشنری فعلی فارسی در `I18nContext.tsx` (گسترش تدریجی).

### دسترسی‌پذیری در CI

- تست Playwright با `@axe-core/playwright` در `admin-ui/tests/accessibility-axe.spec.ts`؛ اجرا با `npm run test:e2e` (همان پوشهٔ `tests/`).

### مجوزهای مهم CRM / ویزارد

- مسیر CRM پشت `crm:read`؛ ویزارد قرارداد پشت `contracts:write`. کاربر dev-bypass این مجوزها را دارد؛ JWT واقعی باید از backend پر شود.

### مدیریت کاربران (API نمونه MSW)

- `GET /admin/analytics/users-summary` — KPI تجمیعی (ثبت‌نام، فعال، چت، تماس، قرارداد، کارمزد، احراز در انتظار، تیکت).
- `GET /admin/users` با `page`, `limit`, `search`, `role`, `verification_status`, `is_active`.
- `GET|PATCH /admin/users/:id`, `POST /admin/users/:id/verification`, `POST /admin/users/bulk-import`.
- `GET /admin/users/:id/timeline|payments|wallet/ledger|tickets`؛ `POST/PATCH` تیکت و ارجاع؛ `GET /admin/staff/options`.
- `GET /contracts/list` پاسخ `{ items, total, page, limit }` و فیلتر اختیاری `user_id`.
