import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { apiClient } from '@/lib/api'
import { apiV1 } from '@/lib/apiPaths'
import { posthog } from '@/lib/posthog'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card'
import { Button } from '@/ui/button'

interface ListingRow {
  id: string
  title: string
  deal_type: string
  status: string
  price_amount: string
  currency: string
  location_summary: string
  visibility: string
  latitude?: string | null
  longitude?: string | null
}

interface ListingsResponse {
  items: ListingRow[]
  total: number
}

interface SearchListingsResponse {
  items: ListingRow[]
  total: number
  facets?: Record<string, unknown>
}

type TabKey = 'list' | 'search' | 'map'

export default function AdsPage() {
  const [tab, setTab] = useState<TabKey>('list')
  const [q, setQ] = useState('')
  const mapEl = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['listings-v1'],
    queryFn: async () => {
      const res = await apiClient.get<ListingsResponse>(apiV1('listings'), {
        params: { skip: 0, limit: 200 },
      })
      return res.data
    },
  })

  const searchQuery = useQuery({
    queryKey: ['search-listings', q],
    queryFn: async () => {
      const res = await apiClient.get<SearchListingsResponse>(apiV1('search/listings'), {
        params: { q: q || undefined, limit: 50, skip: 0 },
      })
      return res.data
    },
    enabled: tab === 'search',
  })

  const geoFeatures = useMemo(() => {
    const items = data?.items ?? []
    return items.filter((l) => l.latitude != null && l.longitude != null)
  }, [data?.items])

  useEffect(() => {
    if (tab !== 'map' || !mapEl.current) return
    if (geoFeatures.length === 0) {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      return
    }
    const first = geoFeatures[0]
    const lat = Number(first.latitude)
    const lng = Number(first.longitude)
    if (mapRef.current) {
      mapRef.current.remove()
      mapRef.current = null
    }
    const map = new maplibregl.Map({
      container: mapEl.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [lng, lat],
      zoom: 11,
    })
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-left')
    map.on('load', () => {
      const fc = {
        type: 'FeatureCollection' as const,
        features: geoFeatures.map((l) => ({
          type: 'Feature' as const,
          properties: { id: l.id, title: l.title },
          geometry: {
            type: 'Point' as const,
            coordinates: [Number(l.longitude), Number(l.latitude)],
          },
        })),
      }
      map.addSource('listings', {
        type: 'geojson',
        data: fc,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      })
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'listings',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#2563eb',
          'circle-radius': ['step', ['get', 'point_count'], 18, 10, 22, 50, 28],
        },
      })
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'listings',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-size': 12,
        },
        paint: { 'text-color': '#ffffff' },
      })
      map.addLayer({
        id: 'unclustered',
        type: 'circle',
        source: 'listings',
        filter: ['!', ['has', 'point_count']],
        paint: { 'circle-color': '#10b981', 'circle-radius': 8 },
      })
    })
    mapRef.current = map
    return () => {
      map.remove()
      if (mapRef.current === map) mapRef.current = null
    }
  }, [tab, geoFeatures])

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    searchQuery.refetch()
    if (import.meta.env.VITE_PUBLIC_POSTHOG_KEY) {
      posthog.capture('admin_listing_search', { q })
    }
  }

  if (isLoading) {
    return <p className="text-sm text-gray-500">در حال بارگذاری آگهی‌ها…</p>
  }
  if (error) {
    return (
      <p className="text-sm text-red-600">
        خطا در دریافت آگهی‌ها. نقش شما باید شامل دسترسی به API باشد (مثلاً listings:read یا *).
      </p>
    )
  }

  const items = data?.items ?? []

  return (
    <div dir="rtl" className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">آگهی‌ها (لیستینگ)</h1>
      <p className="text-sm text-gray-600 dark:text-slate-400">
        داده از <code className="rounded bg-gray-100 px-1 dark:bg-slate-800">GET /api/v1/listings</code> — مجموع{' '}
        {data?.total ?? 0}
      </p>
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['list', 'لیست'],
            ['search', 'جستجو'],
            ['map', 'نقشه'],
          ] as const
        ).map(([k, label]) => (
          <Button
            key={k}
            type="button"
            variant={tab === k ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setTab(k)}
          >
            {label}
          </Button>
        ))}
      </div>

      {tab === 'list' ? (
        items.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-gray-500">آگهی‌ای ثبت نشده است.</CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((l) => (
              <Card key={l.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{l.title || '(بدون عنوان)'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-gray-600 dark:text-slate-400">
                  <p>
                    <span className="font-medium text-gray-800 dark:text-slate-200">نوع:</span> {l.deal_type} —{' '}
                    <span className="font-medium text-gray-800 dark:text-slate-200">وضعیت:</span> {l.status}
                  </p>
                  <p>
                    <span className="font-medium text-gray-800 dark:text-slate-200">قیمت:</span> {l.price_amount}{' '}
                    {l.currency}
                  </p>
                  <p className="line-clamp-2">{l.location_summary}</p>
                  <p className="text-xs text-gray-400">نمایش: {l.visibility}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : null}

      {tab === 'search' ? (
        <div className="space-y-3">
          <form onSubmit={onSearchSubmit} className="flex flex-wrap gap-2">
            <input
              className="min-w-[12rem] flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
              placeholder="عبارت جستجو…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Button type="submit" size="sm">
              جستجو
            </Button>
          </form>
          {searchQuery.isLoading ? (
            <p className="text-sm text-gray-500">در حال جستجو…</p>
          ) : searchQuery.error ? (
            <p className="text-sm text-red-600">خطا در جستجو — برای `/search/listings` معمولاً `listings:read` لازم است.</p>
          ) : (
            <p className="text-sm text-gray-600 dark:text-slate-400">
              یافته‌شده: {searchQuery.data?.total ?? 0}
            </p>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {(searchQuery.data?.items ?? []).map((l) => (
              <Card key={l.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{l.title || l.id}</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-gray-600 dark:text-slate-400">
                  {l.location_summary}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      {tab === 'map' ? (
        <div className="space-y-2">
          {geoFeatures.length === 0 ? (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              هیچ آگهی با مختصات جغرافیایی نیست. هنگام ایجاد/ویرایش آگهی، latitude و longitude را وارد کنید.
            </p>
          ) : (
            <>
              <p className="text-xs text-gray-500">
                نقشهٔ OSM (MapLibre) با خوشه‌بندی برای {geoFeatures.length} آگهی
              </p>
              <div ref={mapEl} className="h-[420px] w-full overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700" />
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
