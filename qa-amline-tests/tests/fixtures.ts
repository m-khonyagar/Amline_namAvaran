/**
 * Fixtures و داده‌های تست جامع - املاین
 */
export const TEST_USERS = {
  owner: '09107709601',
  tenant: '09127463726',
  coordinator: '09121234567',
} as const

/** کدهای ملی معتبر (الگوریتم چک‌دیجیت ایران) */
export const VALID_NATIONAL_IDS = [
  '0499370899',
  '0684159415',
  '0076229645',
  '0013542419',
  '0012016467',
  '0010859657',
]

/** شماره‌های شبا معتبر */
export const VALID_SHEBAS = [
  'IR550560960180002284298001',
  'IR580540105180021273113007',
]

export const VALID_CONTRACT_DATA = {
  startDate: '1403/01/15',
  endDate: '1404/01/15',
  monthlyRent: '50000000',
  deposit: '150000000',
  propertyAddress: 'تهران، منطقه ۱، خیابان ولیعصر، پلاک ۱۰',
  postalCode: '1234567890',
  area: '85',
  fullName: 'علی محمدی',
  nationalId: '0499370899',
  sheba: 'IR550560960180002284298001',
  birthDay: '15',
  birthMonth: '6',
  birthYear: '1370',
  constructionYear: '1380',
  tenantCount: '1',
}

export const INVALID_VALUES = {
  shortMobile: '0912',
  longMobile: '09121234567890',
  invalidMobile: '08121234567',
  lettersInMobile: '0912abc4567',
  emptyMobile: '',
  shortNationalId: '12345',
  longNationalId: '12345678901',
  invalidNationalId: '123456789a',
  allSameNationalId: '1111111111',
  negativeAmount: '-1000000',
  zeroAmount: '0',
  lettersInAmount: 'abc',
  veryLargeAmount: '999999999999999',
  pastDate: '1399/01/01',
  invalidDateFormat: '2024-01-01',
  shortPostalCode: '12345',
  longPostalCode: '12345678901',
  invalidPostalCode: '123456789a',
  shortSheba: 'IR123',
  invalidSheba: 'IR12345678901234567890123a',
  negativeArea: '-10',
  zeroArea: '0',
  empty: '',
  specialChars: '!@#$%^&*()',
  sqlInjection: "'; DROP TABLE users;--",
  xss: '<script>alert(1)</script>',
}

/** سناریوهای تست برای نقش‌های مختلف */
export const ROLE_SCENARIOS = {
  owner: { mobile: '09107709601', nationalId: VALID_NATIONAL_IDS[0] },
  tenant: { mobile: '09127463726', nationalId: VALID_NATIONAL_IDS[1] },
  coordinator: { mobile: '09121234567', nationalId: VALID_NATIONAL_IDS[2] },
} as const
