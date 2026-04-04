'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ExternalLink, X } from 'lucide-react';
import { siteConfig } from '@/lib/siteConfig';

declare global {
  interface Window {
    Eitaa?: { WebApp?: { ready?: () => void; expand?: () => void; close?: () => void } };
    Telegram?: { WebApp?: { ready?: () => void; expand?: () => void; close?: () => void } };
  }
}

export default function MiniAppPage() {
  useEffect(() => {
    try {
      window.Telegram?.WebApp?.ready?.();
      window.Telegram?.WebApp?.expand?.();
    } catch {
      /* ignore */
    }
    try {
      window.Eitaa?.WebApp?.ready?.();
      window.Eitaa?.WebApp?.expand?.();
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div className="flex min-h-[85vh] flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">برنامک اَملاین</p>
        <h1 className="mt-3 text-2xl font-extrabold text-white">ورود سبک از پیام‌رسان</h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-400">
          این صفحه برای نمایش داخل WebView بله، ایتا یا تلگرام بهینه شده است. برای تجربهٔ کامل، پنل اصلی را باز کنید.
        </p>
        <a
          href={siteConfig.appUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-blue-600 to-cyan-500 py-4 text-sm font-bold text-white shadow-lg"
        >
          باز کردن پنل کامل
          <ExternalLink className="h-4 w-4" />
        </a>
        <Link
          href="/"
          className="mt-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-300"
        >
          <X className="h-4 w-4" />
          بستن و بازگشت به سایت
        </Link>
      </div>
      <p className="mt-8 max-w-md text-center text-xs text-slate-600">
        توسعه‌دهندگان: آدرس همین صفحه را در پنل ایتایار / BotFather بله به‌عنوان Web App ثبت کنید. وب‌هوک‌های سرور در مسیر{' '}
        <code className="rounded bg-white/5 px-1 text-cyan-600">/api/v1/webhooks/*</code> قابل تنظیم است.
      </p>
    </div>
  );
}
