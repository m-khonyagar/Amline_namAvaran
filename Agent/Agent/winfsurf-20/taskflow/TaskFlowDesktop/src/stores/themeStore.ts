import { useThemeStore as useDesignThemeStore } from '../design-system/theme';

export function useThemeStore() {
  const state = useDesignThemeStore();
  return {
    ...state,
    isDark: state.resolvedTheme === 'dark',
  };
}
