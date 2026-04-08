/** منوی اصلی و Command Palette — یک منبع واحد */
export type NavItemConfig = {
  to: string
  label: string
  icon: string
  permission?: string
  /** اگر ست باشد، فقط وقتی `VITE_FLAG_<NAME>=true` نمایش داده می‌شود */
  featureFlag?: string
}

export const APP_NAV_ITEMS: NavItemConfig[] = [
  { to: '/dashboard', label: 'داشبورد', icon: '🏠' },
  {
    to: '/admin/workspace',
    label: 'فضای کاری تیم',
    icon: '🧩',
    permission: 'workspace:read',
  },
  { to: '/contracts', label: 'قراردادها', icon: '📄', permission: 'contracts:read' },
  { to: '/contracts/wizard', label: 'قرارداد جدید', icon: '✍️', permission: 'contracts:write' },
  {
    to: '/contracts/pr-contracts',
    label: 'قراردادهای PR',
    icon: '🧪',
    permission: 'contracts:read',
    featureFlag: 'PR_CONTRACTS_PAGE',
  },
  { to: '/crm', label: 'CRM', icon: '📊', permission: 'crm:read' },
  { to: '/ads', label: 'آگهی‌ها', icon: '📰', permission: 'ads:read' },
  { to: '/users', label: 'کاربران', icon: '👥', permission: 'users:read' },
  {
    to: '/admin/consultants',
    label: 'پرونده مشاوران',
    icon: '🏢',
    permission: 'consultants:read',
  },
  { to: '/wallets', label: 'کیف پول', icon: '💳', permission: 'wallets:read' },
  { to: '/settings', label: 'تنظیمات', icon: '⚙️', permission: 'settings:read' },
  { to: '/admin/inbox', label: 'صندوق ورودی', icon: '📥', permission: 'notifications:read' },
  { to: '/admin/roles', label: 'نقش‌ها', icon: '🔐', permission: 'roles:read' },
  { to: '/admin/audit', label: 'ممیزی', icon: '📋', permission: 'audit:read' },
  { to: '/admin/activity', label: 'گزارش فعالیت', icon: '📈', permission: 'reports:read' },
  {
    to: '/admin/hamgit-port',
    label: 'ادغام Hamgit',
    icon: '🔗',
    permission: 'settings:read',
    featureFlag: 'HAMGIT_PORT',
  },
  {
    to: '/admin/plane',
    label: 'تسک — Plane.so',
    icon: '✈️',
    permission: 'plane:read',
    featureFlag: 'PLANE_INTEGRATION',
  },
]
