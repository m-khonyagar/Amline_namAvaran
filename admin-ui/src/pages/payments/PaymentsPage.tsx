import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { apiClient } from '@/lib/api'
import { apiV1 } from '@/lib/apiPaths'
import { Button } from '@/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card'
import { Input } from '@/ui/input'

type IntentStatus = 'PENDING' | 'COMPLETED' | 'FAILED'

interface PaymentIntentDetail {
  id: string
  user_id: string
  amount_cents: number
  currency: string
  idempotency_key: string
  status: IntentStatus
  psp_reference?: string | null
  psp_provider?: string | null
  psp_checkout_token?: string | null
  last_verify_error?: string | null
  verify_attempt_count: number
  callback_payload?: string | null
  created_at?: string | null
  updated_at?: string | null
}

interface ListResponse {
  total: number
  items: PaymentIntentDetail[]
}

export default function PaymentsPage() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [userFilter, setUserFilter] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['payment-intents', statusFilter, userFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (userFilter.trim()) params.set('user_id', userFilter.trim())
      const res = await apiClient.get<ListResponse>(`${apiV1('payments/intents')}?${params.toString()}`)
      return res.data
    },
  })

  const detailQuery = useQuery({
    queryKey: ['payment-intent', selectedId],
    queryFn: async () => {
      const res = await apiClient.get<PaymentIntentDetail>(apiV1(`payments/intents/${selectedId}`))
      return res.data
    },
    enabled: Boolean(selectedId),
  })

  const retryMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post<PaymentIntentDetail>(apiV1(`payments/intents/${id}/verify-retry`))
      return res.data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['payment-intents'] })
      void qc.invalidateQueries({ queryKey: ['payment-intent', selectedId] })
    },
  })

  const items = data?.items ?? []
  const detail = detailQuery.data

  return (
    <div dir="rtl" className="mx-auto max-w-5xl space-y-6 p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">لاگ پرداخت (PSP)</h1>
        <Link to="/wallets" className="text-sm font-medium text-primary hover:underline">
          ← کیف پول
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">فیلتر</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <label className="flex flex-col text-sm">
            وضعیت
            <select
              className="mt-1 rounded-md border border-gray-300 bg-white px-2 py-2 dark:border-slate-600 dark:bg-slate-900"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">همه</option>
              <option value="PENDING">PENDING</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="FAILED">FAILED</option>
            </select>
          </label>
          <label className="flex min-w-[12rem] flex-col text-sm">
            شناسه کاربر
            <Input
              className="mt-1"
              dir="ltr"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              placeholder="اختیاری"
            />
          </label>
          <div className="flex items-end">
            <Button type="button" variant="outline" onClick={() => void refetch()}>
              به‌روزرسانی
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && <p className="text-sm text-gray-500">در حال بارگذاری…</p>}
      {error && (
        <p className="text-sm text-red-600">
          خطا در دریافت لیست. مجوز <code className="rounded bg-gray-100 px-1">wallets:read</code> لازم است.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">تراکنش‌ها ({data?.total ?? 0})</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[28rem] space-y-2 overflow-y-auto text-sm">
            {items.length === 0 && !isLoading ? (
              <p className="text-gray-500">رکوردی نیست.</p>
            ) : null}
            {items.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setSelectedId(row.id)}
                className={`w-full rounded-lg border p-3 text-right transition hover:bg-gray-50 dark:hover:bg-slate-800 ${
                  selectedId === row.id ? 'border-primary ring-1 ring-primary' : 'border-gray-200 dark:border-slate-600'
                }`}
              >
                <div className="flex justify-between gap-2">
                  <span className="font-mono text-xs" dir="ltr">
                    {row.id.slice(0, 8)}…
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-semibold ${
                      row.status === 'COMPLETED'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                        : row.status === 'FAILED'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
                          : 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100'
                    }`}
                  >
                    {row.status}
                  </span>
                </div>
                <p className="mt-1 text-gray-600 dark:text-slate-400">
                  {row.amount_cents.toLocaleString('fa-IR')} {row.currency} — {row.psp_provider ?? '—'}
                </p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">جزئیات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {!selectedId && <p className="text-gray-500">یک ردیف انتخاب کنید.</p>}
            {selectedId && detailQuery.isLoading && <p className="text-gray-500">بارگذاری…</p>}
            {detail && (
              <>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-gray-500">intent</dt>
                    <dd className="font-mono text-xs break-all" dir="ltr">
                      {detail.id}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">کاربر</dt>
                    <dd dir="ltr">{detail.user_id}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">مبلغ</dt>
                    <dd>
                      {detail.amount_cents.toLocaleString('fa-IR')} {detail.currency}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">درگاه</dt>
                    <dd>{detail.psp_provider ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">مرجع PSP</dt>
                    <dd dir="ltr" className="break-all">
                      {detail.psp_reference ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">توکن جلسه</dt>
                    <dd className="break-all font-mono text-xs" dir="ltr">
                      {detail.psp_checkout_token ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">تلاش تأیید</dt>
                    <dd>{detail.verify_attempt_count}</dd>
                  </div>
                  {detail.last_verify_error ? (
                    <div>
                      <dt className="text-gray-500">آخرین خطا</dt>
                      <dd className="text-red-600">{detail.last_verify_error}</dd>
                    </div>
                  ) : null}
                  {detail.callback_payload ? (
                    <div>
                      <dt className="text-gray-500">callback (خلاصه)</dt>
                      <dd className="max-h-24 overflow-auto break-all font-mono text-xs opacity-80" dir="ltr">
                        {detail.callback_payload.slice(0, 500)}
                        {detail.callback_payload.length > 500 ? '…' : ''}
                      </dd>
                    </div>
                  ) : null}
                </dl>
                {detail.status === 'PENDING' && detail.psp_checkout_token && detail.psp_provider !== 'mock' ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={retryMut.isPending}
                    onClick={() => retryMut.mutate(detail.id)}
                  >
                    تلاش مجدد تأیید درگاه
                  </Button>
                ) : null}
                {retryMut.isError && (
                  <p className="text-xs text-red-600">خطا در تلاش مجدد — فقط برای PENDING با نشست فعال.</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
