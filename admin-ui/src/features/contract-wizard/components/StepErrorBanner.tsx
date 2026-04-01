
interface StepErrorBannerProps {
  message: string | null;
  /** خطوط جزئی (مثلاً خطاهای فیلد به فیلد از سرور) */
  details?: string[];
  /** راهنمای اضافی برای اصلاح */
  hint?: string | null;
  onDismiss?: () => void;
}

export function StepErrorBanner({ message, details = [], hint, onDismiss }: StepErrorBannerProps) {
  if (!message && details.length === 0) return null;

  const main = message ?? (details[0] ?? '');

  return (
    <div
      dir="rtl"
      role="alert"
      className="mb-4 flex items-start gap-3 rounded-[var(--amline-radius-lg)] border border-red-200/90 bg-red-50/95 p-4 shadow-[var(--amline-shadow-sm)] dark:border-red-900/55 dark:bg-red-950/55 dark:shadow-red-950/25"
    >
      <span className="text-xl leading-none text-red-500 dark:text-red-400" aria-hidden>
        !
      </span>
      <div className="min-w-0 flex-1 space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700/90 dark:text-red-300/90">
            علت خطا
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm font-medium leading-relaxed text-red-950 dark:text-red-50">
            {main}
          </p>
        </div>

        {details.length > 0 && (
          <div className="rounded-[var(--amline-radius-md)] border border-red-200/70 bg-white/70 p-3 dark:border-red-900/50 dark:bg-red-950/40">
            <p className="mb-2 text-xs font-semibold text-red-800 dark:text-red-200">فیلدها و جزئیات</p>
            <ul className="list-disc space-y-1.5 pr-5 text-xs leading-relaxed text-red-900/95 dark:text-red-100/95">
              {details.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>
        )}

        {hint ? (
          <div className="border-t border-red-200/70 pt-3 dark:border-red-900/50">
            <p className="text-xs font-semibold text-red-800 dark:text-red-200">اقدام اصلاحی پیشنهادی</p>
            <p className="mt-1 text-xs leading-relaxed text-red-900/95 dark:text-red-100/90">{hint}</p>
          </div>
        ) : null}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="بستن خطا"
          className="shrink-0 text-lg leading-none text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-300"
        >
          ×
        </button>
      )}
    </div>
  );
}
