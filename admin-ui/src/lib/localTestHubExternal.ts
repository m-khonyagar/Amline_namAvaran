/**
 * اپ‌های جدا از Vite admin-ui — برای تست لوکال با `npm run dev` در پوشهٔ site و amline-ui.
 * پورت پیش‌فرض با اسکریپت‌های package همان پوشه‌ها هم‌خوان است (۳۰۰۵ و ۳۰۰۶).
 */
export type ExternalAppLink = {
  path: string
  label: string
}

export type ExternalAppGroup = {
  group: string
  baseUrl: string
  links: ExternalAppLink[]
  footnote?: string
}

function landingBase(): string {
  return import.meta.env.VITE_LOCAL_LANDING_URL || 'http://localhost:3005'
}

function userAppBase(): string {
  return import.meta.env.VITE_LOCAL_USER_APP_URL || 'http://localhost:3006'
}

export function getLocalTestHubExternalApps(): ExternalAppGroup[] {
  return [
    {
      group: 'سایت و لندینگ (Next — پوشهٔ site)',
      baseUrl: landingBase(),
      footnote: 'اجرای لوکال: از ریشهٔ ریپو وارد پوشه site شوید و npm run dev بزنید (پورت ۳۰۰۵).',
      links: [
        { path: '/', label: 'صفحهٔ اصلی / لندینگ' },
        { path: '/agencies', label: 'راهکار بنگاه‌ها و مشاوران' },
        { path: '/blog', label: 'وبلاگ' },
        { path: '/miniapp', label: 'برنامک (بله / ایتا / تلگرام)' },
      ],
    },
    {
      group: 'پنل کاربر عادی (Next — پوشهٔ amline-ui)',
      baseUrl: userAppBase(),
      footnote:
        'قرارداد، ویزارد با نقش user، صورتحساب. اجرا: پوشه amline-ui و npm run dev (پورت ۳۰۰۶). برای API در dev معمولاً بک‌اند روی ۸۰۸۰ یا همان rewriteهای next.config.',
      links: [
        { path: '/', label: 'خانهٔ پنل' },
        { path: '/login', label: 'ورود با OTP' },
        { path: '/contracts', label: 'لیست قراردادها' },
        { path: '/contracts/wizard', label: 'انعقاد قرارداد جدید (ویزارد)' },
        { path: '/billing', label: 'اشتراک و فاکتور' },
      ],
    },
  ]
}
