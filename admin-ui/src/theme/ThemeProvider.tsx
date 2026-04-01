import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ThemeContext, type ThemePreference } from './ThemeContext';

const STORAGE_KEY = 'amline_theme';

function readStored(): ThemePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* ignore */
  }
  return 'system';
}

function getSystemDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function resolveTheme(pref: ThemePreference): 'light' | 'dark' {
  if (pref === 'system') return getSystemDark() ? 'dark' : 'light';
  return pref;
}

function initialPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  return readStored();
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(initialPreference);

  const applyDom = useCallback((pref: ThemePreference) => {
    const r = resolveTheme(pref);
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(r);
    try {
      localStorage.setItem(STORAGE_KEY, pref);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    applyDom(preference);
  }, [preference, applyDom]);

  useEffect(() => {
    if (preference !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyDom('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [preference, applyDom]);

  const setPreference = useCallback((t: ThemePreference) => {
    setPreferenceState(t);
  }, []);

  const resolved = useMemo(() => resolveTheme(preference), [preference]);

  const value = useMemo(
    () => ({
      preference,
      setPreference,
      resolved,
    }),
    [preference, setPreference, resolved]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
