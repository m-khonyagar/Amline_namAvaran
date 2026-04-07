'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useEffect } from 'react'
import { ensureMappedError } from '../../../lib/errorMapper'
import { createRequirement } from '../../../lib/needsApi'
import { CITY_OPTIONS, PROPERTY_TYPE_OPTIONS } from '../../../lib/needsConstants'
import { useAuthReady } from '../../../lib/useAuthReady'

export default function NeedBarterPage() {
  const router = useRouter()
  const authReady = useAuthReady()
  const [cityId, setCityId] = useState('')
  const [neighborhoodId, setNeighborhoodId] = useState('')
  const [propertyTypeId, setPropertyTypeId] = useState('')
  const [description, setDescription] = useState('')
  const [publishTitle, setPublishTitle] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (authReady === false) router.replace('/login')
  }, [authReady, router])

  const city = CITY_OPTIONS.find((c) => c.id === cityId)
  const nhoods = city?.neighborhoods ?? []
  const nLabel = nhoods.find((n) => n.id === neighborhoodId)?.label ?? ''
  const ptLabel = PROPERTY_TYPE_OPTIONS.find((p) => p.id === propertyTypeId)?.label ?? ''

  const requiredOk = useMemo(() => {
    if (!cityId || !neighborhoodId) return false
    if (!description.trim() || description.trim().length < 10) return false
    if (!publishTitle.trim()) return false
    return true
  }, [cityId, neighborhoodId, description, publishTitle])

  async function submit() {
    setShowErrors(true)
    setSubmitError(null)
    if (!requiredOk) return
    setSubmitting(true)
    try {
      const res = await createRequirement({
        kind: 'barter',
        publish_title: publishTitle.trim(),
        city_label: city?.label ?? '',
        neighborhood_label: nLabel,
        property_type_label: ptLabel || undefined,
        description: description.trim(),
      })
      router.push(`/needs/success?kind=barter&id=${encodeURIComponent(res.id)}`)
    } catch (e) {
      setSubmitError(ensureMappedError(e).message)
    } finally {
      setSubmitting(false)
    }
  }

  if (authReady === null) {
    return (
      <main className="mx-auto max-w-lg px-4 py-10">
        <p className="amline-body text-center text-[var(--amline-fg-muted)]">در حال بارگذاری…</p>
      </main>
    )
  }

  if (!authReady) {
    return (
      <main className="mx-auto max-w-lg px-4 py-10">
        <p className="amline-body text-center">در حال هدایت به ورود…</p>
      </main>
    )
  }

  const err = (ok: boolean) =>
    showErrors && !ok ? 'border-red-400 ring-1 ring-red-300 dark:border-red-700' : ''

  return (
    <main className="mx-auto max-w-lg px-4 pb-32 pt-6 sm:px-6">
      <header className="mb-6 flex items-center gap-3 border-b border-[var(--amline-border)] pb-4">
        <Link
          href="/needs"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-amline border border-[var(--amline-border)] bg-[var(--amline-surface)]"
          aria-label="بازگشت"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="amline-title flex-1 text-center text-base text-[var(--amline-fg)]">ثبت نیازمندی — معاوضه</h1>
        <span className="w-11" aria-hidden />
      </header>

      <div className="space-y-5">
        <p className="text-sm text-[var(--amline-fg-muted)]">
          ملک یا دارایی خود و چیزی که به‌دنبال آن هستید را بنویسید؛ نوع ملک اختیاری است.
        </p>

        <div>
          <label className="amline-caption block text-[var(--amline-fg-muted)]">شهر</label>
          <select
            value={cityId}
            onChange={(e) => {
              setCityId(e.target.value)
              setNeighborhoodId('')
            }}
            className={`input mt-1 ${err(Boolean(cityId))}`}
          >
            <option value="">انتخاب کنید</option>
            {CITY_OPTIONS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="amline-caption block text-[var(--amline-fg-muted)]">محله</label>
          <select
            value={neighborhoodId}
            onChange={(e) => setNeighborhoodId(e.target.value)}
            disabled={!cityId}
            className={`input mt-1 disabled:opacity-50 ${err(Boolean(neighborhoodId))}`}
          >
            <option value="">{cityId ? 'انتخاب محله' : 'ابتدا شهر را انتخاب کنید'}</option>
            {nhoods.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="amline-caption block text-[var(--amline-fg-muted)]">نوع ملک (اختیاری)</label>
          <select
            value={propertyTypeId}
            onChange={(e) => setPropertyTypeId(e.target.value)}
            className="input mt-1"
          >
            <option value="">—</option>
            {PROPERTY_TYPE_OPTIONS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="amline-caption block text-[var(--amline-fg-muted)]">شرایط معاوضه (حداقل ۱۰ نویسه)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className={`input mt-1 resize-y ${
              showErrors && description.trim().length < 10
                ? 'border-red-400 ring-1 ring-red-300 dark:border-red-700'
                : ''
            }`}
            placeholder="مثلاً: آپارتمان ۸۵ متری در ازای مغازه تجاری…"
          />
        </div>

        <div className="rounded-amline border border-[var(--amline-border)] bg-[var(--amline-surface-muted)]/60 p-4 dark:border-slate-700">
          <label className="text-sm font-medium text-[var(--amline-fg)]">نیازمندی شما با چه نامی منتشر شود؟</label>
          <input
            type="text"
            value={publishTitle}
            onChange={(e) => setPublishTitle(e.target.value)}
            className={`input mt-2 ${err(Boolean(publishTitle.trim()))}`}
            placeholder="عنوان کوتاه"
          />
        </div>

        {showErrors && !requiredOk ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            شهر، محله، توضیح کافی و عنوان انتشار الزامی است.
          </p>
        ) : null}
        {submitError ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {submitError}
          </p>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--amline-border)] bg-[var(--amline-surface)]/95 backdrop-blur-sm dark:border-slate-700">
        <div
          className="mx-auto max-w-lg px-4 pt-3"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting}
            className="btn btn-primary min-h-[48px] w-full font-semibold disabled:opacity-50"
          >
            {submitting ? 'در حال ثبت…' : 'ثبت نیازمندی معاوضه'}
          </button>
        </div>
      </div>
    </main>
  )
}
