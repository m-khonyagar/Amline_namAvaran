import { useEffect, useState } from 'react';

/**
 * تایمر OTP با شمارش معکوس.
 * Property 11: secondsLeft از 120 شروع می‌کند، هر ثانیه کاهش می‌یابد،
 * پس از رسیدن به 0 isExpired=true می‌شود.
 */
export function useOtpTimer(initialSeconds = 120) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) {
      setIsExpired(true);
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  function reset() {
    setSecondsLeft(initialSeconds);
    setIsExpired(false);
  }

  return { secondsLeft, isExpired, reset };
}
