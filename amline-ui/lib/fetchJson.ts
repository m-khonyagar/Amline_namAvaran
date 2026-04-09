import { fetchJson as coreFetchJson } from '@amline/ui-core'

function accessTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null
  const row = document.cookie.split('; ').find((r) => r.startsWith('access_token='))
  if (!row) return null
  const v = row.split('=').slice(1).join('=')
  try {
    return decodeURIComponent(v)
  } catch {
    return v
  }
}

export async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  const tok = accessTokenFromCookie()
  if (tok && !headers.has('Authorization')) {
    headers.set('Authorization', tok.startsWith('Bearer ') ? tok : `Bearer ${tok}`)
  }
  return coreFetchJson<T>(input, { ...init, headers, signal: init?.signal ?? undefined })
}
