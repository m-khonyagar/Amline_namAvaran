'use client';

import { Toaster } from 'sonner';
import { useThemeContext } from '../theme/ThemeContext';

export function ThemedToaster() {
  const { resolved } = useThemeContext();
  return (
    <Toaster
      position="top-left"
      dir="rtl"
      theme={resolved === 'dark' ? 'dark' : 'light'}
      toastOptions={{
        classNames: {
          toast:
            resolved === 'dark'
              ? 'bg-[var(--amline-surface-elevated)] text-[var(--amline-fg)] border border-[var(--amline-border)]'
              : 'bg-[var(--amline-surface)] text-[var(--amline-fg)] border border-[var(--amline-border)] shadow-[var(--amline-shadow-sm)]',
        },
      }}
    />
  );
}
