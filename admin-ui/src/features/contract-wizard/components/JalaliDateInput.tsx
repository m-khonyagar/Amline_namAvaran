import { useEffect, useMemo, useState } from 'react';
import {
  formatJalaliParts,
  jalaaliDaysInMonth,
  parseJalaliFlexible,
  todayJalaliString,
} from '../../../lib/jalaliDate';

type Props = {
  label: string;
  value: string;
  onChange: (formatted: string) => void;
  error?: string;
  hint?: string;
};

const YEARS = Array.from({ length: 31 }, (_, i) => 1395 + i);

export function JalaliDateInput({ label, value, onChange, error, hint }: Props) {
  const initial = useMemo(() => parseJalaliFlexible(value), [value]);
  const [jy, setJy] = useState(initial?.jy ?? 1403);
  const [jm, setJm] = useState(initial?.jm ?? 1);
  const [jd, setJd] = useState(initial?.jd ?? 1);

  useEffect(() => {
    const p = parseJalaliFlexible(value);
    if (p) {
      setJy(p.jy);
      setJm(p.jm);
      setJd(p.jd);
    }
  }, [value]);

  const maxDay = jalaaliDaysInMonth(jy, jm);
  const days = Array.from({ length: maxDay }, (_, i) => i + 1);

  function commit(ny: number, nm: number, nd: number) {
    const d = Math.min(nd, jalaaliDaysInMonth(ny, nm));
    onChange(formatJalaliParts(ny, nm, d));
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[var(--amline-fg)]">{label}</label>
      <div className="flex flex-wrap items-center gap-2">
        <select
          dir="ltr"
          className="min-w-[5.5rem] rounded-[var(--amline-radius-md)] border border-[var(--amline-border)] bg-[var(--amline-surface)] px-2 py-2 text-sm text-[var(--amline-fg)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--amline-ring)] dark:border-slate-600 dark:bg-slate-900"
          value={jy}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            setJy(v);
            commit(v, jm, jd);
          }}
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <span className="text-[var(--amline-fg-muted)]">/</span>
        <select
          dir="ltr"
          className="min-w-[4.5rem] rounded-[var(--amline-radius-md)] border border-[var(--amline-border)] bg-[var(--amline-surface)] px-2 py-2 text-sm text-[var(--amline-fg)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--amline-ring)] dark:border-slate-600 dark:bg-slate-900"
          value={jm}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            setJm(v);
            const newMax = jalaaliDaysInMonth(jy, v);
            const nd = Math.min(jd, newMax);
            setJd(nd);
            commit(jy, v, nd);
          }}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {String(m).padStart(2, '0')}
            </option>
          ))}
        </select>
        <span className="text-[var(--amline-fg-muted)]">/</span>
        <select
          dir="ltr"
          className="min-w-[4.5rem] rounded-[var(--amline-radius-md)] border border-[var(--amline-border)] bg-[var(--amline-surface)] px-2 py-2 text-sm text-[var(--amline-fg)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--amline-ring)] dark:border-slate-600 dark:bg-slate-900"
          value={Math.min(jd, maxDay)}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            setJd(v);
            commit(jy, jm, v);
          }}
        >
          {days.map((d) => (
            <option key={d} value={d}>
              {String(d).padStart(2, '0')}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="rounded-[var(--amline-radius-md)] border border-[var(--amline-border)] bg-[var(--amline-surface-muted)] px-3 py-2 text-xs font-medium text-[var(--amline-fg-muted)] transition hover:bg-[var(--amline-border)]/40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          onClick={() => {
            const t = todayJalaliString();
            onChange(t);
          }}
        >
          امروز
        </button>
      </div>
      <input
        type="text"
        dir="ltr"
        className={`w-full rounded-[var(--amline-radius-md)] border bg-[var(--amline-surface)] px-3 py-2 font-mono text-sm text-[var(--amline-fg)] placeholder:text-[var(--amline-fg-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--amline-ring)] dark:bg-slate-900 ${
          error ? 'border-red-500 dark:border-red-500' : 'border-[var(--amline-border)] dark:border-slate-600'
        }`}
        placeholder="1403/01/01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`${label} — ورود متنی`}
      />
      {hint ? <p className="text-xs text-[var(--amline-fg-subtle)]">{hint}</p> : null}
      {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  );
}
