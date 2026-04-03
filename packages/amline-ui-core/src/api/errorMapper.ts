/**
 * Unified ErrorResponse parsing (backend FastAPI + AmlineError).
 * Aligned with backend app/schemas/v1/errors.py
 */
export type ApiErrorKind = 'network' | 'http' | 'validation' | 'amline' | 'unknown'

export interface MappedApiError extends Error {
  kind: ApiErrorKind
  status?: number
  code?: string
  requestId?: string
  fieldErrors?: Record<string, string[]>
  raw?: unknown
  /** Lines for inline / banner UI (derived from field_errors or validation detail). */
  detailLines?: string[]
  hint?: string | null
  /** @deprecated prefer `kind` — kept for older admin-ui call sites */
  type?: ApiErrorKind
}

export interface ErrorResponseShape {
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
    request_id?: string | null
  }
  request_id?: string | null
  field_errors?: Array<{ field: string; code: string; message: string }>
  detail?: unknown
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function fieldErrorsToLines(
  fe: Record<string, string[]> | undefined
): string[] | undefined {
  if (!fe || !Object.keys(fe).length) return undefined
  return Object.entries(fe).flatMap(([k, arr]) => arr.map((msg) => `${k}: ${msg}`))
}

function finishMapped(m: MappedApiError): MappedApiError {
  m.type = m.kind
  m.detailLines = fieldErrorsToLines(m.fieldErrors)
  return m
}

export function parseAmlineErrorBody(data: unknown): {
  message: string
  code?: string
  requestId?: string
  fieldErrors?: Record<string, string[]>
} | null {
  if (!isRecord(data)) return null
  const err = data.error
  if (!isRecord(err) || typeof err.message !== 'string') {
    if (typeof data.detail === 'string') {
      return { message: data.detail }
    }
    return null
  }
  const code = typeof err.code === 'string' ? err.code : undefined
  const requestId =
    (typeof err.request_id === 'string' && err.request_id) ||
    (typeof data.request_id === 'string' && data.request_id) ||
    undefined
  const field_errors = data.field_errors
  const fieldErrors: Record<string, string[]> = {}
  if (Array.isArray(field_errors)) {
    for (const item of field_errors) {
      if (!isRecord(item)) continue
      const f = item.field
      const msg = item.message
      if (typeof f === 'string' && typeof msg === 'string') {
        fieldErrors[f] = fieldErrors[f] ? [...fieldErrors[f], msg] : [msg]
      }
    }
  }
  return { message: err.message, code, requestId, fieldErrors: Object.keys(fieldErrors).length ? fieldErrors : undefined }
}

export function parseFastApiValidationDetail(detail: unknown): {
  message: string
  fieldErrors: Record<string, string[]>
} {
  const fieldErrors: Record<string, string[]> = {}
  let message = 'خطای اعتبارسنجی'
  if (Array.isArray(detail)) {
    for (const row of detail) {
      if (!isRecord(row)) continue
      const loc = row.loc
      const msg = row.msg
      if (Array.isArray(loc) && typeof msg === 'string') {
        const field = String(loc[loc.length - 1] ?? 'form')
        fieldErrors[field] = fieldErrors[field] ? [...fieldErrors[field], msg] : [msg]
      }
    }
    if (detail[0] && isRecord(detail[0]) && typeof detail[0].msg === 'string') {
      message = String(detail[0].msg)
    }
  } else if (typeof detail === 'string') {
    message = detail
  }
  return { message, fieldErrors }
}

type AxiosLike = {
  isAxiosError?: boolean
  message?: string
  response?: { status?: number; data?: unknown }
}

export function mapAxiosLikeError(err: unknown): MappedApiError {
  const ax = err as AxiosLike
  if (ax?.isAxiosError) {
    const status = ax.response?.status
    const data = ax.response?.data
    const parsed = parseAmlineErrorBody(data)
    if (parsed) {
      const m = new Error(parsed.message) as MappedApiError
      m.kind = 'amline'
      m.status = status
      m.code = parsed.code
      m.requestId = parsed.requestId
      m.fieldErrors = parsed.fieldErrors
      m.raw = data
      m.name = 'MappedApiError'
      return finishMapped(m)
    }
    if (data && isRecord(data) && Array.isArray(data.detail)) {
      const v = parseFastApiValidationDetail(data.detail)
      const m = new Error(v.message) as MappedApiError
      m.kind = 'validation'
      m.status = status ?? 422
      m.fieldErrors = v.fieldErrors
      m.raw = data
      m.name = 'MappedApiError'
      return finishMapped(m)
    }
    if (!ax.response) {
      const m = new Error(ax.message || 'خطای شبکه') as MappedApiError
      m.kind = 'network'
      m.name = 'MappedApiError'
      return finishMapped(m)
    }
    const m = new Error(typeof data === 'string' ? data : `HTTP ${status}`) as MappedApiError
    m.kind = 'http'
    m.status = status
    m.raw = data
    m.name = 'MappedApiError'
    return finishMapped(m)
  }
  if (err instanceof Error) {
    const m = err as MappedApiError
    m.kind = m.kind ?? 'unknown'
    return finishMapped(m)
  }
  const m = new Error('خطای ناشناخته') as MappedApiError
  m.kind = 'unknown'
  m.name = 'MappedApiError'
  return finishMapped(m)
}

export function isMappedApiError(e: unknown): e is MappedApiError {
  return e instanceof Error && 'kind' in e && typeof (e as MappedApiError).kind === 'string'
}

export function ensureMappedError(e: unknown): MappedApiError {
  if (isMappedApiError(e)) return e
  return mapAxiosLikeError(e)
}
