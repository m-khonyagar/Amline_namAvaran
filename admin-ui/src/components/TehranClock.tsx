import { useEffect, useState } from 'react';
import { formatShamsiDateTime } from '../lib/persianDateTime';

/** ساعت و تاریخ زنده به‌وقت تهران + تقویم شمسی */
export function TehranClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  return (
    <time
      dateTime={now.toISOString()}
      className="whitespace-nowrap text-[11px] leading-tight text-[var(--amline-fg-muted)]"
      title="زمان به‌وقت تهران (ایران)"
    >
      {formatShamsiDateTime(now)}
    </time>
  );
}
