import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/cn';
import { useAdminNotificationsFeed } from '../features/notifications/useAdminNotifications';

export function NotificationsBell() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission('notifications:read');
  const [open, setOpen] = useState(false);
  const { data, isFetching, markOne } = useAdminNotificationsFeed(canRead);

  if (!canRead) return null;

  const items = data?.items ?? [];
  const unread = data?.unread_count ?? items.filter((i) => !i.read).length;

  return (
    <div className="relative z-50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-11 min-h-[44px] w-11 min-w-[44px] items-center justify-center rounded-amline-md border border-[var(--amline-border)] text-[var(--amline-fg-muted)] transition-colors hover:bg-[var(--amline-surface-muted)] hover:text-[var(--amline-primary)] active:scale-[0.98] dark:border-slate-600"
        aria-expanded={open}
        aria-label="اعلان‌ها"
      >
        <Bell className="h-[1.125rem] w-[1.125rem]" strokeWidth={2} />
        {unread > 0 ? (
          <span className="absolute -left-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
        {isFetching ? (
          <span className="absolute bottom-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-cyan-500" aria-hidden />
        ) : null}
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-slate-900/20 sm:bg-transparent"
            aria-label="بستن اعلان‌ها"
            onClick={() => setOpen(false)}
          />
          <div
            className={cn(
              'z-50 overflow-hidden rounded-amline-lg border border-[var(--amline-border)] bg-[var(--amline-surface)] shadow-[var(--amline-shadow-lg)] dark:border-slate-700',
              /* موبایل: زیر هدر، تمام‌عرض با حاشیهٔ امن */
              'fixed left-3 right-3 top-[calc(3.5rem+env(safe-area-inset-top,0px)+0.5rem)] max-h-[min(70vh,28rem)] w-auto max-w-none sm:left-auto sm:right-auto',
              /* دسکتاپ / تبلت: زیر دکمه */
              'sm:absolute sm:mt-2 sm:max-h-72 sm:w-[min(22rem,calc(100vw-2rem))] sm:max-w-[22rem]',
              /* RTL: لبهٔ منطقی «شروع» با دکمه هم‌تراز */
              'sm:end-0 sm:top-full'
            )}
          >
            <div className="flex items-center justify-between border-b border-[var(--amline-border)] bg-[var(--amline-surface-muted)]/50 px-4 py-3 dark:border-slate-700">
              <div>
                <p className="text-sm font-semibold text-[var(--amline-fg)]">اعلان‌ها</p>
                <p className="amline-caption mt-0.5">آخرین رویدادها</p>
              </div>
              <Link
                to="/notifications"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center text-xs font-semibold text-[var(--amline-primary)] hover:underline sm:min-h-0 sm:min-w-0 sm:px-1"
                onClick={() => setOpen(false)}
              >
                همه
              </Link>
            </div>
            <div className="p-2">
              {items.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-[var(--amline-fg-muted)]">اعلانی نیست</p>
              ) : (
                <ul className="max-h-[min(50vh,18rem)] space-y-1 overflow-y-auto overscroll-contain sm:max-h-60">
                  {items.slice(0, 8).map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        className={cn(
                          'min-h-[48px] w-full rounded-amline-md px-3 py-3 text-right text-sm transition-colors active:bg-black/5 dark:active:bg-white/10',
                          n.read
                            ? 'text-[var(--amline-fg-muted)]'
                            : 'bg-[var(--amline-primary-muted)] font-medium text-[var(--amline-fg)]'
                        )}
                        onClick={() => {
                          if (!n.read) markOne.mutate(n.id);
                        }}
                      >
                        <p className="font-medium">{n.title}</p>
                        {n.body ? <p className="mt-0.5 text-xs opacity-90">{n.body}</p> : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
