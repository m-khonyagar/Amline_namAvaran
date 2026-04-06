/**
 * تایم‌لاین «پیشرفت قرارداد» — متن مراحل از فیگما (قراردادهای من / Contract Progress).
 * پیشرفت از `status` و `step` API نگاشت می‌شود.
 */

export const CONTRACT_PROGRESS_PHASE_TITLES = [
  'تکمیل اطلاعات مستاجر',
  'ویرایش اطلاعات مستاجر',
  'تکمیل اطلاعات و امضای مالک',
  'ویرایش اطلاعات و امضای مالک',
  'امضای مستاجر',
  'پرداخت کمیسیون مالک و مستاجر',
  'تأیید کارشناس حقوقی املاین',
  'صدور کد رهگیری و مشاهده قرارداد',
] as const

const STEP_ORDER = [
  'LANDLORD_INFORMATION',
  'TENANT_INFORMATION',
  'PLACE_INFORMATION',
  'DATING',
  'MORTGAGE',
  'RENTING',
  'SIGNING',
  'WITNESS',
  'FINISH',
] as const

export type ProgressRowState = 'done' | 'active' | 'pending'

export interface ContractProgressInput {
  status: string
  step: string | null
  created_at: string
  tracking_code?: string | null
}

export interface ProgressRow {
  key: string
  title: string
  state: ProgressRowState
  badge?: string
  hint?: string
  dateLine?: string
}

function stepIndex(step: string | null | undefined): number {
  if (!step) return 0
  const i = STEP_ORDER.indexOf(step as (typeof STEP_ORDER)[number])
  return i >= 0 ? i : 0
}

function formatDateLine(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('fa-IR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return ''
  }
}

/**
 * تعداد مراحل تکمیل‌شده (۰…۸). مرحلهٔ فعال ایندکس `c` است (اگر c < ۸).
 */
export function completedPhaseCount(input: ContractProgressInput): number {
  const si = stepIndex(input.step)
  const st = input.status

  if (st === 'REVOKED') return 0

  if (si < 2) return 0
  if (si < 3) return 2
  if (si < 4) return 3
  if (si < 5) return 4
  if (si < 6) return 5

  if (si >= 6) {
    if (st === 'PENDING_COMMISSION') return 5
    if (st === 'PENDING_ADMIN_APPROVAL' || st === 'ADMIN_REJECTED') return 6
    if (st === 'ACTIVE') return 7
    if (['COMPLETED', 'PDF_GENERATED'].includes(st) || input.tracking_code) return 8
    return 6
  }

  return 0
}

export function buildContractProgressRows(input: ContractProgressInput): ProgressRow[] {
  const c = completedPhaseCount(input)
  const dateBase = formatDateLine(input.created_at)
  const n = CONTRACT_PROGRESS_PHASE_TITLES.length

  return CONTRACT_PROGRESS_PHASE_TITLES.map((title, i) => {
    const key = `phase-${i}`
    if (c >= n) {
      return {
        key,
        title,
        state: 'done',
        badge: 'تکمیل',
        dateLine: dateBase,
      }
    }
    if (i < c) {
      return {
        key,
        title,
        state: 'done',
        badge: 'تکمیل',
        dateLine: dateBase,
      }
    }
    if (i === c) {
      let hint: string | undefined
      if (title.includes('ویرایش اطلاعات و امضای مالک')) {
        hint = 'درخواست از طرف شما'
      }
      if (title.includes('پرداخت کمیسیون') && input.status === 'PENDING_COMMISSION') {
        hint = 'در انتظار پرداخت'
      }
      if (title.includes('کارشناس') && input.status === 'PENDING_ADMIN_APPROVAL') {
        hint = 'در صف بررسی'
      }
      if (title.includes('کد رهگیری') && input.tracking_code) {
        hint = `کد رهگیری: ${input.tracking_code}`
      }
      return {
        key,
        title,
        state: 'active',
        hint,
        dateLine: dateBase,
      }
    }
    return { key, title, state: 'pending' }
  })
}
