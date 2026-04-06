/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** خالی = همان origin (مسیر نسبی)؛ برای dev با proxy معمولاً خالی بماند */
  readonly VITE_API_URL: string
  /**
   * `false` = بدون MSW و فقط proxy به `VITE_DEV_PROXY_TARGET`
   * هر مقدار دیگر در DEV = MSW فعال (پیش‌فرض)
   */
  readonly VITE_USE_MSW: string
  /** هدف proxy در vite dev server */
  readonly VITE_DEV_PROXY_TARGET: string
  /** وقتی backend CRM آماده شد: true برای GET/POST /admin/crm/* */
  readonly VITE_USE_CRM_API: string
  /** فعال/غیرفعال کردن ورود آزمایشی فقط در DEV */
  readonly VITE_ENABLE_DEV_BYPASS: string
  /** DSN سنتری؛ فقط در استقرار */
  readonly VITE_SENTRY_DSN: string
  /** true = ارسال خطا به سنتری حتی در dev */
  readonly VITE_SENTRY_DEV: string
  /** هاب و زیرصفحه‌های پورت Hamgit (`/admin/hamgit-port`) */
  readonly VITE_FLAG_HAMGIT_PORT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module 'jalaali-js';
