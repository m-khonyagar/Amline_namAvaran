import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

export type AlertVariant = 'error' | 'warning' | 'success' | 'info';

const styles: Record<AlertVariant, string> = {
  error:
    'border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-100',
  warning:
    'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-50',
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/35 dark:text-emerald-50',
  info: 'border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900/50 dark:bg-sky-950/35 dark:text-sky-50',
};

export function Alert({
  variant = 'info',
  title,
  children,
  className,
  icon,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  variant?: AlertVariant;
  title?: string;
  icon?: ReactNode;
}) {
  return (
    <div role="alert" className={cn('rounded-[var(--amline-radius-lg)] border p-4 text-sm', styles[variant], className)} {...props}>
      <div className="flex gap-3">
        {icon ? <span className="shrink-0 text-lg leading-none">{icon}</span> : null}
        <div className="min-w-0 space-y-1">
          {title ? <p className="font-semibold">{title}</p> : null}
          <div className="text-sm leading-relaxed opacity-95">{children}</div>
        </div>
      </div>
    </div>
  );
}
