/** دادهٔ قابل‌جهش برای مدیریت کاربران در MSW */

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'MANUAL_REVIEW'

export interface AdminUserRecord {
  id: string
  mobile: string
  full_name: string | null
  email: string | null
  national_code: string | null
  role: string
  is_active: boolean
  created_at: string
  last_login: string | null
  verification_status: VerificationStatus
  verified_at: string | null
  verified_by_name: string | null
  verification_note: string | null
  wallet_balance: number
  credit_limit: number
  internal_notes: string
  tags: string[]
  address: string | null
  birth_date: string | null
  gender: 'male' | 'female' | 'unspecified' | null
  source: string
}

export interface TimelineEvent {
  id: string
  user_id: string
  type:
    | 'LOGIN'
    | 'CALL_OUTBOUND'
    | 'CALL_INBOUND'
    | 'SMS'
    | 'CHAT'
    | 'CONTRACT'
    | 'PAYMENT'
    | 'TICKET'
    | 'NOTE'
    | 'VERIFICATION'
  title: string
  detail: string | null
  created_at: string
  meta?: Record<string, unknown>
}

export interface PaymentRow {
  id: string
  user_id: string
  amount: number
  currency: string
  status: 'PAID' | 'PENDING' | 'FAILED'
  description: string
  reference: string | null
  created_at: string
}

export interface WalletLedgerRow {
  id: string
  user_id: string
  delta: number
  balance_after: number
  reason: string
  created_at: string
}

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_USER' | 'RESOLVED' | 'REFERRED'
export type TicketPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'

export interface SupportTicket {
  id: string
  user_id: string
  subject: string
  body: string
  status: TicketStatus
  priority: TicketPriority
  assigned_to_id: string | null
  assigned_to_name: string | null
  referred_from_id: string | null
  referred_to_name: string | null
  created_at: string
  updated_at: string
}

export interface StaffOption {
  id: string
  name: string
  title: string
}

function iso(d: Date) {
  return d.toISOString()
}

const now = new Date()

export const mswStaffOptions: StaffOption[] = [
  { id: 'staff-1', name: 'زهرا احمدی', title: 'کارشناس پشتیبانی' },
  { id: 'staff-2', name: 'امیر رضایی', title: 'کارشناس فروش' },
  { id: 'staff-3', name: 'مریم کریمی', title: 'مدیر احراز هویت' },
]

