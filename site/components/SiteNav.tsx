'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';
import { siteConfig } from '@/lib/siteConfig';

const links = [
  { href: '/', label: 'خانه' },
  { href: '/#features', label: 'ویژگی‌ها' },
  { href: '/blog/', label: 'بلاگ' },
  { href: '/agencies/', label: 'بنگاه‌ها' },
  { href: '/#channels', label: 'بازو و برنامک' },
  { href: '/miniapp/', label: 'برنامک وب' },
];

function navActive(pathname: string, href: string) {
  if (href.includes('#')) return false;
  const path = href.split('#')[0].replace(/\/$/, '') || '/';
  if (path === '/') return pathname === '/' || pathname === '';
  return pathname === path + '/' || pathname.startsWith(path + '/');
}

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-sm font-extrabold text-white shadow-lg shadow-blue-500/25">
            ا
          </span>
          <span className="text-lg font-extrabold tracking-tight text-white">اَملاین</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={clsx(
                'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                navActive(pathname, l.href) ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href={siteConfig.appUrl}
            className="rounded-xl bg-gradient-to-l from-blue-600 to-cyan-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition hover:brightness-110"
          >
            ورود به پنل
          </Link>
        </div>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-white md:hidden"
          aria-label="منو"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-white/10 bg-slate-950 px-4 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-lg px-3 py-3 text-sm font-medium text-slate-200"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href={siteConfig.appUrl}
              className="mt-2 rounded-xl bg-blue-600 py-3 text-center text-sm font-bold text-white"
              onClick={() => setOpen(false)}
            >
              ورود به پنل
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
