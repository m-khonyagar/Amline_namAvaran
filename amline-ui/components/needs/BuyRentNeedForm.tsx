'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ensureMappedError } from '../../lib/errorMapper'
import { createRequirement } from '../../lib/needsApi'
import { CITY_OPTIONS, PROPERTY_TYPE_OPTIONS } from '../../lib/needsConstants'

export type BuyRentMode = 'buy' | 'rent'

const ROOM_OPTIONS = ['۱', '۲', '۳', '۴', '۵+'] as const

function parseNum(s: string): number | null {
  const n = Number(String(s).replace(/,/g, '').trim())
  return Number.isFinite(n) && n >= 0 ? n : null
}

export function BuyRentNeedForm({ mode }: { mode: BuyRentMode }) {
  const router = useRouter()
  const [cityId, setCityId] = useState('')
  const [neighborhoodId, setNeighborhoodId] = useState('')
  const [propertyTypeId, setPropertyTypeId] = useState('')
  const [minArea, setMinArea] = useState('')
  const [buildYear, setBuildYear] = useState('')
  const [renovated, setRenovated] = useState(false)
  const [totalPrice, setTotalPrice] = useState('')
  const [roomIx, setRoomIx] = useState<number | null>(null)
  const [elevator, setElevator] = useState(false)
  const [storage, setStorage] = useState(false)
  const [parking, setParking] = useState(false)
  const [description, setDescription] = useState('')
  const [publishTitle, setPublishTitle] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const city = CITY_OPTIONS.find((c) => c.id === cityId)
  const nhoods = city?.neighborhoods ?? []
  const nLabel = nhoods.find((n) => n.id === neighborhoodId)?.label ?? ''
  const ptLabel = PROPERTY_TYPE_OPTIONS.find((p) => p.id === propertyTypeId)?.label ?? ''

  const requiredOk = useMemo(() => {
    if (!cityId || !neighborhoodId || !propertyTypeId) return false
    if (parseNum(minArea) == null) return false
    if (parseNum(totalPrice) == null) return false
    if (!publishTitle.trim()) return false
    return true
  }, [cityId, neighborhoodId, propertyTypeId, minArea, totalPrice, publishTitle])

  function buildPayload() {
    return {
      mode,
      cityId,
      cityLabel: city?.label ?? '',
      neighborhoodId,
      neighborhoodLabel: nLabel,
      propertyTypeId,
      propertyTypeLabel: ptLabel,
      minArea: parseNum(minArea),
      buildYear: buildYear.trim() ? parseNum(buildYear) : null,
      renovated,
      totalPrice: parseNum(totalPrice),
      rooms: roomIx != null ? ROOM_OPTIONS[roomIx] : null,
      amenities: { elevator, storage, parking },
      description: description.trim(),
      publishTitle: publishTitle.trim(),
    }
  }

  function handlePreview() {
    setShowErrors(true)
    if (!requiredOk) return
    setPreviewOpen(true)
  }

  async function handleSubmit() {
    setShowErrors(true)
    setSubmitError(null)
    if (!requiredOk) return
    const p = buildPayload()
    setSubmitting(true)
    try {
      const res = await createRequirement({
        kind: p.mode,
        publish_title: p.publishTitle,
        city_label: p.cityLabel,
        neighborhood_label: p.neighborhoodLabel,
        property_type_id: p.propertyTypeId || undefined,
        property_type_label: p.propertyTypeLabel || undefined,
        min_area: p.minArea ?? undefined,
        total_price: p.totalPrice ?? undefined,
        build_year: p.buildYear ?? undefined,
        renovated: p.renovated,
        rooms: p.rooms ?? undefined,
        amenities: p.amenities,
        description: p.description || undefined,
      })
      router.push(`/needs/success?kind=${encodeURIComponent(mode)}&id=${encodeURIComponent(res.id)}`)
    } catch (e) {
      setSubmitError(ensureMappedError(e).message)
    } finally {
      setSubmitting(false)
    }
  }

  const headline =
    mode === 'buy' ? 'چه ملکی برای خرید نیاز داری؟' : 'چه ملکی برای رهن و اجاره نیاز داری؟'

  const err = (ok: boolean) =>
    showErrors && !ok ? 'border-red-400 ring-1 ring-red-300 dark:border-red-700' : ''

  return (
    <>
      <div className="space-y-5">
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
          <p className="text-sm font-medium text-[var(--amline-fg)]">{headline}</p>
          <select
            value={propertyTypeId}
            onChange={(e) => setPropertyTypeId(e.target.value)}
            className={`input mt-2 ${err(Boolean(propertyTypeId))}`}
          >
            <option value="">نوع ملک را انتخاب کنید</option>
            {PROPERTY_TYPE_OPTIONS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="amline-caption block text-[var(--amline-fg-muted)]">حداقل متراژ (متر)</label>
          <input
            type="text"
            inputMode="decimal"
            value={minArea}
            onChange={(e) => setMinArea(e.target.value)}
            className={`input mt-1 ${err(parseNum(minArea) != null)}`}
            placeholder="مثلاً ۷۵"
          />
        </div>

        <div>
          <label className="amline-caption block text-[var(--amline-fg-muted)]">سال ساخت (اختیاری)</label>
          <input
            type="text"
            inputMode="numeric"
            value={buildYear}
            onChange={(e) => setBuildYear(e.target.value)}
            className="input mt-1"
            placeholder="مثلاً ۱۳۹۸"
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--amline-fg)]">
          <input
            type="checkbox"
            checked={renovated}
            onChange={(e) => setRenovated(e.target.checked)}
            className="h-4 w-4 rounded border-[var(--amline-border)]"
          />
          بازسازی شده
        </label>

        <div>
          <label className="amline-caption block text-[var(--amline-fg-muted)]">
            {mode === 'buy' ? 'قیمت کل (تومان)' : 'بودجه رهن/اجاره (تومان)'}
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={totalPrice}
            onChange={(e) => setTotalPrice(e.target.value)}
            className={`input mt-1 ${err(parseNum(totalPrice) != null)}`}
            placeholder="عدد به تومان"
          />
        </div>

        <div>
          <p className="amline-caption mb-2 text-[var(--amline-fg-muted)]">تعداد اتاق</p>
          <div className="flex flex-wrap gap-2">
            {ROOM_OPTIONS.map((r, i) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoomIx(i)}
                className={`min-h-[44px] min-w-[44px] rounded-[var(--amline-radius-md)] border px-3 text-sm font-medium transition-colors ${
                  roomIx === i
                    ? 'border-[var(--amline-primary)] bg-[var(--amline-primary-muted)] text-[var(--amline-primary)]'
                    : 'border-[var(--amline-border)] bg-[var(--amline-surface)] text-[var(--amline-fg-muted)] hover:bg-[var(--amline-surface-muted)]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-[var(--amline-fg)]">امکانات ساختمان</p>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-[var(--amline-fg)]">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={elevator} onChange={(e) => setElevator(e.target.checked)} className="h-4 w-4" />
              آسانسور
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={storage} onChange={(e) => setStorage(e.target.checked)} className="h-4 w-4" />
              انباری
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={parking} onChange={(e) => setParking(e.target.checked)} className="h-4 w-4" />
              پارکینگ
            </label>
          </div>
        </div>

        <div>
          <label className="amline-caption block text-[var(--amline-fg-muted)]">توضیحات</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="input mt-1 resize-y"
            placeholder="هر نکته‌ای که برای مشاور مهم است…"
          />
        </div>

        <div className="rounded-amline border border-[var(--amline-border)] bg-[var(--amline-surface-muted)]/60 p-4 dark:border-slate-700">
          <label className="text-sm font-medium text-[var(--amline-fg)]">نیازمندی شما با چه نامی منتشر شود؟</label>
          <input
            type="text"
            value={publishTitle}
            onChange={(e) => setPublishTitle(e.target.value)}
            className={`input mt-2 ${err(Boolean(publishTitle.trim()))}`}
            placeholder="عنوان کوتاه برای انتشار"
          />
        </div>

        {showErrors && !requiredOk ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            لطفاً فیلدهای اجباری را تکمیل کنید؛ تا آن زمان پیش‌نمایش و ثبت فعال نمی‌شود.
          </p>
        ) : null}
        {submitError ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {submitError}
          </p>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--amline-border)] bg-[var(--amline-surface)]/95 backdrop-blur-sm dark:border-slate-700 dark:bg-[var(--amline-bg)]/95">
        <div
          className="mx-auto flex max-w-lg gap-2 px-4 pt-3"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            onClick={handlePreview}
            disabled={!requiredOk || submitting}
            title={
              requiredOk
                ? 'نمایش خلاصه قبل از ثبت'
                : 'پس از تکمیل شهر، محله، نوع ملک، متراژ، بودجه و عنوان انتشار فعال می‌شود'
            }
            className="btn btn-outline min-h-[48px] flex-1 font-semibold disabled:pointer-events-none disabled:opacity-45 dark:border-slate-700"
          >
            پیش‌نمایش
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="btn btn-primary min-h-[48px] flex-1 font-semibold disabled:opacity-50"
          >
            {submitting ? 'در حال ثبت…' : 'ثبت نیازمندی'}
          </button>
        </div>
      </div>

      {previewOpen ? (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="پیش‌نمایش نیازمندی"
        >
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-amline-lg border border-[var(--amline-border)] bg-[var(--amline-surface)] p-5 shadow-amline dark:border-slate-700 dark:bg-[var(--amline-surface-elevated)]">
            <h2 className="text-lg font-bold text-[var(--amline-fg)]">پیش‌نمایش انتشار</h2>
            <dl className="mt-4 space-y-2 text-sm text-[var(--amline-fg)]">
              <div>
                <dt className="amline-caption">عنوان</dt>
                <dd className="font-medium">{publishTitle.trim() || '—'}</dd>
              </div>
              <div>
                <dt className="amline-caption">شهر / محله</dt>
                <dd>
                  {city?.label} — {nLabel}
                </dd>
              </div>
              <div>
                <dt className="amline-caption">نوع ملک</dt>
                <dd>{ptLabel}</dd>
              </div>
              <div>
                <dt className="amline-caption">متراژ / بودجه</dt>
                <dd>
                  از {minArea} متر — {totalPrice} تومان
                </dd>
              </div>
            </dl>
            <button
              type="button"
              className="btn btn-primary mt-6 w-full min-h-[48px] font-semibold"
              onClick={() => setPreviewOpen(false)}
            >
              بستن
            </button>
          </div>
        </div>
      ) : null}

      <p className="pb-24 pt-4 text-center text-xs text-[var(--amline-fg-subtle)]">
        <Link href="/needs" className="text-[var(--amline-primary)]">
          بازگشت به انتخاب نوع نیازمندی
        </Link>
      </p>
    </>
  )
}
