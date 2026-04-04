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
  /**
   * فقط در DEV: اگر `true` باشد PermissionGuard همهٔ صفحات را بدون چک RBAC نشان می‌دهد (تست UI لوکال).
   * در بیلد production حذف می‌شود (import.meta.env.DEV همیشه false).
   */
  readonly VITE_DEV_VIEW_ALL_PAGES: string
  /**
   * فقط DEV + platform ادمین: پیمایش آزاد ویزارد قرارداد و دکمهٔ شروع بدون POST.
   * در production بدون اثر (isWizardPreviewMode همیشه false).
   */
  readonly VITE_WIZARD_PREVIEW_MODE: string
  /** آدرس پایهٔ site (لندینگ) در dev — پیش‌فرض در هاب تست: http://localhost:3005 */
  readonly VITE_LOCAL_LANDING_URL: string
  /** آدرس پایهٔ amline-ui (پنل کاربر) در dev — پیش‌فرض: http://localhost:3006 */
  readonly VITE_LOCAL_USER_APP_URL: string
  readonly VITE_PUBLIC_POSTHOG_KEY: string
  readonly VITE_PUBLIC_POSTHOG_HOST: string
  /** `true` فقط در staging — ضبط جلسه PostHog */
  readonly VITE_PUBLIC_POSTHOG_SESSION_RECORDING: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
