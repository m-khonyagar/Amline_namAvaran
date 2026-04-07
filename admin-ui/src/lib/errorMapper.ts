/**
 * نگاشت خطاهای API به پیام‌های فارسی دقیق و قابل اقدام.
 * سازگار با FastAPI (422 detail به صورت آرایه یا آبجکت).
 */

export type ApiErrorKind =
  | 'VALIDATION'
  | 'FEATURE_UNAVAILABLE'
  | 'SERVER'
  | 'NETWORK'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'UNKNOWN';

export interface MappedApiError {
  type: ApiErrorKind;
  /** پیام اصلی برای بنر یا toast */
  message: string;
  /** خطوط جزئی‌تر (فیلد به فیلد) */
  detailLines: string[];
  /** برای 422: نام فیلد → لیست پیام‌ها */
  fieldErrors: Record<string, string[]>;
  /** شناسه درخواست اگر از سرور بیاید */
  requestId?: string;
  /** راهنمای اقدام اصلاحی برای کاربر */
  hint?: string;
}

export function isMappedApiError(err: unknown): err is MappedApiError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'type' in err &&
    'message' in err &&
    'detailLines' in err &&
    'fieldErrors' in err
  );
}

const FIELD_LABELS_FA: Record<string, string> = {
  national_code: 'کد ملی',
  mobile: 'شماره موبایل',
  birth_date: 'تاریخ تولد',
  bank_account: 'شماره شبا',
  postal_code: 'کد پستی',
  national_nc: 'شناسه ملی شرکت',
  ceo_mobile: 'موبایل مدیرعامل',
  family_members_count: 'تعداد اعضای خانواده',
  home_electricy_bill: 'شناسه قبض برق',
  natural_person_detail: 'اطلاعات شخص حقیقی',
  legal_person_detail: 'اطلاعات شخص حقوقی',
  contract_type: 'نوع قرارداد',
  party_type: 'نوع طرف قرارداد',
};

function labelForField(path: string): string {
  const key = path.split('.').pop() ?? path;
  return FIELD_LABELS_FA[key] ?? key;
}

/** استخراج پیام از آیتم FastAPI validation error */
function itemMessage(item: { msg?: string; message?: string }): string {
  return (item.msg ?? item.message ?? 'مقدار نامعتبر است').trim();
}

/**
 * تبدیل detail استاندارد FastAPI به fieldErrors و خطوط خوانا.
 */
export function parseFastApiValidationDetail(detail: unknown): {
  fieldErrors: Record<string, string[]>;
  lines: string[];
} {
  const fieldErrors: Record<string, string[]> = {};
  const lines: string[] = [];

  if (detail == null) {
    return { fieldErrors, lines: ['اطلاعات ارسالی با قوانین سرور همخوانی ندارد.'] };
  }

  if (Array.isArray(detail)) {
    for (const item of detail) {
      if (typeof item !== 'object' || item === null) continue;
      const loc = (item as { loc?: unknown }).loc;
      const msg = itemMessage(item as { msg?: string; message?: string });
      let fieldPath = 'general';
      if (Array.isArray(loc) && loc.length > 0) {
        const parts = loc.filter((p) => typeof p === 'string' && p !== 'body');
        fieldPath = parts.length ? parts.join('.') : String(loc[loc.length - 1]);
      }
      if (!fieldErrors[fieldPath]) fieldErrors[fieldPath] = [];
      fieldErrors[fieldPath].push(msg);
      const fa = labelForField(fieldPath);
      lines.push(`${fa}: ${msg}`);
    }
    if (lines.length === 0) {
      lines.push('اطلاعات ارسالی با قوانین سرور همخوانی ندارد.');
    }
    return { fieldErrors, lines };
  }

  if (typeof detail === 'object') {
    const obj = detail as Record<string, unknown>;
    for (const [k, v] of Object.entries(obj)) {
      if (Array.isArray(v)) {
        const msgs = v.map((x) => String(x));
        fieldErrors[k] = msgs;
        const fa = labelForField(k);
        msgs.forEach((m) => lines.push(`${fa}: ${m}`));
      } else if (typeof v === 'string') {
        fieldErrors[k] = [v];
        lines.push(`${labelForField(k)}: ${v}`);
      }
    }
    if (lines.length === 0) {
      lines.push('اطلاعات ارسالی با قوانین سرور همخوانی ندارد.');
    }
    return { fieldErrors, lines };
  }

  return {
    fieldErrors: {},
    lines: [String(detail)],
  };
}

