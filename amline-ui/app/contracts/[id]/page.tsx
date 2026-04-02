'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { hasAccessToken } from '../../../lib/auth'
import { ensureMappedError } from '../../../lib/errorMapper'
import { fetchJson } from '../../../lib/fetchJson'
import { labelPartyType, labelPersonType, labelStatus, labelStep } from '../../../lib/contractLabels'

interface ContractDetail {
  id: string
  type: string
  status: string
  step: string | null
  created_at: string
  parties: Record<string, Array<{ id: string; party_type: string; person_type: string }>>
  pdf_file?: string | null
  tracking_code?: string | null
}

export default function ContractDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id
  const [data, setData] = useState<ContractDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorDetails, setErrorDetails] = useState<string[]>([])
  const [errorHint, setErrorHint] = useState<string | null>(null)

  useEffect(() => {
    if (!hasAccessToken()) {
      router.replace('/login')
      return
    }
    if (!id) return
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        setErrorDetails([])
        setErrorHint(null)
        const json = await fetchJson<ContractDetail>(`/contracts/${id}`)
        if (mounted) setData(json)
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
  }, [id, router])

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href="/contracts"
        className="inline-flex min-h-[44px] items-center text-sm font-medium text-[var(--amline-primary)] hover:underline"
      >
        ← بازگشت به لیست
      </Link>
      <h1 className="amline-display mt-4 text-[var(--amline-fg)]">جزئیات قرارداد</h1>

      {loading && (
        <p className="mt-4 text-sm text-gray-500 dark:text-slate-400">در حال بارگذاری…</p>
      )}
      {error && (
        <div
          role="alert"
          className="mt-4 space-y-3 rounded-amline border border-red-200 bg-red-50 p-4 text-sm text-red-900 shadow-amline dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-50"
        >
          <div>
            <p className="text-xs font-semibold">علت خطا</p>
            <p className="mt-1 whitespace-pre-wrap font-medium leading-relaxed">{error}</p>
          </div>
          {errorDetails.length > 0 && (
            <ul className="list-disc space-y-1 pr-5 text-xs leading-relaxed">
              {errorDetails.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          )}
          {errorHint ? (
            <div className="border-t border-red-200/80 pt-2 text-xs dark:border-red-900/40">
              <span className="font-semibold">اقدام پیشنهادی: </span>
              {errorHint}
            </div>
          ) : null}
        </div>
      )}

      {data && (
        <div className="mt-5 space-y-4 rounded-amline border border-[var(--amline-border)] bg-[var(--amline-surface)] p-5 shadow-amline dark:border-slate-700 dark:bg-[var(--amline-surface-elevated)]">
          <div className="grid grid-cols-2 gap-3 text-sm text-gray-900 dark:text-slate-100">
            <div>
              <span className="text-gray-500 dark:text-slate-400">شناسه:</span>{' '}
              <span className="font-mono">{data.id}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-slate-400">وضعیت:</span>{' '}
              <span title={data.status}>{labelStatus(data.status)}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-slate-400">مرحله:</span>{' '}
              <span title={data.step ?? ''}>{labelStep(data.step)}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-slate-400">تاریخ ایجاد:</span>{' '}
              {new Date(data.created_at).toLocaleDateString('fa-IR')}
            </div>
            {data.tracking_code ? (
              <div className="col-span-2">
                <span className="text-gray-500 dark:text-slate-400">کد رهگیری:</span>{' '}
                <span className="font-mono">{data.tracking_code}</span>
              </div>
            ) : null}
          </div>

          {data.pdf_file ? (
            <div>
              <a
                href={data.pdf_file}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center rounded-lg bg-[var(--amline-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                دانلود / مشاهدهٔ PDF قرارداد
              </a>
            </div>
          ) : (
            <p className="text-xs text-gray-500 dark:text-slate-400">فایل PDF هنوز در دسترس نیست.</p>
          )}

          <div>
            <h2 className="mb-2 text-sm font-semibold text-gray-700 dark:text-slate-200">طرفین</h2>
            <div className="space-y-2">
              {Object.values(data.parties ?? {})
                .flat()
                .map((p) => (
                  <div
                    key={p.id}
                    className="rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-slate-800 dark:text-slate-100"
                  >
                    {labelPartyType(p.party_type)} — {labelPersonType(p.person_type)}{' '}
                    <span className="font-mono text-xs text-gray-500">({p.id})</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
