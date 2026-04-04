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
        className="relative flex h-10 w-10 items-center justify-center rounded-amline-md border border-[var(--amline-border)] text-[var(--amline-fg-muted)] transition-colors hover:bg-[var(--amline-surface-muted)] hover:text-[var(--amline-primary)] dark:border-slate-600"
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
            className="fixed inset-0 z-40 cursor-default"
            aria-label="بستن اعلان‌ها"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-amline-lg border border-[var(--amline-border)] bg-[var(--amline-surface)] shadow-[var(--amline-shadow-lg)] dark:border-slate-700">
            <div className="flex items-center justify-between border-b border-[var(--amline-border)] bg-[var(--amline-surface-muted)]/50 px-4 py-3 dark:border-slate-700">
              <div>
                <p className="text-sm font-semibold text-[var(--amline-fg)]">اعلان‌ها</p>
                <p className="amline-caption mt-0.5">آخرین رویدادها</p>
              </div>
              <Link
                to="/notifications"
                className="text-xs font-semibold text-[var(--amline-primary)] hover:underline"
                onClick={() => setOpen(false)}
              >
                همه
              </Link>
            </div>
            <div className="p-2">
              {items.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-[var(--amline-fg-muted)]">اعلانی نیست</p>
              ) : (
                <ul className="max-h-72 space-y-1 overflow-y-auto">
                  {items.slice(0, 8).map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        className={cn(
                          'w-full rounded-amline-md px-3 py-2.5 text-right text-sm transition-colors',
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
