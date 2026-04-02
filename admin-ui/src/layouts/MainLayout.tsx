import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ThemeToggle } from '../components/ThemeToggle';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { CommandPalette } from '../components/CommandPalette';
import { NotificationsBell } from '../components/NotificationsBell';
import { cn } from '../lib/cn';
import { APP_NAV_ITEMS } from '../config/navigation';
import { useSessionIdle } from '../hooks/useSessionIdle';
import { featureEnabled } from '../lib/featureFlags';
import { TehranClock } from '../components/TehranClock';

export default function MainLayout() {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navItems = APP_NAV_ITEMS.filter(
    (item) =>
      (!item.featureFlag || featureEnabled(item.featureFlag)) &&
      (!item.permission || hasPermission(item.permission))
  );

  const { showWarn, dismissWarn } = useSessionIdle({
    enabled: import.meta.env.PROD,
    onLogout: () => {
      logout();
      navigate('/login');
    },
  });

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div dir="rtl" lang="fa" className="flex min-h-screen bg-[var(--amline-bg)] text-[var(--amline-fg)] transition-colors">
      <CommandPalette />
      {showWarn ? (
        <div
          className="fixed inset-x-4 bottom-4 z-[190] rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-lg dark:border-amber-800 dark:bg-amber-950/95 sm:left-auto sm:right-4 sm:max-w-md"
          role="status"
        >
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">به‌خاطر بیکاری، نشست به‌زودی قطع می‌شود.</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="rounded-lg bg-amber-800 px-3 py-1.5 text-sm text-white dark:bg-amber-600"
              onClick={dismissWarn}
            >
              ادامه کار
            </button>
            <button
              type="button"
              className="rounded-lg border border-amber-400 px-3 py-1.5 text-sm dark:border-amber-700"
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              خروج
            </button>
          </div>
        </div>
      ) : null}
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
        <div className="flex flex-col items-end gap-0.5">
          <TehranClock />
          <div className="flex items-center gap-2">
            <NotificationsBell />
            <ThemeToggle />
          </div>
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
          <div className="hidden flex-col items-end gap-1 lg:flex">
            <TehranClock />
            <div className="flex items-center gap-2">
              <NotificationsBell />
              <ThemeToggle />
            </div>
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

      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto pt-14 lg:pt-0" id="main-content">
        <div className="container-amline flex-1 py-4 sm:py-6 lg:py-8">
          <ErrorBoundary fallbackTitle="خطا در بارگذاری این صفحه">
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
