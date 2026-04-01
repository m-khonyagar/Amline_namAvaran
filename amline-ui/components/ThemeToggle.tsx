'use client';

import { useThemeContext } from '../theme/ThemeContext';
import type { ThemePreference } from '../theme/ThemeContext';

const LABELS: Record<ThemePreference, string> = {
  light: 'روشن',
  dark: 'تیره',
  system: 'هماهنگ با سیستم',
};

export function ThemeToggle() {
  const { preference, setPreference } = useThemeContext();

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 dark:text-slate-400" id="theme-label-amline">
        تم
      </span>
      <select
        aria-labelledby="theme-label-amline"
        value={preference}
        onChange={(e) => setPreference(e.target.value as ThemePreference)}
        className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium text-gray-800 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus-visible:ring-offset-slate-950"
      >
        {(Object.keys(LABELS) as ThemePreference[]).map((k) => (
          <option key={k} value={k}>
            {LABELS[k]}
          </option>
        ))}
      </select>
    </div>
  );
}
