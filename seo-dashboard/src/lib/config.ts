/** پیشوند مسیر برای fetch سمت کلاینت (زیرمسیر reverse proxy) */
export const BASE_PATH =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_BASE_PATH) || ''
