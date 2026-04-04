import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { apiV1 } from '@/lib/apiPaths'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card'
import { Input } from '@/ui/input'

interface BalanceResponse {
  user_id: string
  balance_cents: number
  currency: string
}

export default function WalletsPage() {
  const { user } = useAuth()
  const defaultUid = import.meta.env.VITE_DEV_USER_ID || user?.id || 'mock-001'
  const [userId, setUserId] = useState(defaultUid)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['wallet-balance', userId],
    queryFn: async () => {
      const res = await apiClient.get<BalanceResponse>(apiV1(`wallets/${encodeURIComponent(userId)}/balance`))
      return res.data
    },
    enabled: Boolean(userId),
  })

  return (
    <div dir="rtl" className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">کیف پول</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">موجودی (ledger)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
            شناسه کاربر
            <Input
              className="mt-1"
              dir="ltr"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="mock-001"
            />
          </label>
          <Button type="button" variant="outline" onClick={() => void refetch()}>
            به‌روزرسانی
          </Button>
          {isLoading && <p className="text-sm text-gray-500">در حال بارگذاری…</p>}
          {error && (
            <p className="text-sm text-red-600">
              خطا در دریافت موجودی. مجوز <code className="rounded bg-gray-100 px-1">wallets:read</code> یا * لازم است.
            </p>
          )}
          {data && !error && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-slate-600 dark:bg-slate-800">
              <p className="text-sm text-gray-600 dark:text-slate-400">کاربر: {data.user_id}</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-slate-100">
                {data.balance_cents.toLocaleString('fa-IR')}{' '}
                <span className="text-base font-normal text-gray-600 dark:text-slate-400">{data.currency}</span>
              </p>
              <p className="mt-1 text-xs text-gray-500">منبع: GET /api/v1/wallets/&#123;user_id&#125;/balance</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
