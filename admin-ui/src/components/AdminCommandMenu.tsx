import { Command } from 'cmdk';
import { Search } from 'lucide-react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ADMIN_NAV_SECTIONS } from '../config/adminNav';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/cn';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AdminCommandMenu({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const handleSelect = useCallback(
    (path: string) => {
      onOpenChange(false);
      navigate(path);
    },
    [navigate, onOpenChange]
  );

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="پرش سریع در پنل مدیریت"
      dir="rtl"
      overlayClassName="fixed inset-0 z-[100] bg-slate-900/45 backdrop-blur-[2px]"
      contentClassName={cn(
        'fixed z-[101] flex max-h-[min(85dvh,calc(100vh-2rem))] flex-col overflow-hidden rounded-[var(--amline-radius-lg)] border border-[var(--amline-border)] bg-[var(--amline-surface)] shadow-[var(--amline-shadow-lg)] dark:border-slate-700 dark:bg-slate-900',
        /* موبایل: تقریباً تمام ارتفاع، حاشیهٔ امن */
        'inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))] top-[calc(0.75rem+env(safe-area-inset-top,0px)+3.5rem)] w-auto max-w-none translate-x-0 sm:inset-x-auto sm:bottom-auto',
        /* تبلت به بالا: مودال مرکزی */
        'sm:left-1/2 sm:top-[10%] sm:max-h-[min(70dvh,24rem)] sm:w-[min(32rem,calc(100vw-2rem))] sm:-translate-x-1/2'
      )}
    >
      <div className="flex items-center gap-2 border-b border-[var(--amline-border)] px-3 dark:border-slate-700">
        <Search className="h-4 w-4 shrink-0 text-[var(--amline-fg-subtle)]" strokeWidth={2} aria-hidden />
        <Command.Input
          dir="rtl"
          placeholder="جستجو در صفحات و ماژول‌ها…"
          className="flex h-12 w-full bg-transparent py-3 text-sm text-[var(--amline-fg)] outline-none placeholder:text-[var(--amline-fg-subtle)]"
        />
      </div>
      <Command.List className="max-h-[calc(100dvh-13rem)] overflow-y-auto overscroll-contain p-2 sm:max-h-[min(52vh,22rem)]">
        <Command.Empty className="py-8 text-center text-sm text-[var(--amline-fg-muted)]">
          نتیجه‌ای یافت نشد.
        </Command.Empty>
        {ADMIN_NAV_SECTIONS.map((section) => {
          const items = section.items.filter((i) => !i.permission || hasPermission(i.permission));
          if (!items.length) return null;
          return (
            <Command.Group
              key={section.title}
              heading={section.title}
              className="px-1 py-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[var(--amline-fg-subtle)]"
            >
              {items.map((item) => {
                const Icon = item.icon;
                const kw = [item.label, item.to.replace(/\//g, ' '), ...(item.keywords ?? [])].join(' ');
                return (
                  <Command.Item
                    key={item.to}
                    value={kw}
                    keywords={item.keywords}
                    onSelect={() => handleSelect(item.to)}
                    className="flex cursor-pointer items-center gap-3 rounded-amline-md px-3 py-2.5 text-sm text-[var(--amline-fg)] aria-selected:bg-[var(--amline-primary-muted)] aria-selected:text-[var(--amline-primary)] dark:aria-selected:bg-blue-950/60"
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-80" strokeWidth={2} aria-hidden />
                    <span>{item.label}</span>
                  </Command.Item>
                );
              })}
            </Command.Group>
          );
        })}
      </Command.List>
      <p className="border-t border-[var(--amline-border)] px-3 py-2 text-[10px] text-[var(--amline-fg-subtle)] dark:border-slate-700">
        <kbd className="me-1 rounded border border-[var(--amline-border)] bg-[var(--amline-surface-muted)] px-1.5 py-0.5 font-mono text-[var(--amline-fg-muted)]">
          Ctrl
        </kbd>
        <span className="me-1">+</span>
        <kbd className="rounded border border-[var(--amline-border)] bg-[var(--amline-surface-muted)] px-1.5 py-0.5 font-mono text-[var(--amline-fg-muted)]">
          K
        </kbd>
        <span className="me-2">/</span>
        <kbd className="me-1 rounded border border-[var(--amline-border)] bg-[var(--amline-surface-muted)] px-1.5 py-0.5 font-mono text-[var(--amline-fg-muted)]">
          ⌘
        </kbd>
        <span className="me-1">+</span>
        <kbd className="rounded border border-[var(--amline-border)] bg-[var(--amline-surface-muted)] px-1.5 py-0.5 font-mono text-[var(--amline-fg-muted)]">
          K
        </kbd>
        <span> — باز و بسته کردن</span>
      </p>
    </Command.Dialog>
  );
}
