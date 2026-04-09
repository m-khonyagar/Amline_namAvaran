import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Menu, Search, X } from 'lucide-react';
import { ADMIN_NAV_SECTIONS } from '../config/adminNav';
import { AdminCommandMenu } from '../components/AdminCommandMenu';
import { useAuth } from '../hooks/useAuth';
import { NotificationsBell } from '../components/NotificationsBell';
import { ThemeToggle } from '../components/ThemeToggle';
import { cn } from '../lib/cn';

function BrandMark({ compact }: { compact?: boolean }) {
  return (
    <div className={cn('flex items-center gap-3', compact && 'gap-2')}>
      <div
        className={cn(
          'flex shrink-0 items-center justify-center rounded-amline-md bg-gradient-to-br from-[var(--amline-primary)] to-[var(--amline-accent)] font-extrabold text-white shadow-[var(--amline-shadow-md)] ring-2 ring-white/10 dark:ring-slate-800',
          compact ? 'h-9 w-9 text-sm' : 'h-11 w-11 text-base'
        )}
        aria-hidden
      >
        ا
      </div>
      <div className="min-w-0 text-right">
        <p className={cn('font-extrabold tracking-tight text-[var(--amline-primary)]', compact ? 'text-sm' : 'text-lg')}>
          اَملاین
        </p>
        <p className="amline-caption truncate">پنل مدیریت</p>
      </div>
    </div>
  );
}

