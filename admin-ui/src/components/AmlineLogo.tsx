import { cn } from '../lib/cn';

const LOGO_PNG = '/brand/amline-logo.png';

export type AmlineLogoProps = {
  /** ارتفاع لوگو به پیکسل (عرض خودکار حفظ نسبت) */
  height?: number;
  className?: string;
  alt?: string;
};

/**
 * لوگوی رسمی املاین (PNG) — برای هدر، سایدبار و صفحهٔ ورود.
 */
export function AmlineLogo({
  height = 40,
  className,
  alt = 'اَم‌لاین — AmLine',
}: AmlineLogoProps) {
  return (
    <img
      src={LOGO_PNG}
      alt={alt}
      className={cn('w-auto max-w-[min(100%,15rem)] shrink-0 object-contain object-center', className)}
      style={{ height, maxHeight: height }}
      decoding="async"
    />
  );
}

/** نسخهٔ مربعی‌شده برای جای باریک (برش از همان PNG) */
export function AmlineLogoMark({ className, size = 40 }: { className?: string; size?: number }) {
  return (
    <img
      src={LOGO_PNG}
      alt=""
      className={cn('shrink-0 object-cover object-right', className)}
      style={{ width: size, height: size }}
      decoding="async"
      aria-hidden
    />
  );
}
