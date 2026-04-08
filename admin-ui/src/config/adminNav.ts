import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BarChart3,
  ClipboardList,
  FileText,
  Home,
  Inbox,
  LayoutDashboard,
  PenLine,
  Plug,
  Receipt,
  Scale,
  ScrollText,
  Settings,
  Shield,
  Tag,
  Users,
  Wallet,
} from 'lucide-react';

export type AdminNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  permission?: string;
  /** کلمات اضافه برای جستجو در پالت فرمان */
  keywords?: string[];
};

export type AdminNavSection = { title: string; items: AdminNavItem[] };

export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    title: 'اصلی',
    items: [
      {
        to: '/dashboard',
        label: 'داشبورد',
        icon: LayoutDashboard,
        keywords: ['خانه', 'overview', 'kpi'],
      },
    ],
  },
  {
    title: 'قرارداد',
    items: [
      {
        to: '/contracts',
        label: 'قراردادها',
        icon: FileText,
        permission: 'contracts:read',
        keywords: ['contract', 'لیست'],
      },
      {
        to: '/contracts/pr-contracts',
        label: 'رهن و اجاره',
        icon: Home,
        permission: 'contracts:read',
      },
      {
        to: '/contracts/wizard',
        label: 'قرارداد جدید',
        icon: PenLine,
        permission: 'contracts:write',
        keywords: ['ویزارد', 'ایجاد'],
      },
      {
        to: '/contracts/legal-queue',
        label: 'صف حقوقی',
        icon: Scale,
        permission: 'legal:read',
        keywords: ['legal', 'تأیید', 'بررسی'],
      },
    ],
  },
  {
    title: 'عملیات',
    items: [
      {
        to: '/crm',
        label: 'CRM',
        icon: BarChart3,
        permission: 'crm:read',
        keywords: ['سرنخ', 'لید', 'فروش', 'بازاریابی'],
      },
      {
        to: '/ads',
        label: 'آگهی‌ها',
        icon: Tag,
        permission: 'ads:read',
        keywords: ['listing', 'تبلیغ'],
      },
      {
        to: '/users',
        label: 'کاربران',
        icon: Users,
        permission: 'users:read',
      },
      {
        to: '/wallets',
        label: 'کیف پول',
        icon: Wallet,
        permission: 'wallets:read',
      },
      {
        to: '/payments',
        label: 'پرداخت‌ها',
        icon: Receipt,
        permission: 'wallets:read',
      },
      {
        to: '/billing',
        label: 'اشتراک',
        icon: ClipboardList,
        permission: 'wallets:read',
        keywords: ['صورتحساب', 'billing'],
      },
      {
        to: '/notifications',
        label: 'مرکز اعلان‌ها',
        icon: Inbox,
        permission: 'notifications:read',
        keywords: ['نوتیفیکیشن', 'inbox'],
      },
    ],
  },
  {
    title: 'سیستم',
    items: [
      {
        to: '/settings',
        label: 'تنظیمات',
        icon: Settings,
        permission: 'settings:read',
      },
      {
        to: '/integrations',
        label: 'یکپارچه‌سازی',
        icon: Plug,
        permission: 'settings:read',
        keywords: ['وبهوک', 'telegram', 'پیام'],
      },
      {
        to: '/admin/roles',
        label: 'نقش‌ها',
        icon: Shield,
        permission: 'roles:read',
        keywords: ['دسترسی', 'rbac'],
      },
      {
        to: '/admin/audit',
        label: 'ممیزی',
        icon: ScrollText,
        permission: 'audit:read',
        keywords: ['لاگ', 'audit'],
      },
      {
        to: '/admin/activity',
        label: 'گزارش فعالیت',
        icon: Activity,
        permission: 'reports:read',
        keywords: ['کارشناس', 'csv', 'گزارش'],
      },
    ],
  },
];
