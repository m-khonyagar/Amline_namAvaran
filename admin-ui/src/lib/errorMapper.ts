/**
 * Typed API error mapper.
 *
 * Re-exported by packages/amline-ui-core/src/errors/index.ts — keep the
 * exported names and shapes stable.
 */

export type ApiErrorKind =
  | 'validation'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'server'
  | 'network'
  | 'unknown';

export interface MappedApiError {
  kind: ApiErrorKind;
  /** Alias for kind — kept for backwards-compat with older call sites. */
  type?: ApiErrorKind;
  message: string;
  status?: number;
  fieldErrors?: Record<string, string[]>;
  /** Human-readable lines of validation detail for display. */
  detailLines?: string[];
  /** Optional contextual hint for the user. */
  hint?: string;
}

/** Return true when the value is a {@link MappedApiError}. */
export function isMappedApiError(e: unknown): e is MappedApiError {
  return (
    typeof e === 'object' &&
    e !== null &&
    'kind' in e &&
    'message' in e &&
    typeof (e as MappedApiError).message === 'string'
  );
}

/** Always returns a {@link MappedApiError} — wraps unknown errors. */
export function ensureMappedError(e: unknown): MappedApiError {
  if (isMappedApiError(e)) return e;
  if (e instanceof Error) {
    return { kind: 'unknown', message: e.message };
  }
  return { kind: 'unknown', message: String(e) };
}

/**
 * Parse FastAPI 422 validation detail array into field-level errors.
 * Returns { fieldErrors, message }.
 */
export function parseFastApiValidationDetail(data: unknown): {
  fieldErrors: Record<string, string[]>;
  message: string;
} {
  const fieldErrors: Record<string, string[]> = {};
  const messages: string[] = [];

  if (
    data !== null &&
    typeof data === 'object' &&
    'detail' in data &&
    Array.isArray((data as { detail: unknown }).detail)
  ) {
    for (const item of (data as { detail: { loc?: unknown[]; msg?: string }[] }).detail) {
      const field = Array.isArray(item.loc) ? String(item.loc[item.loc.length - 1]) : 'general';
      const msg = item.msg ?? 'خطای اعتبارسنجی';
      if (!fieldErrors[field]) fieldErrors[field] = [];
      fieldErrors[field].push(msg);
      messages.push(`${field}: ${msg}`);
    }
  }

  return {
    fieldErrors,
    message: messages.length > 0 ? messages.join('; ') : 'خطای اعتبارسنجی',
  };
}

interface AxiosLikeError {
  response?: {
    status?: number;
    data?: unknown;
  };
  message?: string;
}

/** Map an Axios-like error object (or unknown) to a {@link MappedApiError}. */
export function mapAxiosLikeError(e: unknown): MappedApiError {
  const err = e as AxiosLikeError;
  const status = err?.response?.status;
  const data = err?.response?.data;

  if (status === 422) {
    const { fieldErrors, message } = parseFastApiValidationDetail(data);
    const detailLines = Object.entries(fieldErrors).flatMap(([, msgs]) => msgs);
    return { kind: 'validation', type: 'validation', message, status, fieldErrors, detailLines };
  }
  if (status === 401) {
    return { kind: 'unauthorized', type: 'unauthorized', message: 'احراز هویت لازم است', status };
  }
  if (status === 403) {
    return { kind: 'forbidden', type: 'forbidden', message: 'دسترسی مجاز نیست', status };
  }
  if (status === 404) {
    return { kind: 'not_found', type: 'not_found', message: 'یافت نشد', status };
  }
  if (status === 409) {
    return { kind: 'conflict', type: 'conflict', message: 'تداخل داده', status };
  }
  if (status !== undefined && status >= 500) {
    return { kind: 'server', type: 'server', message: 'خطای سرور. لطفاً دوباره تلاش کنید.', status };
  }
  if (!status && err?.message?.toLowerCase().includes('network')) {
    return { kind: 'network', type: 'network', message: 'خطای شبکه. اتصال اینترنت را بررسی کنید.' };
  }

  const detailMsg =
    typeof data === 'object' && data !== null && 'detail' in data
      ? String((data as { detail: unknown }).detail)
      : err?.message ?? 'خطای ناشناخته';

  return { kind: 'unknown', type: 'unknown', message: detailMsg, status };
}
