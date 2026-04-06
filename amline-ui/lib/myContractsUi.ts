import { labelPartyType } from './contractLabels'

export type MyContractsTab = 'active' | 'draft' | 'closed'

export interface MyContractRow {
  id: string
  type: string
  status: string
  step?: string | null
  party_type?: string | null
  created_at: string
  is_owner?: boolean
  parties?: Record<string, unknown>
}

const TYPE_LABEL: Record<string, string> = {
  PROPERTY_RENT: 'رهن و اجاره',
  BUYING_AND_SELLING: 'خرید و فروش',
}

export function contractTypeLabel(type: string): string {
  return TYPE_LABEL[type] ?? type
}

export function contractTabCategory(c: MyContractRow): MyContractsTab {
  const st = c.status
  if (st === 'DRAFT') return 'draft'
  if (
    st === 'COMPLETED' ||
    st === 'REVOKED' ||
    st === 'ADMIN_REJECTED' ||
    st === 'PDF_GENERATED' ||
    st === 'PDF_GENERATING_FAILED'
  ) {
    return 'closed'
  }
  return 'active'
}

/** برچسب پیل بالای کارت (هم‌راستا با کپی فیگما) */
export function listCardBadgeLabel(c: MyContractRow): string {
  const st = c.status
  const step = c.step ?? ''
  const pt = c.party_type ?? 'LANDLORD'

  if (st === 'DRAFT') return 'پیش‌نویس'
  if (st === 'PENDING_COMMISSION') return 'در انتظار شما'
  if (st === 'PENDING_ADMIN_APPROVAL') return 'در انتظار کارشناس'
  if (st === 'COMPLETED' || st === 'PDF_GENERATED') return 'قرارداد نهایی'
  if (st === 'REVOKED') return 'فسخ‌شده'
  if (st === 'ADMIN_REJECTED') return 'رد شده'
  if (st === 'PDF_GENERATING_FAILED') return 'خطا در فایل قرارداد'

  if (step === 'SIGNING') {
    return pt === 'LANDLORD' ? 'در انتظار مستاجر' : 'در انتظار مالک'
  }

  if (pt === 'TENANT') {
    if (step === 'LANDLORD_INFORMATION' || step === 'TENANT_INFORMATION') {
      return 'در انتظار مالک'
    }
  }
  if (pt === 'LANDLORD' && step === 'TENANT_INFORMATION') {
    return 'در انتظار مستاجر'
  }

  return 'در انتظار شما'
}

export function listCardHint(c: MyContractRow): string {
  const st = c.status
  const step = c.step ?? ''

  if (st === 'DRAFT') {
    return 'پیش‌نویس را تکمیل یا حذف کنید؛ تا ثبت نهایی اعتبار حقوقی ندارد.'
  }
  if (st === 'PENDING_COMMISSION') {
    return 'برای ادامهٔ فرایند امضا، ابتدا کمیسیون را از جزئیات قرارداد پرداخت کنید.'
  }
  if (st === 'PENDING_ADMIN_APPROVAL') {
    return 'قرارداد در صف بررسی کارشناس است؛ پس از نتیجه به شما اطلاع داده می‌شود.'
  }
  if (st === 'COMPLETED' || st === 'PDF_GENERATED') {
    return 'قرارداد نهایی شده است؛ در صورت آماده بودن فایل، می‌توانید آن را دانلود کنید.'
  }
  if (step === 'SIGNING') {
    return 'مرحلهٔ امضا؛ طرف مقابل یا اقدام بعدی را از جزئیات قرارداد پیگیری کنید.'
  }
  return 'برای ادامهٔ کار، جزئیات قرارداد را باز کنید.'
}

export function contractCardTitle(c: MyContractRow): string {
  const t = contractTypeLabel(c.type)
  const parties = c.parties ?? {}
  const postal = typeof parties.postal_code === 'string' ? parties.postal_code.trim() : ''
  if (postal) {
    return `قرارداد ${t} — کدپستی ${postal}`
  }
  return `قرارداد ${t} جدید`
}

export function contractRoleLine(c: MyContractRow): string {
  const pt = c.party_type
  if (!pt) return 'شما به‌عنوان طرف قرارداد'
  return `شما به‌عنوان ${labelPartyType(pt)}`
}

export function contractMatchesQuery(c: MyContractRow, q: string): boolean {
  if (!q.trim()) return true
  const needle = q.trim().toLowerCase()
  const hay = [
    c.id,
    contractCardTitle(c),
    listCardBadgeLabel(c),
    contractRoleLine(c),
    c.status,
    c.step ?? '',
  ]
    .join(' ')
    .toLowerCase()
  return hay.includes(needle)
}

export function badgeTone(
  c: MyContractRow,
): 'neutral' | 'warning' | 'success' | 'danger' | 'info' {
  const st = c.status
  if (st === 'DRAFT') return 'neutral'
  if (st === 'REVOKED' || st === 'ADMIN_REJECTED' || st === 'PDF_GENERATING_FAILED') return 'danger'
  if (st === 'COMPLETED' || st === 'PDF_GENERATED') return 'success'
  if (st === 'PENDING_COMMISSION' || st === 'PENDING_ADMIN_APPROVAL') return 'warning'
  return 'info'
}

export function showDeleteDraft(c: MyContractRow): boolean {
  return c.status === 'DRAFT'
}

export function showDownloadContract(c: MyContractRow): boolean {
  if (c.status === 'DRAFT' || c.status === 'REVOKED' || c.status === 'ADMIN_REJECTED') return false
  const parties = c.parties ?? {}
  if (typeof parties.pdf_url === 'string' && parties.pdf_url.length > 0) return true
  return (
    c.status === 'COMPLETED' ||
    c.status === 'PDF_GENERATED' ||
    c.status === 'ACTIVE' ||
    c.status === 'FULLY_SIGNED' ||
    c.status === 'LANDLORDS_FULLY_SIGNED' ||
    c.status === 'TENANTS_FULLY_SIGNED'
  )
}