export let mswAdminUsers: AdminUserRecord[] = [
  {
    id: 'mock-001',
    mobile: '09120000000',
    full_name: 'کاربر آزمایشی',
    email: 'demo@amline.ir',
    national_code: '0012345678',
    role: 'admin',
    is_active: true,
    created_at: iso(new Date(now.getTime() - 86400000 * 120)),
    last_login: iso(new Date(now.getTime() - 3600000)),
    verification_status: 'VERIFIED',
    verified_at: iso(new Date(now.getTime() - 86400000 * 100)),
    verified_by_name: 'مریم کریمی',
    verification_note: 'تأیید دستی پس از تماس',
    wallet_balance: 2_500_000,
    credit_limit: 50_000_000,
    internal_notes: 'کاربر دمو اصلی',
    tags: ['دمو', 'VIP'],
    address: 'تهران، ونک',
    birth_date: '1368-05-12',
    gender: 'male',
    source: 'وب‌اپ',
  },
  {
    id: 'user-002',
    mobile: '09121112233',
    full_name: 'سارا محمدی',
    email: 'sara@example.com',
    national_code: '0498765432',
    role: 'user',
    is_active: true,
    created_at: iso(new Date(now.getTime() - 86400000 * 14)),
    last_login: iso(new Date(now.getTime() - 86400000 * 2)),
    verification_status: 'PENDING',
    verified_at: null,
    verified_by_name: null,
    verification_note: null,
    wallet_balance: 0,
    credit_limit: 10_000_000,
    internal_notes: '',
    tags: [],
    address: null,
    birth_date: null,
    gender: 'female',
    source: 'اپلیکیشن',
  },
  {
    id: 'user-003',
    mobile: '09123334455',
    full_name: 'علی رضایی',
    email: null,
    national_code: null,
    role: 'realtor',
    is_active: true,
    created_at: iso(new Date(now.getTime() - 86400000 * 45)),
    last_login: iso(new Date(now.getTime() - 86400000)),
    verification_status: 'MANUAL_REVIEW',
    verified_at: null,
    verified_by_name: null,
    verification_note: 'مدارک ناقص',
    wallet_balance: 15_000_000,
    credit_limit: 80_000_000,
    internal_notes: 'مشاور فعال منطقه ۵',
    tags: ['مشاور'],
    address: 'تهران',
    birth_date: null,
    gender: 'male',
    source: 'دعوت داخلی',
  },
  {
    id: 'user-004',
    mobile: '09125556677',
    full_name: 'نرگس حسینی',
    email: 'narges@example.com',
    national_code: '1370123456',
    role: 'user',
    is_active: false,
    created_at: iso(new Date(now.getTime() - 86400000 * 200)),
    last_login: iso(new Date(now.getTime() - 86400000 * 60)),
    verification_status: 'REJECTED',
    verified_at: iso(new Date(now.getTime() - 86400000 * 58)),
    verified_by_name: 'مریم کریمی',
    verification_note: 'عدم تطابق کد ملی',
    wallet_balance: 0,
    credit_limit: 0,
    internal_notes: 'غیرفعال شده توسط ادمین',
    tags: [],
    address: null,
    birth_date: null,
    gender: 'unspecified',
    source: 'وب‌اپ',
  },
  {
    id: 'user-005',
    mobile: '09127778899',
    full_name: 'حامد کاظمی',
    email: 'hamed@example.com',
    national_code: null,
    role: 'user',
    is_active: true,
    created_at: iso(new Date(now.getTime() - 86400000 * 3)),
    last_login: iso(new Date(now.getTime() - 7200000)),
    verification_status: 'VERIFIED',
    verified_at: iso(new Date(now.getTime() - 86400000)),
    verified_by_name: 'سیستم',
    verification_note: 'احراز خودکار',
    wallet_balance: 500_000,
    credit_limit: 20_000_000,
    internal_notes: '',
    tags: ['جدید'],
    address: 'اصفهان',
    birth_date: null,
    gender: 'male',
    source: 'کمپین اس‌ام‌اس',
  },
  {
    id: 'user-006',
    mobile: '09128889900',
    full_name: 'لیلا فرهادی',
    email: null,
    national_code: '0060060060',
    role: 'accountant',
    is_active: true,
    created_at: iso(new Date(now.getTime() - 86400000 * 300)),
    last_login: iso(new Date(now.getTime() - 86400000 * 5)),
    verification_status: 'VERIFIED',
    verified_at: iso(new Date(now.getTime() - 86400000 * 290)),
    verified_by_name: 'زهرا احمدی',
    verification_note: null,
    wallet_balance: 0,
    credit_limit: 0,
    internal_notes: 'حسابدار طرف قرارداد',
    tags: ['پارتی‌سازمانی'],
    address: null,
    birth_date: null,
    gender: 'female',
    source: 'ادمین',
  },
]

export let mswUserTimelines: Record<string, TimelineEvent[]> = {
  'mock-001': [
    {
      id: 'te-1',
      user_id: 'mock-001',
      type: 'LOGIN',
      title: 'ورود به پنل',
      detail: 'وب — کروم',
      created_at: iso(new Date(now.getTime() - 3600000)),
    },
    {
      id: 'te-2',
      user_id: 'mock-001',
      type: 'CHAT',
      title: 'چت با پشتیبانی',
      detail: '۳ پیام رد و بدل',
      created_at: iso(new Date(now.getTime() - 86400000)),
    },
    {
      id: 'te-3',
      user_id: 'mock-001',
      type: 'CALL_INBOUND',
      title: 'تماس ورودی از املاین',
      detail: 'پیگیری قرارداد — ۴ دقیقه',
      created_at: iso(new Date(now.getTime() - 86400000 * 2)),
    },
    {
      id: 'te-4',
      user_id: 'mock-001',
      type: 'CONTRACT',
      title: 'ایجاد قرارداد رهن و اجاره',
      detail: 'شناسه draft در جریان',
      created_at: iso(new Date(now.getTime() - 86400000 * 4)),
    },
    {
      id: 'te-5',
      user_id: 'mock-001',
      type: 'PAYMENT',
      title: 'پرداخت کارمزد',
      detail: '۲٬۵۰۰٬۰۰۰ ریال',
      created_at: iso(new Date(now.getTime() - 86400000 * 5)),
    },
  ],
  'user-002': [
    {
      id: 'te-u2-1',
      user_id: 'user-002',
      type: 'SMS',
      title: 'ارسال پیامک خوش‌آمد',
      detail: 'کمپین عضویت',
      created_at: iso(new Date(now.getTime() - 86400000 * 14)),
    },
    {
      id: 'te-u2-2',
      user_id: 'user-002',
      type: 'CALL_OUTBOUND',
      title: 'تماس خروجی کارشناس',
      detail: 'پیگیری تکمیل پروفایل',
      created_at: iso(new Date(now.getTime() - 86400000 * 10)),
    },
  ],
}

