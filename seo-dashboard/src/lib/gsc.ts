/**
 * تایپ و کلاینت دادهٔ GSC — هم‌خوان با خروجی API و فایل JSON نمونه.
 */

import { BASE_PATH } from './config'

export interface GSCData {
  meta?: {
    siteUrl?: string
    startDate?: string
    endDate?: string
    exportedAt?: string
  }
  searchAnalytics?: {
    by_date?: Array<{
      date?: string
      clicks?: number
      impressions?: number
      ctr?: number
      position?: number
    }>
    by_query?: Array<{ query?: string; clicks?: number }>
    by_page?: Array<{ page?: string; clicks?: number }>
    by_device?: Array<{ device?: string; clicks?: number }>
    by_country?: Array<{ country?: string; clicks?: number }>
  }
  sites?: unknown[]
  sitemaps?: unknown[]
}

export async function fetchGSC(): Promise<GSCData> {
  const res = await fetch(`${BASE_PATH}/api/gsc`, { cache: 'no-store' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error || `GSC ${res.status}`)
  }
  return res.json() as Promise<GSCData>
}

/** خلاصهٔ متنی برای زمینهٔ چت AI */
export function summarizeForAI(data: GSCData): string {
  const m = data.meta
  const sa = data.searchAnalytics || {}
  const byDate = sa.by_date || []
  const clicks = byDate.reduce((s, r) => s + (r.clicks || 0), 0)
  const imps = byDate.reduce((s, r) => s + (r.impressions || 0), 0)
  const topQ = (sa.by_query || [])
    .slice(0, 5)
    .map((r) => r.query || '')
    .filter(Boolean)
    .join(', ')
  return [
    `بازه: ${m?.startDate || '?'} تا ${m?.endDate || '?'}`,
    `جمع کلیک: ${clicks}، جمع نمایش: ${imps}`,
    topQ ? `نمونهٔ کوئری‌ها: ${topQ}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}
