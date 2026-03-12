import React from 'react';
import { useThemeStore } from '../design-system/theme';
import { useLanguageStore } from '../i18n';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { resolvedTheme } = useThemeStore();
  const { direction } = useLanguageStore();

  React.useEffect(() => {
    const root = document.documentElement;
    
    // Apply theme
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
    
    // Apply direction
    root.dir = direction;
    
    // Apply theme color meta
    const themeColor = resolvedTheme === 'dark' ? '#0F1115' : '#ffffff';
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', themeColor);
    }
  }, [resolvedTheme, direction]);

  return <>{children}</>;
}
