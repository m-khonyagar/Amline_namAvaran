import { useRef } from 'react';
import { useOtpTimer } from '../hooks/useOtpTimer';

interface OtpFormProps {
  mobile: string;
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  /** When set (dev only from callers), shows a one-click confirm with this OTP. */
  devQuickOtp?: string;
}

export function OtpForm({ mobile, onVerify, onResend, isLoading, error, devQuickOtp }: OtpFormProps) {
  const { secondsLeft, isExpired, reset } = useOtpTimer(120);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const otp = inputRef.current?.value.trim() ?? '';
    if (!otp) return;
    await onVerify(otp);
  }

  async function handleResend() {
    await onResend();
    reset();
    if (inputRef.current) inputRef.current.value = '';
  }

  const maskedMobile = mobile.replace(/(\d{4})\d{4}(\d{3})/, '$1****$2');

  return (
    <div dir="rtl" className="space-y-4">
      <p className="text-sm text-gray-600">
        کد تأیید به شماره <span className="font-mono font-bold">{maskedMobile}</span> ارسال شد.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="otp-input" className="block text-sm font-medium text-gray-700 mb-1">
            کد تأیید
          </label>
          <input
            id="otp-input"
            ref={inputRef}
            type="text"
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
            placeholder="کد ۶ رقمی"
            className={[
              'w-full border rounded-lg px-3 py-2 text-center font-mono text-lg tracking-widest',
              'focus:outline-none focus:ring-2 focus:ring-primary',
              error ? 'border-red-500' : 'border-gray-300',
            ].join(' ')}
            aria-describedby={error ? 'otp-error' : undefined}
          />
          {error && (
            <p id="otp-error" className="mt-1 text-xs text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>

        {/* تایمر */}
        {!isExpired ? (
          <p className="text-xs text-gray-500 text-center">
            ارسال مجدد تا <span className="font-bold text-primary">{secondsLeft}</span> ثانیه دیگر
          </p>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            className="w-full text-sm text-primary underline"
          >
            ارسال مجدد کد
          </button>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-primary text-white rounded-lg py-2 font-medium disabled:opacity-50"
        >
          {isLoading ? 'در حال تأیید...' : 'تأیید کد'}
        </button>

        {devQuickOtp ? (
          <button
            type="button"
            disabled={isLoading}
            onClick={() => void onVerify(devQuickOtp)}
            className="w-full rounded-lg border border-amber-400 bg-amber-50 py-2 text-sm font-medium text-amber-900 disabled:opacity-50 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
          >
            تأیید آزمایشی توسعه ({devQuickOtp})
          </button>
        ) : null}
      </form>
    </div>
  );
}
