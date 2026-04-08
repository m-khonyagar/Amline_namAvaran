/**
 * فهرست مسیرهای پنل برای صفحهٔ تست لوکال — با dev-only در App ثبت می‌شود.
 * شناسه‌های نمونه با بذر MSW و mock کاربر هم‌خوان نگه داشته شده‌اند.
 */
export type LocalTestHubEntry = {
  path: string
  label: string
  group: string
  permission?: string
  hint?: string
}

/** اولین قرارداد ساخته‌شده در MSW معمولاً contract-001 است؛ سرنخ‌های بذر: crm-seed-1 … */
export const LOCAL_TEST_HUB_SAMPLE_USER_ID = 'mock-001'

export const LOCAL_TEST_HUB_ROUTES: LocalTestHubEntry[] = [
  {
    group: 'توسعه',
    path: '/dev/test-hub',
    label: 'هاب تست — فهرست همین صفحه',
    permission: '—',
    hint: 'در حالت dev بدون ورود هم باز می‌شود',
  },
  { group: 'ورود', path: '/login', label: 'صفحه ورود (OTP)', hint: 'خارج از قالب اصلی؛ در حالت وارد شده به داشبورد redirect می‌شوید' },
  {
    group: 'پیش‌نمایش کاربر',
    path: '/dev/preview/user-wizard',
    label: 'ویزارد قرارداد (نمای کاربر عادی)',
    permission: '—',
    hint: 'همان ویزارد admin-ui با platform=user؛ بدون منوی پنل ادمین. سرور جدا: amline-ui روی پورت ۳۰۰۶.',
  },
  { group: 'اصلی', path: '/dashboard', label: 'داشبورد', permission: '—' },
  { group: 'قرارداد', path: '/contracts', label: 'لیست قراردادها', permission: 'contracts:read' },
  { group: 'قرارداد', path: '/contracts/pr-contracts', label: 'رهن و اجاره (PR)', permission: 'contracts:read' },
  { group: 'قرارداد', path: '/contracts/wizard', label: 'ویزارد قرارداد جدید', permission: 'contracts:write' },
  { group: 'قرارداد', path: '/contracts/legal-queue', label: 'صف حقوقی', permission: 'legal:read' },
  { group: 'قرارداد', path: '/contracts/contract-001', label: 'جزئیات قرارداد (نمونه MSW)', permission: 'contracts:read', hint: 'اگر هنوز قراردادی نساخته‌اید از لیست یک id باز کنید' },
  { group: 'CRM', path: '/crm', label: 'برد CRM', permission: 'crm:read', hint: 'مسیر نزدیک به پنل مشاور املاک (لید و پیگیری)' },
  { group: 'CRM', path: '/crm/crm-seed-1', label: 'جزئیات سرنخ (بذر MSW)', permission: 'crm:read' },
  { group: 'عملیات', path: '/ads', label: 'آگهی‌ها', permission: 'ads:read' },
  { group: 'عملیات', path: '/users', label: 'کاربران', permission: 'users:read' },
  { group: 'عملیات', path: `/users/${LOCAL_TEST_HUB_SAMPLE_USER_ID}`, label: 'جزئیات کاربر (mock)', permission: 'users:read' },
  { group: 'عملیات', path: '/wallets', label: 'کیف پول', permission: 'wallets:read' },
  {
    group: 'عملیات',
    path: '/payments',
    label: 'پرداخت‌ها',
    permission: 'wallets:read',
    hint: 'MSW: سه intent نمونه (PENDING / COMPLETED / FAILED)',
  },
  { group: 'عملیات', path: '/billing', label: 'اشتراک و صورتحساب', permission: 'wallets:read' },
  { group: 'عملیات', path: '/notifications', label: 'مرکز اعلان‌ها', permission: 'notifications:read' },
  { group: 'سیستم', path: '/settings', label: 'تنظیمات', permission: 'settings:read' },
  { group: 'سیستم', path: '/integrations', label: 'یکپارچه‌سازی', permission: 'settings:read' },
  { group: 'سیستم', path: '/admin/roles', label: 'نقش‌ها و دسترسی', permission: 'roles:read' },
  { group: 'سیستم', path: '/admin/audit', label: 'لاگ ممیزی', permission: 'audit:read' },
  { group: 'سیستم', path: '/admin/activity', label: 'گزارش فعالیت کارشناس', permission: 'reports:read' },
]
