import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { ThemeToggle } from '../components/ThemeToggle';
import { cn } from '../lib/cn';
import { apiClient } from '../lib/api';

type NavConfig = {
  to: string;
  label: string;
  icon: string;
  permission?: string;
};

const NAV_CONFIG: NavConfig[] = [
  { to: '/dashboard', label: 'داشبورد', icon: '🏠' },
  { to: '/contracts', label: 'قراردادها', icon: '📄', permission: 'contracts:read' },
  { to: '/contracts/wizard', label: 'قرارداد جدید', icon: '✍️', permission: 'contracts:write' },
  { to: '/crm', label: 'CRM', icon: '📊' },
  { to: '/ads', label: 'آگهی‌ها', icon: '🏷️', permission: 'ads:read' },
  { to: '/users', label: 'کاربران', icon: '👥', permission: 'users:read' },
  { to: '/wallets', label: 'کیف پول', icon: '💳', permission: 'wallets:read' },
  { to: '/payments', label: 'پرداخت‌ها', icon: '🧾', permission: 'wallets:read' },
  { to: '/billing', label: 'اشتراک', icon: '📋', permission: 'wallets:read' },
  { to: '/settings', label: 'تنظیمات', icon: '⚙️', permission: 'settings:read' },
  { to: '/integrations', label: 'یکپارچه‌سازی', icon: '🔌', permission: 'settings:read' },
  { to: '/admin/roles', label: 'نقش‌ها', icon: '🔐', permission: 'roles:read' },
  { to: '/admin/audit', label: 'ممیزی', icon: '📋', permission: 'audit:read' },
  { to: '/admin/activity', label: 'گزارش فعالیت', icon: '📈', permission: 'reports:read' },
];

function NotificationsBell() {
  const { hasPermission } = useAuth();
  const [open, setOpen] = useState(false);
  const canRead = hasPermission('notifications:read');
  const { data } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: async () => {
      const res = await apiClient.get<{
        items: { id: string; title: string; body?: string; read: boolean; created_at?: string }[];
      }>('/admin/notifications');
      return res.data;
    },
    enabled: canRead,
  });
  if (!canRead) return null;
  const items = data?.items ?? [];
  const unread = items.filter((i) => !i.read).length;
  return (
    <div className="relative z-50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-amline-md border border-[var(--amline-border)] text-lg hover:bg-[var(--amline-surface-muted)] dark:border-slate-600"
        aria-expanded={open}
        aria-label="اعلان‌ها"
      >
        🔔
        {unread > 0 ? (
          <span className="absolute -left-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="بستن اعلان‌ها"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-amline-md border border-[var(--amline-border)] bg-[var(--amline-surface)] p-2 shadow-amline dark:border-slate-700">
            {items.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-[var(--amline-fg-muted)]">اعلانی نیست</p>
            ) : (
              <ul className="max-h-72 space-y-1 overflow-y-auto">
                {items.map((n) => (
                  <li
                    key={n.id}
                    className={cn(
                      'rounded-lg px-3 py-2 text-sm',
                      n.read ? 'text-[var(--amline-fg-muted)]' : 'bg-[var(--amline-primary-muted)] font-medium text-[var(--amline-fg)]'
                    )}
                  >
                    <p className="font-medium">{n.title}</p>
                    {n.body ? <p className="mt-0.5 text-xs opacity-90">{n.body}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function MainLayout() {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navItems = NAV_CONFIG.filter((item) => !item.permission || hasPermission(item.permission));

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div dir="rtl" className="flex min-h-screen bg-[var(--amline-bg)] text-[var(--amline-fg)] transition-colors">
      {/* نوار بالا — موبایل و تبلت */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-[var(--amline-border)] bg-[var(--amline-surface)]/95 px-4 shadow-[var(--amline-shadow-sm)] backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95 lg:hidden">
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-amline-md border border-[var(--amline-border)] text-lg text-[var(--amline-fg)] transition-colors hover:bg-[var(--amline-surface-muted)] dark:border-slate-600"
          onClick={() => setMobileNavOpen(true)}
          aria-expanded={mobileNavOpen}
          aria-controls="app-sidebar"
          aria-label="باز کردن منو"
        >
          ☰
        </button>
        <div className="flex flex-col items-center">
          <span className="text-base font-bold text-[var(--amline-primary)]">اَملاین</span>
          <span className="text-[10px] text-[var(--amline-fg-muted)]">پنل مدیریت</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationsBell />
          <ThemeToggle />
        </div>
      </header>

      {/* پس‌زمینه تیره هنگام باز بودن منو */}
      <button
        type="button"
        aria-label="بستن منو"
        className={cn(
          'fixed inset-0 z-40 bg-slate-900/50 transition-opacity lg:hidden',
          mobileNavOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={() => setMobileNavOpen(false)}
      />

      {/* سایدبار */}
      <aside
        id="app-sidebar"
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-[min(20rem,88vw)] flex-col border-l border-[var(--amline-border)] bg-[var(--amline-surface)] shadow-amline transition-transform duration-300 ease-out dark:border-slate-700 dark:shadow-none lg:static lg:z-0 lg:w-64 lg:max-w-none lg:translate-x-0 lg:shadow-none',
          mobileNavOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-[var(--amline-border)] px-4 dark:border-slate-700">
          <div className="min-w-0">
            <span className="text-xl font-bold text-[var(--amline-primary)]">اَملاین</span>
            <span className="mr-2 text-xs text-[var(--amline-fg-muted)]">پنل مدیریت</span>
          </div>
          <div className="hidden items-center gap-2 lg:flex">
            <NotificationsBell />
            <ThemeToggle />
          </div>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-amline-md text-xl text-[var(--amline-fg-muted)] hover:bg-[var(--amline-surface-muted)] lg:hidden"
            onClick={() => setMobileNavOpen(false)}
            aria-label="بستن منو"
          >
            ×
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard' || item.to === '/contracts'}
              onClick={() => setMobileNavOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-5 py-3 text-sm transition-colors',
                  isActive
                    ? 'border-r-4 border-[var(--amline-primary)] bg-[var(--amline-primary-muted)] font-semibold text-[var(--amline-primary)] dark:bg-blue-950/40'
                    : 'text-[var(--amline-fg-muted)] hover:bg-[var(--amline-surface-muted)] hover:text-[var(--amline-fg)] dark:hover:bg-slate-800'
                )
              }
            >
              <span aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-[var(--amline-border)] p-4 dark:border-slate-700">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--amline-primary-muted)] text-sm font-bold text-[var(--amline-primary)] dark:bg-blue-900/50 dark:text-blue-300">
              {user?.full_name?.[0] ?? user?.mobile?.[0] ?? 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--amline-fg)]">
                {user?.full_name ?? user?.mobile}
              </p>
              <p className="text-xs text-[var(--amline-fg-muted)]">{user?.role}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-amline-md py-2.5 text-right text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            خروج
          </button>
        </div>
      </aside>

      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto pt-14 lg:pt-0">
        <div className="container-amline flex-1 py-4 sm:py-6 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