function extractRequestId(data: unknown): string | undefined {
  if (data && typeof data === 'object' && 'request_id' in data) {
    const v = (data as { request_id?: string }).request_id;
    return typeof v === 'string' ? v : undefined;
  }
  return undefined;
}

function buildActionHint(m: MappedApiError): string {
  switch (m.type) {
    case 'VALIDATION':
      if (m.detailLines.some((line) => /contract_type|نوع قرارداد/i.test(line))) {
        return 'نوع قرارداد انتخابی در بک‌اند فعلی پشتیبانی نشده است. با تیم بک‌اند هماهنگ کنید تا BUYING_AND_SELLING فعال شود یا فعلاً از رهن و اجاره استفاده کنید.';
      }
      return m.detailLines.length > 0
        ? 'موارد بالا را دقیقاً در همان فیلدهای فرم اصلاح کنید؛ سپس دوباره ذخیره یا ادامه را بزنید.'
        : 'فرمت فیلدها را مطابق راهنمای کنار هر فیلد بررسی کنید (مثلاً تاریخ شمسی ۱۳۷۰/۰۱/۰۱، شبا IR به‌همراه ۲۴ رقم، کد ملی ۱۰ رقم معتبر).';
    case 'FEATURE_UNAVAILABLE':
      return 'این بخش روی سرور فعلی در دسترس نیست. با تیم فنی برای به‌روزرسانی backend یا آدرس API هماهنگ کنید.';
    case 'SERVER':
      return 'چند ثانیه صبر کنید و دوباره تلاش کنید. اگر خطا ادامه داشت، متن کامل خطا و زمان را برای پشتیبانی ارسال کنید.';
    case 'NETWORK':
      if (import.meta.env.DEV) {
        return 'توسعه لوکال: مطمئن شوید API روی 8080 در حال اجراست (مثلاً dev-mock-api با .\\run.ps1 یا docker compose). سپس VITE_DEV_PROXY_TARGET=http://127.0.0.1:8080 و صفحه را رفرش کنید — ر. docs/LOCAL_DEV.md';
      }
      return 'اتصال اینترنت، VPN و فایروال را بررسی کنید؛ در صورت نیاز صفحه را رفرش کنید و دوباره ارسال کنید.';
    case 'UNAUTHORIZED':
      return 'از حساب خود خارج شده‌اید؛ یک‌بار از پنل خارج و دوباره وارد شوید.';
    case 'FORBIDDEN':
      return 'با مدیر سیستم برای دریافت دسترسی لازم هماهنگ کنید.';
    case 'UNKNOWN':
    default:
      return 'اگر مشکل ادامه داشت، صفحه را رفرش کنید یا با پشتیبانی تماس بگیرید.';
  }
}

function finalizeMapped(m: MappedApiError): MappedApiError {
  if (m.hint && m.hint.length > 0) return m;
  return { ...m, hint: buildActionHint(m) };
}

function serverMessage(status: number, data: unknown): string {
  const reqId = extractRequestId(data);
  const base =
    status >= 500
      ? 'سرور موقتاً پاسخ نمی‌دهد یا خطای داخلی رخ داده است.'
      : 'درخواست با خطا مواجه شد.';
  const hint =
    'لطفاً چند لحظه بعد دوباره تلاش کنید. اگر تکرار شد، با پشتیبانی تماس بگیرید و این زمان را اعلام کنید.';
  const time = new Date().toLocaleString('fa-IR');
  const idPart = reqId ? ` کد پیگیری: ${reqId}` : '';
  return `${base}${idPart}\nزمان: ${time}\n${hint}`;
}

