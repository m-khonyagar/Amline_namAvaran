/** API نیازمندی و بازار — هم‌شکل dev-mock-api و backend (Hamgit-style). */

import { fetchJson } from './fetchJson'

export type NeedKindApi = 'buy' | 'rent' | 'barter'

export interface MarketFeedItem {
  id: string
  kind: NeedKindApi
  title: string
  city: string
  neighborhood: string
  price_label: string
  excerpt: string
}

export interface MarketFeedResponse {
  items: MarketFeedItem[]
}

export interface RequirementCreated {
  id: string
  kind: NeedKindApi
  status: string
  queue_message: string
  publish_title: string
}

export interface RequirementDetail extends RequirementCreated {
  city_label?: string
  neighborhood_label?: string
  description?: string | null
  payload?: Record<string, unknown>
}

export async function fetchMarketFeed(params: {
  kind?: NeedKindApi
  city?: string
  q?: string
}): Promise<MarketFeedResponse> {
  const sp = new URLSearchParams()
  if (params.kind) sp.set('kind', params.kind)
  if (params.city) sp.set('city', params.city)
  if (params.q) sp.set('q', params.q)
  const q = sp.toString()
  return fetchJson<MarketFeedResponse>(`/market/feed${q ? `?${q}` : ''}`)
}

export async function createRequirement(body: Record<string, unknown>): Promise<RequirementCreated> {
  return fetchJson<RequirementCreated>('/requirements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function getRequirement(id: string): Promise<RequirementDetail> {
  return fetchJson<RequirementDetail>(`/requirements/${encodeURIComponent(id)}`)
}
