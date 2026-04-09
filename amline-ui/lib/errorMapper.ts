import {
  ensureMappedError as coreEnsure,
  isMappedApiError,
  mapAxiosLikeError,
  type MappedApiError,
} from '@amline/ui-core'

export type { MappedApiError }
export { isMappedApiError, mapAxiosLikeError }

/** amline-ui fetch errors may carry fieldErrors on Error instance */
export type ClientUiError = {
  message: string
  detailLines: string[]
  hint: string | null
  code?: string
  requestId?: string
}

function linesFromFieldErrors(fe?: Record<string, string[]>): string[] {
  if (!fe) return []
  return Object.entries(fe).flatMap(([k, msgs]) => msgs.map((msg) => `${k}: ${msg}`))
}

export function ensureMappedError(e: unknown): ClientUiError {
  if (e instanceof Error) {
    const x = e as Error & {
      fieldErrors?: Record<string, string[]>
      code?: string
      requestId?: string
    }
    if (x.fieldErrors || x.code || x.requestId) {
      return {
        message: x.message,
        detailLines: linesFromFieldErrors(x.fieldErrors),
        hint: null,
        code: x.code,
        requestId: x.requestId,
      }
    }
  }
  if (isMappedApiError(e)) {
    const m = e as MappedApiError
    return {
      message: m.message,
      detailLines: linesFromFieldErrors(m.fieldErrors),
      hint: null,
      code: m.code,
      requestId: m.requestId,
    }
  }
  const m = coreEnsure(e)
  return {
    message: m.message,
    detailLines: linesFromFieldErrors(m.fieldErrors),
    hint: null,
    code: m.code,
    requestId: m.requestId,
  }
}