/** از پاسخ axios یا شیء reject شده توسط interceptor */
export function mapAxiosLikeError(err: unknown): MappedApiError {
  if (isMappedApiError(err)) return finalizeMapped(err);

  const e = err as {
    type?: string;
    message?: string;
    fieldErrors?: unknown;
    code?: string;
    response?: { status?: number; data?: unknown };
    isAxiosError?: boolean;
  };

  if (e?.type === 'VALIDATION') {
    const { fieldErrors, lines } = parseFastApiValidationDetail(e.fieldErrors);
    const summary =
      lines.length > 0
        ? `لطفاً موارد زیر را اصلاح کنید:\n${lines.join('\n')}`
        : 'اطلاعات ارسالی نامعتبر است.';
    return finalizeMapped({
      type: 'VALIDATION',
      message: summary,
      detailLines: lines,
      fieldErrors,
    });
  }

  if (e?.type === 'FEATURE_UNAVAILABLE') {
    return finalizeMapped({
      type: 'FEATURE_UNAVAILABLE',
      message:
        e.message ??
        'این قابلیت روی سرور فعلی فعال نیست. با تیم فنی برای استقرار endpoint هماهنگ کنید.',
      detailLines: [],
      fieldErrors: {},
    });
  }

  if (e?.type === 'SERVER') {
    return finalizeMapped({
      type: 'SERVER',
      message: e.message ?? serverMessage(500, undefined),
      detailLines: [],
      fieldErrors: {},
    });
  }

  if (e?.type === 'NETWORK') {
    return finalizeMapped({
      type: 'NETWORK',
      message:
        e.message ??
        'اتصال برقرار نشد. اینترنت، VPN یا فایروال را بررسی کنید و صفحه را تازه‌سازی کنید.',
      detailLines: [],
      fieldErrors: {},
    });
  }

  if (!e?.response) {
    const msg = (e as Error)?.message ?? '';
    // خطای محلی/اعتبارسنجی (مثلاً throw new Error('...') در UI)
    if (
      msg &&
      e?.code !== 'ERR_NETWORK' &&
      e?.code !== 'ECONNABORTED' &&
      !/network error/i.test(msg) &&
      !(e as { isAxiosError?: boolean }).isAxiosError
    ) {
      return finalizeMapped({
        type: 'UNKNOWN',
        message: msg,
        detailLines: [],
        fieldErrors: {},
      });
    }
    if (e?.code === 'ECONNABORTED' || /timeout/i.test(msg)) {
      return finalizeMapped({
        type: 'NETWORK',
        message:
          'زمان پاسخگویی سرور به پایان رسید. اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.',
        detailLines: [],
        fieldErrors: {},
      });
    }
    return finalizeMapped({
      type: 'NETWORK',
      message:
        'اتصال برقرار نشد. اینترنت، VPN، فایروال یا پروکسی را بررسی کنید و صفحه را تازه‌سازی کنید.',
      detailLines: [],
      fieldErrors: {},
    });
  }

  const status = e?.response?.status;
  const data = e?.response?.data;

  if (status === 401) {
    return finalizeMapped({
      type: 'UNAUTHORIZED',
      message: 'نشست شما منقضی شده یا وارد نشده‌اید. لطفاً دوباره وارد شوید.',
      detailLines: [],
      fieldErrors: {},
    });
  }

  if (status === 403) {
    return finalizeMapped({
      type: 'FORBIDDEN',
      message: 'دسترسی به این عملیات برای نقش شما مجاز نیست.',
      detailLines: [],
      fieldErrors: {},
    });
  }

  if (status === 400 && data && typeof data === 'object') {
    const detail = (data as { detail?: unknown }).detail;
    if (detail === 'commission_required') {
      return finalizeMapped({
        type: 'UNKNOWN',
        message: 'ابتدا باید کمیسیون این قرارداد را پرداخت کنید.',
        detailLines: [],
        fieldErrors: {},
        hint: 'پس از پرداخت موفق، دوباره برای امضا اقدام کنید.',
      });
    }
  }

  if (status === 404) {
    return finalizeMapped({
      type: 'FEATURE_UNAVAILABLE',
      message:
        'این آدرس API روی سرور یافت نشد (404). ممکن است نسخه backend با UI هم‌خوان نباشد.',
      detailLines: [],
      fieldErrors: {},
    });
  }

  if (status === 422 && data) {
    const detail = (data as { detail?: unknown }).detail ?? data;
    const { fieldErrors, lines } = parseFastApiValidationDetail(detail);
    const summary =
      lines.length > 0
        ? `لطفاً موارد زیر را اصلاح کنید:\n${lines.join('\n')}`
        : 'اطلاعات ارسالی با قوانین سرور همخوانی ندارد.';
    return finalizeMapped({
      type: 'VALIDATION',
      message: summary,
      detailLines: lines,
      fieldErrors,
    });
  }

  if (status != null && status >= 500) {
    const msg = serverMessage(status, data);
    return finalizeMapped({
      type: 'SERVER',
      message: msg,
      detailLines: [],
      fieldErrors: {},
      requestId: extractRequestId(data),
    });
  }

  if (e?.message) {
    return finalizeMapped({
      type: 'UNKNOWN',
      message: e.message,
      detailLines: [],
      fieldErrors: {},
    });
  }

  return finalizeMapped({
    type: 'UNKNOWN',
    message: 'خطای غیرمنتظره رخ داد. لطفاً دوباره تلاش کنید.',
    detailLines: [],
    fieldErrors: {},
  });
}

export function ensureMappedError(err: unknown): MappedApiError {
  return mapAxiosLikeError(err);
}
