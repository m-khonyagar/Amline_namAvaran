import type { ReactNode } from 'react';
import './wizardFigma.css';

/** خط افقی + عنوان بخش (اطلاعات حساب، اطلاعات شرکت، …) */
export function WfSectionDivider({ label }: { label: string }) {
  return (
    <div className="flex w-full items-center gap-2">
      <div className="h-px min-w-0 flex-1 bg-[var(--wf-border)]" />
      <span className="wf-body-s shrink-0 whitespace-nowrap text-[var(--wf-caption)]">{label}</span>
    </div>
  );
}

/** ردیف: برچسب + رادیو دایره‌ای (RTL) — یک label معتبر */
export function WfLabeledRadio({
  label,
  checked,
  onChange,
  name,
  value,
  id,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  name: string;
  value: string;
  id: string;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-1 wf-body-s font-medium text-[var(--wf-title)]"
    >
      <span>{label}</span>
      <input
        id={id}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <span
        className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--amline-accent)]"
        style={{
          borderColor: checked ? 'var(--wf-radio-selected)' : 'var(--wf-border)',
          background: checked ? 'var(--wf-radio-selected)' : 'transparent',
        }}
        aria-hidden
      >
        {checked ? <span className="size-2.5 rounded-full bg-white" /> : null}
      </span>
    </label>
  );
}

/** کارت اصلی فرم داخل مرحله */
export function WfFormCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`flex w-full flex-col gap-5 border border-[var(--wf-border)] bg-[var(--wf-surface)] p-3 ${className}`}
      style={{ borderRadius: 'var(--wf-card-radius)' }}
    >
      {children}
    </div>
  );
}

/** برچسب فیلد (Subtitle/Medium) */
export function WfFieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block w-full text-right wf-subtitle-m text-[var(--wf-title)]"
    >
      {children}
    </label>
  );
}

/** ورودی یک‌خطی استاندارد ارتفاع ۴۸px */
export function WfInput({
  className = '',
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return (
    <input
      className={`h-12 w-full border bg-[var(--wf-surface)] px-3 text-right wf-body-m text-[var(--wf-title)] placeholder:text-[var(--wf-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--amline-accent)] ${error ? 'border-red-500' : 'border-[var(--wf-border)]'} ${className}`}
      style={{ borderRadius: 'var(--wf-field-radius)' }}
      {...props}
    />
  );
}

export function WfSelect({
  className = '',
  error,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }) {
  return (
    <select
      className={`h-12 w-full cursor-pointer border bg-[var(--wf-surface)] px-3 text-right wf-body-m text-[var(--wf-title)] focus:outline-none focus:ring-2 focus:ring-[var(--amline-accent)] ${error ? 'border-red-500' : 'border-[var(--wf-border)]'} ${className}`}
      style={{ borderRadius: 'var(--wf-field-radius)' }}
      {...props}
    >
      {children}
    </select>
  );
}

/** بلوک فیلد: عنوان + کنترل + راهنما */
export function WfFieldBlock({
  label,
  labelFor,
  hint,
  hintIcon,
  error,
  children,
}: {
  label: string;
  labelFor?: string;
  hint?: string;
  hintIcon?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex w-full max-w-[327px] flex-col items-stretch gap-2">
      <WfFieldLabel htmlFor={labelFor}>{label}</WfFieldLabel>
      {children}
      {hint ? (
        <div className="flex items-start justify-end gap-1 text-right wf-body-s text-[var(--wf-caption)]">
          {hintIcon ? <span className="mt-0.5 shrink-0">{hintIcon}</span> : null}
          <span className="min-w-0 flex-1">{hint}</span>
        </div>
      ) : null}
      {error ? (
        <p className="text-right text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** ردیف شبا با پیشوند IR */
export function WfShebaRow({
  value,
  onChange,
  placeholder,
  error,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  error?: boolean;
  id?: string;
}) {
  const digits = value.replace(/^IR/i, '').replace(/\D/g, '').slice(0, 24);
  return (
    <div
      className={`flex h-12 w-full items-center gap-2 border bg-[var(--wf-surface)] px-3 focus-within:ring-2 focus-within:ring-[var(--amline-accent)] ${error ? 'border-red-500' : 'border-[var(--wf-border)]'}`}
      style={{ borderRadius: 'var(--wf-field-radius)' }}
    >
      <div className="flex shrink-0 items-center gap-2 border-l border-[var(--wf-border)] pl-2">
        <span className="wf-subtitle-m text-[var(--wf-title)]">IR</span>
      </div>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        dir="ltr"
        className="min-w-0 flex-1 bg-transparent text-left font-mono wf-body-m text-[var(--wf-title)] placeholder:text-[var(--wf-placeholder)] focus:outline-none"
        placeholder={placeholder}
        value={digits}
        onChange={(e) => {
          const d = e.target.value.replace(/\D/g, '').slice(0, 24);
          onChange(d.length > 0 ? `IR${d}` : '');
        }}
      />
    </div>
  );
}

export function WfInfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="text-[var(--wf-caption)]">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 7v4M8 4.5v.01" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
