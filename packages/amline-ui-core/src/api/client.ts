/**
 * Thin wrappers around fetchJson for apps that share the same ErrorResponse contract.
 * Base URL is intentionally empty: use host app proxy (Vite / Next rewrites) or set absolute URLs at call sites.
 */
import { fetchJson, type FetchJsonInit } from './fetchJson'

/** Same-origin / proxied API base (extend later with env if a package consumer needs absolutes). */
export function getApiBaseUrl(): string {
  return ''
}

export async function apiJson<T>(path: string, init?: FetchJsonInit): Promise<T> {
  const base = getApiBaseUrl()
  const url = path.startsWith('http') ? path : `${base}${path}`
  return fetchJson<T>(url, init)
}

/** Alias — identical to apiJson. */
export const apiFetch = apiJson
