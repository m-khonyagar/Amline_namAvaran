'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { hasAccessToken, logout } from '../lib/auth';
import { ThemeToggle } from './ThemeToggle';

const NAV = [
  { href: '/contracts', label: 'قراردادها' },
  { href: '/needs', label: 'نیازمندی' },
  { href: '/browse', label: 'بازار' },
  { href: '/wallet', label: 'کیف پول' },
] as const;

export function AppChrome({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    setAuthenticated(hasAccessToken());
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-[var(--amline-border)] bg-[var(--amline-surface)]/95 px-4 py-3 shadow-[var(--amline-shadow-sm)] backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95 sm:px-6">
        <div className="container-amline flex items-center justify-between gap-3">
          <Link
            href="/"
            className="min-h-[44px] min-w-[44px] shrink-0 content-center text-lg font-bold text-[var(--amline-primary)] sm:text-xl"
          >
            اَملاین
          </Link>
          <nav
            className="flex max-w-[min(100%,28rem)] flex-1 flex-nowrap items-center justify-start gap-x-2 overflow-x-auto text-xs text-[var(--amline-fg-muted)] [-ms-overflow-style:none] [scrollbar-width:none] sm:max-w-none sm:justify-center sm:gap-x-3 sm:text-sm [&::-webkit-scrollbar]:hidden"
            aria-label="ناوبری اصلی"
          >
            {NAV.map(({ href, label }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`min-h-[36px] content-center rounded-md px-2 py-1 transition-colors ${
                    active
                      ? 'font-semibold text-[var(--amline-primary)]'
                      : 'hover:text-[var(--amline-fg)]'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-3">
            {authenticated ? (
              <button
                type="button"
                onClick={() => {
                  logout();
                  setAuthenticated(false);
                  router.push('/login');
                }}
                className="btn btn-outline min-h-10 px-3 py-1.5 text-xs dark:border-slate-700"
              >
                خروج
              </button>
            ) : (
              <Link
                href="/login"
                className="btn btn-outline min-h-10 px-3 py-1.5 text-xs font-medium text-[var(--amline-primary)] dark:border-slate-700"
              >
                ورود
              </Link>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
