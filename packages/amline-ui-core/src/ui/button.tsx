import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--amline-primary)] text-white shadow-sm hover:bg-[var(--amline-primary-hover)] active:scale-[0.99] disabled:opacity-50',
  secondary:
    'bg-[var(--amline-surface-muted)] text-[var(--amline-fg)] hover:bg-[var(--amline-border)]/80 dark:bg-slate-800 dark:hover:bg-slate-700',
  outline:
    'border border-[var(--amline-border)] bg-[var(--amline-surface)] text-[var(--amline-fg)] hover:bg-[var(--amline-surface-muted)] dark:border-slate-600',
  ghost: 'text-[var(--amline-fg-muted)] hover:bg-[var(--amline-surface-muted)] dark:hover:bg-slate-800',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 text-xs rounded-[var(--amline-radius-md)]',
  md: 'min-h-11 px-4 text-sm rounded-[var(--amline-radius-md)]',
  lg: 'min-h-12 px-6 text-base rounded-[var(--amline-radius-lg)]',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--amline-ring)] focus-visible:ring-offset-2',
        'dark:focus-visible:ring-offset-[var(--amline-bg)]',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  )
);
Button.displayName = 'Button';
