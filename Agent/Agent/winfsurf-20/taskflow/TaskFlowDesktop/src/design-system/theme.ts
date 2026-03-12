import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'dark' | 'light' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'dark' | 'light';
  setResolvedTheme: (theme: 'dark' | 'light') => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      resolvedTheme: 'dark',
      setTheme: (theme) => {
        set({ theme });
        // Update resolved theme
        if (theme === 'system') {
          const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
          set({ resolvedTheme: systemTheme });
        } else {
          set({ resolvedTheme: theme });
        }
      },
      setResolvedTheme: (resolvedTheme) => set({ resolvedTheme }),
    }),
    {
      name: 'agent-windsurf-amline-theme',
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);

// Initialize system theme detection
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const handleThemeChange = () => {
    const { theme, setTheme } = useThemeStore.getState();
    if (theme === 'system') {
      const systemTheme = mediaQuery.matches ? 'dark' : 'light';
      useThemeStore.setState({ resolvedTheme: systemTheme });
    }
  };
  
  mediaQuery.addEventListener('change', handleThemeChange);
  
  // Set initial resolved theme
  const { theme } = useThemeStore.getState();
  if (theme === 'system') {
    const systemTheme = mediaQuery.matches ? 'dark' : 'light';
    useThemeStore.setState({ resolvedTheme: systemTheme });
  }
}
