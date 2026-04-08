import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '../theme/useTheme';
import type { ThemePreference } from '../theme/ThemeContext';
import { cn } from '../lib/cn';

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'روشن', Icon: Sun },
  { value: 'dark', label: 'تیره', Icon: Moon },
  { value: 'system', label: 'سیستم', Icon: Monitor },
];

export function ThemeToggle() {
  const { preference, setPreference } = useTheme();

  return (
    <div
      className="inline-flex items-center rounded-amline-md border border-[var(--amline-border)] bg-[var(--amline-surface-muted)]/80 p-0.5 shadow-[var(--amline-shadow-sm)] backdrop-blur-sm dark:border-slate-600 dark:bg-slate-800/80"
      role="group"
      aria-label="انتخاب تم"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = preference === value;
        return (
          <button
            key={value}
            type="button"
            title={label}
            aria-pressed={active}
            aria-label={label}
            onClick={() => setPreference(value)}
            className={cn(
              'flex h-10 w-10 min-h-[40px] min-w-[40px] items-center justify-center rounded-[calc(var(--amline-radius-md)-2px)] transition-all duration-200 sm:h-9 sm:w-9 sm:min-h-0 sm:min-w-0',
              active
                ? 'bg-[var(--amline-surface)] text-[var(--amline-primary)] shadow-sm dark:bg-slate-700 dark:text-blue-300'
                : 'text-[var(--amline-fg-muted)] hover:text-[var(--amline-fg)]'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
