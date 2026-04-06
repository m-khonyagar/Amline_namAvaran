import { http, HttpResponse } from 'msw'

/** هم‌شکل با dev-mock-api/mock_extended.py — Hamgit-aligned stubs برای MSW */
export function hamgitPortHandlers() {
  const emptyList = () => HttpResponse.json({ items: [], total: 0 })

  return [
    http.get('*/admin/settlements/users', () => emptyList()),

    http.patch('*/admin/settlements', () => HttpResponse.json({ ok: true })),

    http.get('*/admin/custom-invoices/users', () => emptyList()),

    http.post('*/admin/custom_payment_link', () =>
      HttpResponse.json({ ok: true, link: 'https://example.com/pay/mock' })
    ),

    http.get('*/admin/ads/properties', () => emptyList()),

    http.get('*/admin/ads/visit-requests', () => emptyList()),

    http.get('*/admin/ads/wanted/properties', () => emptyList()),

    http.get('*/admin/ads/swaps', () => emptyList()),

    http.get('*/admin/contracts/base-clauses', () => emptyList()),

    http.get('*/financials/promos', () => emptyList()),

    http.post('*/financials/promos/generate', () =>
      HttpResponse.json({ ok: true, code: 'MOCK-PROMO', discount_type: 'PERCENTAGE' })
    ),

    http.post('*/financials/promos/bulk-generate', () =>
      HttpResponse.json({ ok: true, count: 0 })
    ),
  ]
}
