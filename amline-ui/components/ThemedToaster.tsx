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
              ? 'bg-slate-900 text-slate-100 border border-slate-700'
              : 'bg-white text-slate-900 border border-slate-200',
        },
      }}
    />
  );
}
