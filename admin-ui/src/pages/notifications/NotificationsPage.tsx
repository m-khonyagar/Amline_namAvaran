import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { faIR } from 'date-fns/locale';
import { Bell, CheckCheck, MonitorSmartphone } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminNotificationsFeed } from '../../features/notifications/useAdminNotifications';
import { useDesktopNotifyPermission } from '../../features/notifications/useDesktopNotifications';
import { loadDesktopNotifyPrefs } from '../../features/notifications/notificationPrefs';
import { createTestNotification } from '../../features/notifications/notificationsApi';
import { useAuth } from '../../hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';

export default function NotificationsPage() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission('notifications:read');
  const canWrite = hasPermission('notifications:write');
  const { data, isLoading, isError, markOne, markAll, refetch } = useAdminNotificationsFeed(canRead);
  const { setEnabled } = useDesktopNotifyPermission();
  const [desktopOn, setDesktopOn] = useState(() => loadDesktopNotifyPrefs().enabled);
  const qc = useQueryClient();

  useEffect(() => {
    setDesktopOn(loadDesktopNotifyPrefs().enabled);
  }, []);

  async function toggleDesktop(v: boolean) {
    const ok = await setEnabled(v);
    setDesktopOn(loadDesktopNotifyPrefs().enabled);
    if (v && !ok) toast.error('اجازهٔ اعلان دسکتاپ داده نشد');
    else if (v && ok) toast.success('اعلان دسکتاپ فعال شد');
    else if (!v) toast.message('اعلان دسکتاپ خاموش شد');
  }

  async function sendTest() {
    try {
      await createTestNotification({
        title: 'اعلان آزمایشی',
        body: 'این یک پیام تست از پنل است.',
        type: 'system',
      });
      await qc.invalidateQueries({ queryKey: ['admin-notifications'] });
      toast.success('اعلان تست ایجاد شد');
    } catch {
      toast.error('خطا در ایجاد اعلان تست');
    }
  }

  if (!canRead) {
    return (
      <div dir="rtl" className="p-6 text-center text-[var(--amline-fg-muted)]">
        به مجوز notifications:read نیاز دارید.
      </div>
    );
  }

  const items = data?.items ?? [];

  return (
    <div dir="rtl" className="container-amline max-w-3xl py-4 sm:py-6">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-amline-lg bg-[var(--amline-primary-muted)] text-[var(--amline-primary)]">
            <Bell className="h-6 w-6" strokeWidth={2} />
          </span>
          <div>
            <h1 className="amline-display">مرکز اعلان‌ها</h1>
            <p className="amline-caption mt-1">
              به‌روزرسانی خودکار هر ۴۵ ثانیه — مبتنی بر TanStack Query (متن‌باز)
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {items.some((i) => !i.read) ? (
            <button
              type="button"
              className="btn btn-outline w-full min-h-11 text-sm sm:w-auto"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
            >
              <CheckCheck className="ml-1 inline h-4 w-4" />
              خواندن همه
            </button>
          ) : null}
          <button type="button" className="btn btn-ghost w-full min-h-11 text-sm sm:w-auto" onClick={() => refetch()}>
            تازه‌سازی
          </button>
        </div>
      </div>

      <div className="mb-8 rounded-amline-lg border border-[var(--amline-border)] bg-[var(--amline-surface)] p-5 shadow-[var(--amline-shadow-sm)]">
        <div className="flex items-start gap-3">
          <MonitorSmartphone className="mt-0.5 h-5 w-5 text-[var(--amline-primary)]" />
          <div className="flex-1">
            <p className="font-semibold text-[var(--amline-fg)]">اعلان مرورگر (Web Notifications API)</p>
            <p className="amline-caption mt-1">
              وقتی تب در پس‌زمینه است، برای اعلان‌های جدید نوتیفیکیشن سیستم‌عامل نمایش داده می‌شود. در حالت فعال بودن تب، از Sonner (toast) استفاده می‌شود.
            </p>
            <label className="mt-4 flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-[var(--amline-border)]"
                checked={desktopOn}
                onChange={(e) => toggleDesktop(e.target.checked)}
              />
              <span className="text-sm text-[var(--amline-fg)]">فعال‌سازی اعلان دسکتاپ</span>
            </label>
          </div>
        </div>
        {canWrite ? (
          <div className="mt-4 border-t border-[var(--amline-border)] pt-4">
            <button type="button" className="btn btn-secondary text-sm" onClick={sendTest}>
              ارسال اعلان آزمایشی (توسعه)
            </button>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <p className="text-center text-[var(--amline-fg-muted)]">در حال بارگذاری…</p>
      ) : isError ? (
        <p className="text-center text-red-600">خطا در دریافت اعلان‌ها</p>
      ) : items.length === 0 ? (
        <p className="rounded-amline-lg border border-dashed border-[var(--amline-border)] py-16 text-center text-[var(--amline-fg-muted)]">
          اعلانی ثبت نشده است.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((n) => (
            <li
              key={n.id}
              className={cnCard(n.read)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[var(--amline-fg)]">{n.title}</p>
                  {n.body ? <p className="mt-1 text-sm text-[var(--amline-fg-muted)]">{n.body}</p> : null}
                  {n.created_at ? (
                    <p className="amline-caption mt-2">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: faIR })}
                    </p>
                  ) : null}
                  {n.type ? (
                    <span className="mt-2 inline-block rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                      {n.type}
                    </span>
                  ) : null}
                </div>
                {!n.read ? (
                  <button
                    type="button"
                    className="min-h-[44px] shrink-0 px-2 text-xs font-semibold text-[var(--amline-primary)] hover:underline sm:min-h-0"
                    onClick={() => markOne.mutate(n.id)}
                    disabled={markOne.isPending}
                  >
                    خواندم
                  </button>
                ) : (
                  <span className="flex min-h-[44px] shrink-0 items-center text-xs text-[var(--amline-fg-subtle)] sm:min-h-0">
                    خوانده‌شده
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function cnCard(read: boolean) {
  return read
    ? 'rounded-amline-lg border border-[var(--amline-border)] bg-[var(--amline-surface-muted)]/40 p-4 opacity-90'
    : 'rounded-amline-lg border border-[var(--amline-primary)]/25 bg-[var(--amline-primary-muted)]/50 p-4 shadow-[var(--amline-shadow-sm)]';
}
