/** برچسب‌های فارسی برای enumهای قرارداد (هم‌تراز با admin-ui wizard) */

export const CONTRACT_STATUS_FA: Record<string, string> = {
  ADMIN_STARTED: 'شروع توسط ادمین',
  DRAFT: 'پیش‌نویس',
  ONE_PARTY_SIGNED: 'یک طرف امضا کرده',
  FULLY_SIGNED: 'امضای کامل',
  LANDLORDS_FULLY_SIGNED: 'امضای کامل مالکان',
  TENANTS_FULLY_SIGNED: 'امضای کامل مستاجرین',
  ACTIVE: 'فعال',
  PENDING_COMMISSION: 'در انتظار کمیسیون',
  EDIT_REQUESTED: 'درخواست ویرایش',
  PARTY_REJECTED: 'رد توسط طرف',
  PENDING_ADMIN_APPROVAL: 'در انتظار تأیید ادمین',
  ADMIN_REJECTED: 'رد شده توسط ادمین',
  COMPLETED: 'تکمیل‌شده',
  REVOKED: 'لغوشده',
  PDF_GENERATED: 'PDF تولید شده',
  PDF_GENERATING_FAILED: 'خطای تولید PDF',
}

export const PR_CONTRACT_STEP_FA: Record<string, string> = {
  DRAFT: 'پیش‌نویس',
  LANDLORD_INFORMATION: 'اطلاعات مالک',
  TENANT_INFORMATION: 'اطلاعات مستاجر',
  PLACE_INFORMATION: 'اطلاعات ملک',
  DATING: 'تاریخ‌ها',
  MORTGAGE: 'ودیعه',
  RENTING: 'اجاره',
  SIGNING: 'امضا',
  WITNESS: 'شاهد',
  FINISH: 'پایان',
}

export function labelStatus(raw: string | null | undefined): string {
  if (raw == null || raw === '') return '—'
  return CONTRACT_STATUS_FA[raw] ?? raw
}

export function labelStep(raw: string | null | undefined): string {
  if (raw == null || raw === '') return '—'
  return PR_CONTRACT_STEP_FA[raw] ?? raw
}

const PARTY_TYPE_FA: Record<string, string> = {
  LANDLORD: 'مالک',
  TENANT: 'مستاجر',
}

const PERSON_TYPE_FA: Record<string, string> = {
  NATURAL_PERSON: 'شخص حقیقی',
  LEGAL_PERSON: 'شخص حقوقی',
}

export function labelPartyType(raw: string): string {
  return PARTY_TYPE_FA[raw] ?? raw
}

export function labelPersonType(raw: string): string {
  return PERSON_TYPE_FA[raw] ?? raw
}
