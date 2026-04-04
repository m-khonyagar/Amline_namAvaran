import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { apiV1 } from '@/lib/apiPaths'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card'

type Plan = {
  id: string
  code: string
  name_fa: string
  price_cents: number
  cycle: string
}

type Subscription = {
  id: string
  user_id: string
  plan_id: string
  status: string
  current_period_end?: string | null
}

type Invoice = {
  subscription_id: string
  status: string
  lines: { description: string; amount_cents: number }[]
  total_cents: number
  period_end?: string | null
}

export default function BillingPage() {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()

  const plansQ = useQuery({
    queryKey: ['billing-plans'],
    queryFn: async () => {
      const res = await apiClient.get<Plan[]>(apiV1('billing/plans'))
      return res.data
    },
    enabled: hasPermission('listings:read'),
  })

  const subQ = useQuery({
    queryKey: ['billing-me'],
    queryFn: async () => {
      const res = await apiClient.get<Subscription | null>(apiV1('billing/me'))
      return res.data
    },
    enabled: hasPermission('wallets:read'),
  })

  const invQ = useQuery({
    queryKey: ['billing-invoice'],
    queryFn: async () => {
      const res = await apiClient.get<Invoice | null>(apiV1('billing/invoice/latest'))
      return res.data
    },
    enabled: hasPermission('wallets:read') && Boolean(subQ.data),
  })

  const subscribe = useMutation({
    mutationFn: async (planCode: string) => {
      await apiClient.post(apiV1('billing/subscribe'), { plan_code: planCode })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['billing-me'] })
      void qc.invalidateQueries({ queryKey: ['billing-invoice'] })
    },
  })

  if (!hasPermission('wallets:read')) {
    return (
      <div dir="rtl" className="p-6 text-sm text-[var(--amline-fg-muted)]">
        برای مشاهدهٔ اشتراک و فاکتور، مجوز <code className="rounded bg-[var(--amline-surface-muted)] px-1">wallets:read</code> لازم است.
      </div>
    )
  }

  return (
    <div dir="rtl" className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-bold text-[var(--amline-fg)]">صورتحساب و اشتراک</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">اشتراک فعلی</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-[var(--amline-fg-muted)]">
          {subQ.isLoading && <p>در حال بارگذاری…</p>}
          {subQ.error && <p className="text-red-600">خطا در دریافت اشتراک.</p>}
          {subQ.data === null && !subQ.isLoading && <p>اشتراک فعالی ثبت نشده است.</p>}
          {subQ.data ? (
            <div className="space-y-1 text-[var(--amline-fg)]">
              <p>شناسه اشتراک: {subQ.data.id}</p>
              <p>وضعیت: {subQ.data.status}</p>
              {subQ.data.current_period_end ? (
                <p>پایان دوره: {subQ.data.current_period_end}</p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">فاکتور آخر</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {!subQ.data ? (
            <p className="text-[var(--amline-fg-muted)]">ابتدا یک پلن انتخاب کنید.</p>
          ) : invQ.isLoading ? (
            <p className="text-[var(--amline-fg-muted)]">در حال بارگذاری…</p>
          ) : invQ.data && invQ.data.lines.length ? (
            <ul className="space-y-2">
              {invQ.data.lines.map((line, i) => (
                <li key={i} className="flex justify-between border-b border-[var(--amline-border)] py-2">
                  <span>{line.description}</span>
                  <span dir="ltr">{line.amount_cents.toLocaleString('fa-IR')} ریال</span>
                </li>
              ))}
              <li className="flex justify-between pt-2 font-semibold">
                <span>جمع</span>
                <span dir="ltr">{invQ.data.total_cents.toLocaleString('fa-IR')} ریال</span>
              </li>
            </ul>
          ) : (
            <p className="text-[var(--amline-fg-muted)]">فاکتوری برای نمایش نیست.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">پلن‌ها</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {plansQ.isLoading && <p className="text-sm text-[var(--amline-fg-muted)]">در حال بارگذاری پلن‌ها…</p>}
          {plansQ.error && <p className="text-sm text-red-600">خطا در دریافت پلن‌ها (نیاز به listings:read).</p>}
          {(plansQ.data ?? []).map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--amline-border)] p-3"
            >
              <div>
                <p className="font-medium text-[var(--amline-fg)]">{p.name_fa}</p>
                <p className="text-xs text-[var(--amline-fg-muted)]">
                  {p.code} — {p.price_cents.toLocaleString('fa-IR')} ریال / {p.cycle}
                </p>
              </div>
              {hasPermission('wallets:write') ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={subscribe.isPending}
                  onClick={() => subscribe.mutate(p.code)}
                >
                  انتخاب پلن
                </Button>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
