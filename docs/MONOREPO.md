# مونوریپو (npm workspaces + Turborepo)

## پکیج‌های داخل workspace (ریشه)

- `admin-ui` (Vite)
- `site` (Next.js static export)
- `packages/amline-ui-core` (کتابخانهٔ مشترک — فعلاً بدون اسکریپت `build`)

## خارج از workspace (فعلاً)

- **`amline-ui`**: import متقابل از `admin-ui` و aliasهای `@/`؛ تا استخراج ویجت مشترک یا package واقعی، با `package-lock.json` خودش نصب می‌شود.
- **`seo-dashboard`**: بیلد به فایل‌های محلی/پیکربندی وابسته است؛ با `npm ci` جدا در CI.

## دستورات ریشه

```bash
npm ci          # از ریشهٔ مخزن
npm run build   # turbo run build — admin-ui + site
npm run lint    # در صورت وجود اسکریپت در هر پکیج
```

## Docker

بیلد تصویر admin-ui و site از **ریشهٔ مخزن**:

```bash
docker build -f admin-ui/Dockerfile .
docker build -f site/Dockerfile .
```

## CI / CD

- **`ci.yml`**: تست بک‌اند، inventory فرانت، E2E `amline-ui`، بیلد Turbo (`lint` + `build`)، و تصاویر Docker روی **push**. **دیپلوی خودکار production حذف شده** تا pipeline موفق کاذب ندهد.
- **`deploy-staging.yml`**: استیجینگ روی push به `staging` یا دستی.
- **`deploy-production.yml`**: فقط **`workflow_dispatch`** — تا زمان افزودن SSH/kubectl، فقط notice می‌دهد.
