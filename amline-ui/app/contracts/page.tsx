'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { hasAccessToken } from '../../lib/auth'
import { ensureMappedError } from '../../lib/errorMapper'
import { fetchJson } from '../../lib/fetchJson'

interface ContractRow {
  id: string
  type: string
  status: string
  created_at: string
}

const TYPE_LABEL: Record<string, string> = {
  PROPERTY_RENT: 'رهن و اجاره',
  BUYING_AND_SELLING: 'خرید و فروش',
}

export default function ContractsListPage() {
  const router = useRouter()
  const [items, setItems] = useState<ContractRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorDetails, setErrorDetails] = useState<string[]>([])
  const [errorHint, setErrorHint] = useState<string | null>(null)

  useEffect(() => {
    if (!hasAccessToken()) {
      router.replace('/login')
      return
    }
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        setErrorDetails([])
        setErrorHint(null)
        const data = await fetchJson<ContractRow[]>('/contracts/list', {
          headers: { 'Content-Type': 'application/json' },
        })
        if (mounted) setItems(Array.isArray(data) ? data : [])
      } catch (e) {
        if (mounted) {
          const m = ensureMappedError(e)
          setError(m.message)
          setErrorDetails(m.detailLines)
          setErrorHint(m.hint ?? null)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [router])

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="amline-display text-[var(--amline-fg)]">قراردادهای من</h1>
        <div className="flex items-center gap-4">
          <Link
            href="/contracts/wizard"
            className="text-sm font-medium text-blue-700 hover:underline dark:text-blue-400"
          >
            انعقاد قرارداد جدید
          </Link>
          <Link href="/" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
            خانه
          </Link>
        </div>
      </div>

      {loading && (
        <div className="rounded-lg bg-white p-4 text-sm text-gray-500 dark:bg-slate-900 dark:text-slate-400">
          در حال بارگذاری…
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="space-y-3 rounded-amline border border-red-200 bg-red-50 p-4 text-sm text-red-900 shadow-amline dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-50"
        >
          <div>
            <p className="text-xs font-semibold text-red-800 dark:text-red-200">علت خطا</p>
            <p className="mt-1 whitespace-pre-wrap font-medium leading-relaxed">{error}</p>
          </div>
          {errorDetails.length > 0 && (
            <div className="rounded-amline-md border border-red-200/80 bg-white/70 p-3 dark:border-red-900/40 dark:bg-red-950/30">
              <p className="mb-2 text-xs font-semibold">جزئیات</p>
              <ul className="list-disc space-y-1 pr-5 text-xs leading-relaxed">
                {errorDetails.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          )}
          {errorHint ? (
            <div className="border-t border-red-200/80 pt-3 dark:border-red-900/40">
              <p className="text-xs font-semibold">اقدام پیشنهادی</p>
              <p className="mt-1 text-xs leading-relaxed opacity-95">{errorHint}</p>
            </div>
          ) : null}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          هنوز قراردادی برای این حساب ثبت نشده است.
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <table className="min-w-full text-right text-sm text-gray-900 dark:text-slate-100">
            <thead className="bg-gray-50 text-gray-600 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3">شناسه</th>
                <th className="px-4 py-3">نوع</th>
                <th className="px-4 py-3">وضعیت</th>
                <th className="px-4 py-3">تاریخ</th>
                <th className="px-4 py-3">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-t border-gray-100 dark:border-slate-700">
                  <td className="px-4 py-3 font-mono text-xs">{c.id}</td>
                  <td className="px-4 py-3">{TYPE_LABEL[c.type] ?? c.type}</td>
                  <td className="px-4 py-3">{c.status}</td>
                  <td className="px-4 py-3">{new Date(c.created_at).toLocaleDateString('fa-IR')}</td>
                  <td className="px-4 py-3">
                    <Link href={`/contracts/${c.id}`} className="text-blue-600 hover:underline dark:text-blue-400">
                      مشاهده
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