export default function MainLayout() {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const sections = ADMIN_NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.permission || hasPermission(item.permission)),
  })).filter((s) => s.items.length > 0);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div dir="rtl" className="flex min-h-screen text-[var(--amline-fg)] transition-colors">
      <AdminCommandMenu open={commandOpen} onOpenChange={setCommandOpen} />
      <header className="safe-pt fixed inset-x-0 top-0 z-40 flex min-h-14 flex-col border-b border-[var(--amline-border)] bg-[var(--amline-surface)]/90 shadow-[var(--amline-shadow-sm)] backdrop-blur-lg dark:border-slate-700 dark:bg-slate-900/90 lg:hidden">
        <div className="flex h-14 shrink-0 items-center justify-between pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))]">
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-amline-md border border-[var(--amline-border)] text-[var(--amline-fg)] transition-colors hover:bg-[var(--amline-surface-muted)] dark:border-slate-600"
          onClick={() => setMobileNavOpen(true)}
          aria-expanded={mobileNavOpen}
          aria-controls="app-sidebar"
          aria-label="باز کردن منو"
        >
          <Menu className="h-5 w-5" strokeWidth={2} />
        </button>
        <BrandMark compact />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-amline-md border border-[var(--amline-border)] text-[var(--amline-fg-muted)] transition-colors hover:bg-[var(--amline-surface-muted)] dark:border-slate-600"
            aria-label="جستجو و پرش سریع"
          >
            <Search className="h-5 w-5" strokeWidth={2} />
          </button>
          <NotificationsBell />
          <ThemeToggle />
        </div>
        </div>
      </header>

      <button
        type="button"
        aria-label="بستن منو"
        className={cn(
          'fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-[2px] transition-opacity lg:hidden',
          mobileNavOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={() => setMobileNavOpen(false)}
      />

      <aside
        id="app-sidebar"
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-[min(20.5rem,calc(100vw-env(safe-area-inset-left,0px)-0.5rem))] max-w-[100vw] flex-col border-l border-[var(--amline-border)] bg-gradient-to-b from-[var(--amline-surface)] via-[var(--amline-surface)] to-[var(--amline-surface-muted)]/90 shadow-[var(--amline-shadow-lg)] backdrop-blur-xl transition-transform duration-300 ease-out dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950/95 lg:static lg:z-0 lg:w-[17rem] lg:max-w-none lg:translate-x-0 lg:shadow-[4px_0_28px_-6px_rgba(15,23,42,0.07)] dark:lg:shadow-[4px_0_32px_-6px_rgba(0,0,0,0.35)]',
          mobileNavOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        )}
      >
        <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-[var(--amline-primary)]/0 via-[var(--amline-primary)]/35 to-[var(--amline-accent)]/0 opacity-60" aria-hidden />

        <div className="flex h-[4.25rem] items-center justify-between gap-2 border-b border-[var(--amline-border)] px-4 dark:border-slate-700">
          <BrandMark />
          <div className="hidden shrink-0 items-center gap-2 lg:flex">
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="flex h-9 max-w-[10rem] items-center gap-2 rounded-amline-md border border-[var(--amline-border)] bg-[var(--amline-surface-muted)]/50 px-2.5 text-xs text-[var(--amline-fg-muted)] transition-colors hover:border-[var(--amline-border-strong)] hover:text-[var(--amline-fg)] dark:border-slate-600 dark:bg-slate-800/50"
              title="پرش سریع (Ctrl+K)"
            >
              <Search className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
              <span className="hidden min-[1120px]:inline">جستجو…</span>
              <kbd className="hidden rounded border border-[var(--amline-border)] bg-[var(--amline-surface)] px-1 font-mono text-[10px] text-[var(--amline-fg-subtle)] sm:inline dark:border-slate-600">
                ⌘K
              </kbd>
            </button>
            <NotificationsBell />
            <ThemeToggle />
          </div>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-amline-md text-[var(--amline-fg-muted)] transition-colors hover:bg-[var(--amline-surface-muted)] lg:hidden"
            onClick={() => setMobileNavOpen(false)}
            aria-label="بستن منو"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {sections.map((section) => (
            <div key={section.title} className="mb-4 last:mb-0">
              <p className="amline-page-eyebrow mb-2 mr-3 text-[10px]">{section.title}</p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.to === '/dashboard' || item.to === '/contracts'}
                        onClick={() => setMobileNavOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            'flex min-h-[44px] items-center gap-3 rounded-amline-md px-3 py-2.5 text-sm transition-all duration-200 active:bg-[var(--amline-surface-muted)]',
                            isActive
                              ? 'bg-[var(--amline-primary-muted)] font-semibold text-[var(--amline-primary)] shadow-[var(--amline-shadow-sm)] ring-1 ring-[var(--amline-primary)]/15 dark:bg-blue-950/50 dark:ring-blue-500/20'
                              : 'text-[var(--amline-fg-muted)] hover:bg-[var(--amline-surface-muted)] hover:text-[var(--amline-fg)] dark:hover:bg-slate-800/80'
                          )
                        }
                      >
                        <Icon className="h-[1.125rem] w-[1.125rem] shrink-0 opacity-90" strokeWidth={2} aria-hidden />
                        <span>{item.label}</span>
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="safe-pb border-t border-[var(--amline-border)] p-4 dark:border-slate-700">
          <div className="mb-3 flex items-center gap-3 rounded-amline-md bg-[var(--amline-surface-muted)]/60 p-2 dark:bg-slate-800/50">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--amline-primary-muted)] to-[var(--amline-accent-muted)] text-sm font-bold text-[var(--amline-primary)] ring-2 ring-[var(--amline-surface)] dark:from-blue-900/60 dark:to-teal-900/40 dark:text-blue-200">
              {user?.full_name?.[0] ?? user?.mobile?.[0] ?? 'U'}
            </div>
            <div className="min-w-0 flex-1 text-right">
              <p className="truncate text-sm font-semibold text-[var(--amline-fg)]">
                {user?.full_name ?? user?.mobile}
              </p>
              <p className="amline-caption">{user?.role}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-amline-md py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            <LogOut className="h-4 w-4" strokeWidth={2} />
            خروج
          </button>
        </div>
      </aside>

      <main className="relative flex min-h-0 flex-1 flex-col overflow-y-auto pt-[calc(3.5rem+env(safe-area-inset-top,0px))] safe-pb lg:pt-0 lg:pb-0">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_45%_at_100%_-10%,rgba(37,99,235,0.055),transparent_55%)] dark:bg-[radial-gradient(ellipse_80%_40%_at_100%_0%,rgba(59,130,246,0.08),transparent_50%)]"
          aria-hidden
        />
        <div className="container-amline animate-fadeIn relative flex-1 py-3 sm:py-6 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
