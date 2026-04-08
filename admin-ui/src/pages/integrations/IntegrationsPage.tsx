import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { apiV1 } from '@/lib/apiPaths'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card'

type HealthSummary = Record<string, Record<string, unknown>>

export default function IntegrationsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['integrations-health'],
    queryFn: async () => {
      const res = await apiClient.get<HealthSummary>(apiV1('integrations/health/summary'))
      return res.data
    },
  })

  if (isLoading) {
    return <p className="text-sm text-gray-500">در حال بارگذاری وضعیت یکپارچه‌سازی‌ها…</p>
  }
  if (error) {
    return (
      <p className="text-sm text-red-600">
        خطا در دریافت وضعیت. نقش شما باید به API دسترسی داشته باشد.
      </p>
    )
  }

  return (
    <div dir="rtl" className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">یکپارچه‌سازی‌ها</h1>
      <p className="text-sm text-gray-600 dark:text-slate-400">
        خلاصهٔ سلامت سرویس‌های بیرونی از{' '}
        <code className="rounded bg-gray-100 px-1 dark:bg-slate-800">GET /api/v1/integrations/health/summary</code>
      </p>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">پیکربندی</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-[32rem] overflow-auto rounded-lg bg-slate-950 p-4 text-left text-xs text-slate-100">
            {JSON.stringify(data, null, 2)}
          </pre>
        </CardContent>
      </Card>
      <p className="text-xs text-gray-500 dark:text-slate-500">
        جزئیات env و Docker: <code className="rounded bg-gray-100 px-1 dark:bg-slate-800">docs/INTEGRATIONS.md</code>
      </p>
    </div>
  )
}
