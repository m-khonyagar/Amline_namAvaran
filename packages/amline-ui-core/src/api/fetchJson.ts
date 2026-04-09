import { parseAmlineErrorBody, parseFastApiValidationDetail } from './errorMapper'
import { generateRequestId } from './requestId'

export type FetchJsonInit = RequestInit & { signal?: AbortSignal }

/**
 * Browser fetch helper for Next.js (same-origin rewrites to backend).
 * Parses unified ErrorResponse and legacy FastAPI 422.
 */
export async function fetchJson<T>(input: string, init?: FetchJsonInit): Promise<T> {
  const headers = new Headers(init?.headers)
  if (!headers.has('X-Request-Id')) {
    headers.set('X-Request-Id', generateRequestId())
  }
  const res = await fetch(input, { ...init, headers })
  const ct = res.headers.get('content-type') || ''
  const isJson = ct.includes('application/json')
  const data = isJson ? await res.json().catch(() => null) : await res.text()

  if (!res.ok) {
    const parsed = parseAmlineErrorBody(data)
    if (parsed) {
      const err = new Error(parsed.message) as Error & {
        status: number
        code?: string
        requestId?: string
        fieldErrors?: Record<string, string[]>
      }
      err.status = res.status
      err.code = parsed.code
      err.requestId = parsed.requestId
      err.fieldErrors = parsed.fieldErrors
      throw err
    }
    if (data && typeof data === 'object' && data !== null && 'detail' in data) {
      const v = parseFastApiValidationDetail((data as { detail: unknown }).detail)
      const err = new Error(v.message) as Error & { status: number; fieldErrors: Record<string, string[]> }
      err.status = res.status
      err.fieldErrors = v.fieldErrors
      throw err
    }
    throw new Error(typeof data === 'string' && data ? data : `HTTP ${res.status}`)
  }

  return data as T
}