export let mswUserPayments: PaymentRow[] = [
  {
    id: 'pay-1',
    user_id: 'mock-001',
    amount: 2_500_000,
    currency: 'IRR',
    status: 'PAID',
    description: 'کارمزد قرارداد',
    reference: 'TRX-1001',
    created_at: iso(new Date(now.getTime() - 86400000 * 5)),
  },
  {
    id: 'pay-2',
    user_id: 'mock-001',
    amount: 1_000_000,
    currency: 'IRR',
    status: 'PAID',
    description: 'شارژ کیف پول',
    reference: 'TRX-1000',
    created_at: iso(new Date(now.getTime() - 86400000 * 20)),
  },
  {
    id: 'pay-3',
    user_id: 'user-005',
    amount: 500_000,
    currency: 'IRR',
    status: 'PENDING',
    description: 'پیش‌پرداخت',
    reference: null,
    created_at: iso(new Date(now.getTime() - 3600000)),
  },
]

export let mswWalletLedger: WalletLedgerRow[] = [
  {
    id: 'wl-1',
    user_id: 'mock-001',
    delta: 2_500_000,
    balance_after: 2_500_000,
    reason: 'شارژ از درگاه',
    created_at: iso(new Date(now.getTime() - 86400000 * 20)),
  },
  {
    id: 'wl-2',
    user_id: 'mock-001',
    delta: -500_000,
    balance_after: 2_000_000,
    reason: 'کسر کارمزد',
    created_at: iso(new Date(now.getTime() - 86400000 * 10)),
  },
  {
    id: 'wl-3',
    user_id: 'mock-001',
    delta: 500_000,
    balance_after: 2_500_000,
    reason: 'بازگشت وجه',
    created_at: iso(new Date(now.getTime() - 86400000 * 5)),
  },
]

export let mswUserTickets: SupportTicket[] = [
  {
    id: 'tk-1',
    user_id: 'mock-001',
    subject: 'مشکل در امضای قرارداد',
    body: 'در مرحلهٔ شاهد خطا می‌گیرم.',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    assigned_to_id: 'staff-1',
    assigned_to_name: 'زهرا احمدی',
    referred_from_id: null,
    referred_to_name: null,
    created_at: iso(new Date(now.getTime() - 86400000 * 2)),
    updated_at: iso(new Date(now.getTime() - 3600000)),
  },
  {
    id: 'tk-2',
    user_id: 'user-002',
    subject: 'درخواست احراز سریع‌تر',
    body: 'مدارک آپلود شده است.',
    status: 'OPEN',
    priority: 'NORMAL',
    assigned_to_id: null,
    assigned_to_name: null,
    referred_from_id: null,
    referred_to_name: null,
    created_at: iso(new Date(now.getTime() - 86400000)),
    updated_at: iso(new Date(now.getTime() - 86400000)),
  },
]

let userSeq = 7

export function nextUserId() {
  return `user-${String(userSeq++).padStart(3, '0')}`
}

export function findUser(id: string) {
  return mswAdminUsers.find((u) => u.id === id) ?? null
}

export function normalizeMobile(m: string): string | null {
  const d = m.replace(/\D/g, '')
  if (d.length === 10 && d.startsWith('9')) return `0${d}`
  if (d.length === 11 && d.startsWith('09')) return d
  return null
}
