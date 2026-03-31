
interface StepErrorBannerProps {
  message: string | null;
  onDismiss?: () => void;
}

export function StepErrorBanner({ message, onDismiss }: StepErrorBannerProps) {
  if (!message) return null;

  return (
    <div
      dir="rtl"
      role="alert"
      className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-3 mb-4"
    >
      <span className="text-red-500 text-lg leading-none">⚠</span>
      <p className="flex-1 text-sm text-red-700">{message}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="بستن خطا"
          className="text-red-400 hover:text-red-600 text-lg leading-none"
        >
          ×
        </button>
      )}
    </div>
  );
}
