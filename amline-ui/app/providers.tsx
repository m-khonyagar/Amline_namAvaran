'use client';

import type { ReactNode } from 'react';
import { AppChrome } from '../components/AppChrome';
import { ThemedToaster } from '../components/ThemedToaster';
import { ThemeProvider } from '../theme/ThemeProvider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ThemedToaster />
      <AppChrome>{children}</AppChrome>
    </ThemeProvider>
  );
}
