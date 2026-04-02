import { useState, useEffect, type ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowRight,
  ShieldCheck,
  ShieldOff,
  History,
  Wallet,
  CreditCard,
  MessageSquarePlus,
  FileText,
  User,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { apiClient } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'
import { formatShamsiDate, formatShamsiDateTime } from '../../lib/persianDateTime'

type TabId = 'overview' | 'auth' | 'timeline' | 'wallet' | 'tickets' | 'contracts'

interface UserDetail {
  id: string
  mobile: string
  full_name: string | null
  national_code: string | null
  email: string | null
  role: string
  is_active: boolean
  created_at: string
  last_login: string | null
  verification_status: string
  verified_at: string | null
  verified_by_name: string | null
  verification_note: string | null
  wallet_balance: number
  credit_limit: number
  internal_notes: string
  tags: string[]
  address: string | null
  birth_date: string | null
  gender: string | null
  source: string
  profile?: { avatar?: string; birth_date?: string; address?: string; gender?: string | null }
}

interface TimelineEvent {
  id: string
  type: string
  title: string
  detail: string | null
  created_at: string
}

interface PaymentRow {
  id: string
  amount: number
  currency: string
  status: string
  description: string
  reference: string | null
  created_at: string
}

interface LedgerRow {
  id: string
  delta: number
  balance_after: number
  reason: string
  created_at: string
}

interface TicketRow {
  id: string
  subject: string
  body: string
  status: string
  priority: string
  assigned_to_name: string | null
  referred_to_name: string | null
  created_at: string
  updated_at: string
}

interface StaffOpt {
  id: string
  name: string
  title: string
}

interface ContractListItem {
  id: string
  type: string
  status: string
  created_at: string
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'مدیر',
  user: 'کاربر',
  realtor: 'مشاور',
  accountant: 'حسابدار',
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'فعال',
  DRAFT: 'پیش‌نویس',
  COMPLETED: 'تکمیل شده',
  REVOKED: 'فسخ شده',
  PENDING_ADMIN_APPROVAL: 'در انتظار تأیید',
}

const TYPE_LABELS: Record<string, string> = {
  PROPERTY_RENT: 'رهن و اجاره',
  BUYING_AND_SELLING: 'خرید و فروش',
}

const VERIFY_LABELS: Record<string, string> = {
  PENDING: 'در انتظار',
  VERIFIED: 'تأیید شده',
  REJECTED: 'رد شده',
  MANUAL_REVIEW: 'نیاز به بررسی دستی',
}

const TIMELINE_ICONS: Record<string, string> = {
  LOGIN: '🔑',
  CALL_OUTBOUND: '📞➜',
  CALL_INBOUND: '📞⬅',
  SMS: '💬',
  CHAT: '💭',
  CONTRACT: '📄',
  PAYMENT: '💳',
  TICKET: '🎫',
  NOTE: '📝',
  VERIFICATION: '🛡️',
}

const TICKET_STATUS: Record<string, string> = {
  OPEN: 'باز',
  IN_PROGRESS: 'در حال پیگیری',
  WAITING_USER: 'منتظر کاربر',
  RESOLVED: 'حل‌شده',
  REFERRED: 'ارجاع‌شده',
}

const activityTrend = [
  { m: '۱', v: 2 },
  { m: '۲', v: 4 },
  { m: '۳', v: 3 },
  { m: '۴', v: 6 },
  { m: '۵', v: 5 },
  { m: '۶', v: 8 },
]

function fmtMoney(n: number) {
  return new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 }).format(n)
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission('users:write')
  const [tab, setTab] = useState<TabId>('overview')
  const [editNote, setEditNote] = useState('')
  const [ticketSubject, setTicketSubject] = useState('')
  const [ticketBody, setTicketBody] = useState('')
  const [ticketPriority, setTicketPriority] = useState('NORMAL')
  const [verifyNote, setVerifyNote] = useState('')
  const [tagsInput, setTagsInput] = useState('')

  const { data: user, isLoading, isError } = useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      const res = await apiClient.get<UserDetail>(`/admin/users/${id}`)
      return res.data
    },
    enabled: !!id,
  })

  useEffect(() => {
    if (!user) return
    setEditNote(user.internal_notes ?? '')
    setTagsInput(user.tags?.length ? user.tags.join('، ') : '')
  }, [user?.id, user?.internal_notes, user?.tags?.join('،')])

  const { data: timeline } = useQuery({
    queryKey: ['user-timeline', id],
    queryFn: async () => {
      const res = await apiClient.get<{ items: TimelineEvent[] }>(`/admin/users/${id}/timeline`)
      return res.data.items
    },
    enabled: !!id,
  })

  const { data: payments } = useQuery({
    queryKey: ['user-payments', id],
    queryFn: async () => {
      const res = await apiClient.get<{ items: PaymentRow[] }>(`/admin/users/${id}/payments`)
      return res.data.items
    },
    enabled: !!id,
  })

  const { data: ledger } = useQuery({
    queryKey: ['user-ledger', id],
    queryFn: async () => {
      const res = await apiClient.get<{ items: LedgerRow[] }>(`/admin/users/${id}/wallet/ledger`)
      return res.data.items
    },
    enabled: !!id,
  })

  const { data: tickets } = useQuery({
    queryKey: ['user-tickets', id],
    queryFn: async () => {
      const res = await apiClient.get<{ items: TicketRow[] }>(`/admin/users/${id}/tickets`)
      return res.data.items
    },
    enabled: !!id,
  })

  const { data: staff } = useQuery({
    queryKey: ['admin-staff-options'],
    queryFn: async () => {
      const res = await apiClient.get<{ items: StaffOpt[] }>('/admin/staff/options')
      return res.data.items
    },
  })

  const { data: contracts } = useQuery({
    queryKey: ['user-contracts', id],
    queryFn: async () => {
      const res = await apiClient.get<unknown>('/contracts/list', {
        params: { user_id: id, limit: 50 },
      })
      const d = res.data
      if (Array.isArray(d))
        return { items: d as ContractListItem[], total: (d as ContractListItem[]).length }
      const obj = d as { items?: ContractListItem[]; total?: number }
      return { items: obj.items ?? [], total: obj.total ?? 0 }
    },
    enabled: !!id,
  })

  const patchUser = useMutation({
    mutationFn: async (body: Partial<UserDetail> & { tags?: string[] }) => {
      const res = await apiClient.patch<UserDetail>(`/admin/users/${id}`, body)
      return res.data
    },
    onSuccess: () => {
      toast.success('ذخیره شد')
      void qc.invalidateQueries({ queryKey: ['user', id] })
      void qc.invalidateQueries({ queryKey: ['users'] })
    },
    onError: () => toast.error('خطا در ذخیره'),
  })

  const verifyMut = useMutation({
    mutationFn: async (payload: { action: 'approve' | 'reject' | 'reset'; note?: string }) => {
      const res = await apiClient.post<UserDetail>(`/admin/users/${id}/verification`, {
        ...payload,
        staff_name: 'کارشناس پنل',
      })
      return res.data
    },
    onSuccess: () => {
      toast.success('وضعیت احراز به‌روز شد')
      void qc.invalidateQueries({ queryKey: ['user', id] })
      void qc.invalidateQueries({ queryKey: ['user-timeline', id] })
      void qc.invalidateQueries({ queryKey: ['users'] })
      void qc.invalidateQueries({ queryKey: ['admin-analytics-users'] })
      setVerifyNote('')
    },
    onError: () => toast.error('عملیات ناموفق'),
  })

  const createTicket = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(`/admin/users/${id}/tickets`, {
        subject: ticketSubject,
        body: ticketBody,
        priority: ticketPriority,
      })
      return res.data
    },
    onSuccess: () => {
      toast.success('تیکت ثبت شد')
      setTicketSubject('')
      setTicketBody('')
      void qc.invalidateQueries({ queryKey: ['user-tickets', id] })
      void qc.invalidateQueries({ queryKey: ['admin-analytics-users'] })
    },
    onError: () => toast.error('ثبت تیکت ناموفق'),
  })

  const patchTicket = useMutation({
    mutationFn: async ({
      ticketId,
      body,
    }: {
      ticketId: string
      body: Record<string, unknown>
    }) => {
      await apiClient.patch(`/admin/users/${id}/tickets/${ticketId}`, body)
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['user-tickets', id] }),
  })

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center" role="status" aria-label="در حال بارگذاری">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  if (isError || !user) {
    return (
      <div dir="rtl" className="p-6">
        <div className="rounded-xl bg-red-50 p-4 text-red-800 dark:bg-red-950/40 dark:text-red-200">
          خطا در دریافت اطلاعات کاربر
        </div>
      </div>
    )
  }

  const tabs: { id: TabId; label: string; icon: ReactNode }[] = [
    { id: 'overview', label: 'پروفایل', icon: <User className="h-4 w-4" /> },
    { id: 'auth', label: 'احراز و امنیت', icon: <ShieldCheck className="h-4 w-4" /> },
    { id: 'timeline', label: 'سوابق املاین', icon: <History className="h-4 w-4" /> },
    { id: 'wallet', label: 'کیف و پرداخت', icon: <Wallet className="h-4 w-4" /> },
    { id: 'tickets', label: 'تیکت و ارجاع', icon: <MessageSquarePlus className="h-4 w-4" /> },
    { id: 'contracts', label: 'قراردادها', icon: <FileText className="h-4 w-4" /> },
  ]

  const contractItems = contracts?.items ?? []

  return (
    <div dir="rtl" className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate('/users')}
            className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
            aria-label="بازگشت به لیست کاربران"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              {user.full_name ?? user.mobile}
            </h1>
            <p className="mt-1 font-mono text-sm text-slate-500">{user.mobile}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-indigo-100 px-3 py-0.5 text-xs font-medium text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200">
                {ROLE_LABELS[user.role] ?? user.role}
              </span>
              <span
                className={`rounded-full px-3 py-0.5 text-xs font-medium ${
                  user.is_active
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                    : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                }`}
              >
                {user.is_active ? 'حساب فعال' : 'غیرفعال'}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                منبع: {user.source}
              </span>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-white p-4 dark:border-slate-700 dark:from-indigo-950/30 dark:to-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400">موجودی / سقف اعتبار</p>
          <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {fmtMoney(user.wallet_balance)} <span className="text-sm font-normal text-slate-500">ریال</span>
          </p>
          <p className="text-xs text-slate-500">سقف: {fmtMoney(user.credit_limit)} ریال</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2 dark:border-slate-700">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
              tab === t.id
                ? 'bg-slate-900 text-white shadow-lg dark:bg-indigo-600'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">اطلاعات هویتی</h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-slate-500">نام کامل</dt>
                  <dd className="mt-1 font-medium text-slate-900 dark:text-slate-100">{user.full_name ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">کد ملی</dt>
                  <dd className="mt-1 font-mono">{user.national_code ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">ایمیل</dt>
                  <dd className="mt-1">{user.email ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">تاریخ تولد</dt>
                  <dd className="mt-1">{user.birth_date ?? user.profile?.birth_date ?? '—'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-slate-500">آدرس</dt>
                  <dd className="mt-1">{user.address ?? user.profile?.address ?? '—'}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">یادداشت داخلی و برچسب</h2>
              {canWrite ? (
                <>
                  <textarea
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    rows={4}
                    className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                    placeholder="یادداشت فقط برای تیم داخلی…"
                  />
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                    placeholder="برچسب‌ها با ویرگول"
                  />
                  <button
                    type="button"
                    disabled={patchUser.isPending}
                    onClick={() => {
                      const tags = tagsInput
                        .split(/[,،]/)
                        .map((s) => s.trim())
                        .filter(Boolean)
                      patchUser.mutate({
                        internal_notes: editNote,
                        tags,
                      })
                    }}
                    className="mt-3 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    ذخیره یادداشت و برچسب
                  </button>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{user.internal_notes || '—'}</p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">روند تعامل (نمونه)</h3>
              <div className="mt-3 h-40" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activityTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                    <XAxis dataKey="m" tick={{ fontSize: 10 }} />
                    <YAxis width={24} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="v" stroke="#6366f1" fill="#a5b4fc" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
              <h3 className="text-sm font-semibold">خلاصه</h3>
              <ul className="mt-2 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li>عضویت: {formatShamsiDate(user.created_at)}</li>
                <li>آخرین ورود: {user.last_login ? formatShamsiDateTime(user.last_login) : '—'}</li>
                <li>قراردادها: {contractItems.length}</li>
                <li>پرداخت‌ها: {payments?.length ?? 0}</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {tab === 'auth' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-lg font-semibold">وضعیت احراز هویت</h2>
            <p className="mt-2 text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {VERIFY_LABELS[user.verification_status] ?? user.verification_status}
            </p>
            {user.verified_at && (
              <p className="mt-2 text-sm text-slate-500">
                {user.verified_by_name && <>توسط {user.verified_by_name} — </>}
                {formatShamsiDateTime(user.verified_at)}
              </p>
            )}
            {user.verification_note && (
              <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800">{user.verification_note}</p>
            )}
            {canWrite ? (
              <div className="mt-6 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <label className="block text-sm font-medium">یادداشت احراز (اختیاری)</label>
                <textarea
                  value={verifyNote}
                  onChange={(e) => setVerifyNote(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={verifyMut.isPending}
                    onClick={() => verifyMut.mutate({ action: 'approve', note: verifyNote })}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    تأیید دستی
                  </button>
                  <button
                    type="button"
                    disabled={verifyMut.isPending}
                    onClick={() => verifyMut.mutate({ action: 'reject', note: verifyNote })}
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                  >
                    <ShieldOff className="h-4 w-4" />
                    رد احراز
                  </button>
                  <button
                    type="button"
                    disabled={verifyMut.isPending}
                    onClick={() => verifyMut.mutate({ action: 'reset', note: verifyNote })}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm dark:border-slate-600"
                  >
                    بازنشانی به در انتظار
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">فقط با مجوز users:write می‌توان احراز را تغییر داد.</p>
            )}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 dark:border-slate-700 dark:from-slate-900 dark:to-slate-900/80">
            <h2 className="text-lg font-semibold">راهنما</h2>
            <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>تأیید دستی پس از بررسی مدارک یا تماس تأییدی انجام شود.</li>
              <li>هر تغییر در تایم‌لاین کاربر ثبت می‌شود.</li>
              <li>در production باید با API واقعی و لاگ ممیزی هماهنگ باشد.</li>
            </ul>
          </div>
        </div>
      )}

      {tab === 'timeline' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">سوابق فعالیت در املاین</h2>
          <p className="mt-1 text-sm text-slate-500">تماس، پیام، چت، قرارداد، پرداخت و رویدادهای احراز</p>
          <ul className="mt-6 space-y-4">
            {(timeline ?? []).map((ev, i) => (
              <li key={ev.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-lg dark:bg-slate-800">
                    {TIMELINE_ICONS[ev.type] ?? '📌'}
                  </span>
                  {i < (timeline ?? []).length - 1 ? (
                    <span className="mt-1 min-h-[2rem] w-px grow bg-slate-200 dark:bg-slate-700" />
                  ) : null}
                </div>
                <div className="pb-4">
                  <p className="font-medium text-slate-900 dark:text-slate-100">{ev.title}</p>
                  {ev.detail ? <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{ev.detail}</p> : null}
                  <p className="mt-1 text-xs text-slate-400">
                    {formatShamsiDateTime(ev.created_at)} · {ev.type}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          {(timeline ?? []).length === 0 ? (
            <p className="mt-6 text-center text-slate-500">رویدادی ثبت نشده است.</p>
          ) : null}
        </div>
      )}

      {tab === 'wallet' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <CreditCard className="h-5 w-5 text-indigo-500" />
              پرداخت‌ها
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-right text-slate-500 dark:border-slate-700">
                    <th className="pb-2">مبلغ</th>
                    <th className="pb-2">وضعیت</th>
                    <th className="pb-2">شرح</th>
                    <th className="pb-2">تاریخ</th>
                  </tr>
                </thead>
                <tbody>
                  {(payments ?? []).map((p) => (
                    <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2 tabular-nums font-medium">{fmtMoney(p.amount)}</td>
                      <td className="py-2">{p.status === 'PAID' ? 'پرداخت‌شده' : p.status === 'PENDING' ? 'در انتظار' : p.status}</td>
                      <td className="py-2 text-slate-600 dark:text-slate-400">{p.description}</td>
                      <td className="py-2 text-xs text-slate-500">
                        {formatShamsiDate(p.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(payments ?? []).length === 0 ? <p className="mt-4 text-slate-500">پرداختی نیست.</p> : null}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Wallet className="h-5 w-5 text-emerald-500" />
              تراکنش‌های کیف پول
            </div>
            <div className="mt-4 space-y-3">
              {(ledger ?? []).map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 dark:border-slate-800"
                >
                  <div>
                    <p className="text-sm font-medium">{l.reason}</p>
                    <p className="text-xs text-slate-500">{formatShamsiDateTime(l.created_at)}</p>
                  </div>
                  <div className="text-left">
                    <span className={l.delta >= 0 ? 'font-semibold text-emerald-600' : 'font-semibold text-red-600'}>
                      {l.delta >= 0 ? '+' : ''}
                      {fmtMoney(l.delta)}
                    </span>
                    <p className="text-xs text-slate-400">مانده {fmtMoney(l.balance_after)}</p>
                  </div>
                </div>
              ))}
            </div>
            {(ledger ?? []).length === 0 ? <p className="mt-4 text-slate-500">تراکنشی نیست.</p> : null}
          </div>
        </div>
      )}

      {tab === 'tickets' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-lg font-semibold">تیکت جدید</h2>
            {canWrite ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  placeholder="موضوع"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 sm:col-span-2"
                />
                <textarea
                  value={ticketBody}
                  onChange={(e) => setTicketBody(e.target.value)}
                  placeholder="شرح درخواست"
                  rows={3}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 sm:col-span-2"
                />
                <select
                  aria-label="اولویت تیکت"
                  value={ticketPriority}
                  onChange={(e) => setTicketPriority(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                >
                  <option value="LOW">کم</option>
                  <option value="NORMAL">عادی</option>
                  <option value="HIGH">بالا</option>
                  <option value="URGENT">فوری</option>
                </select>
                <button
                  type="button"
                  disabled={createTicket.isPending || !ticketSubject.trim()}
                  onClick={() => createTicket.mutate()}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  ثبت تیکت
                </button>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">بدون مجوز ویرایش نمی‌توانید تیکت بسازید.</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-lg font-semibold">تیکت‌ها و ارجاع</h2>
            <ul className="mt-4 space-y-4">
              {(tickets ?? []).map((tk) => (
                <li key={tk.id} className="rounded-xl border border-slate-100 p-4 dark:border-slate-800">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{tk.subject}</p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{tk.body}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">
                      {TICKET_STATUS[tk.status] ?? tk.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    مسئول: {tk.assigned_to_name ?? 'تخصیص نخورده'}
                    {tk.referred_to_name ? ` · ارجاع: ${tk.referred_to_name}` : ''}
                  </p>
                  {canWrite && staff && staff.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <select
                        aria-label={`تخصیص تیکت ${tk.subject}`}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800"
                        defaultValue=""
                        onChange={(e) => {
                          const v = e.target.value
                          e.target.value = ''
                          if (!v) return
                          patchTicket.mutate({ ticketId: tk.id, body: { assigned_to_id: v } })
                        }}
                      >
                        <option value="">تخصیص به…</option>
                        {staff.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} — {s.title}
                          </option>
                        ))}
                      </select>
                      <select
                        aria-label={`ارجاع تیکت ${tk.subject}`}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800"
                        defaultValue=""
                        onChange={(e) => {
                          const v = e.target.value
                          e.target.value = ''
                          if (!v) return
                          patchTicket.mutate({ ticketId: tk.id, body: { refer_to_staff_id: v } })
                        }}
                      >
                        <option value="">ارجاع به کارشناس…</option>
                        {staff.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
            {(tickets ?? []).length === 0 ? <p className="text-slate-500">تیکتی نیست.</p> : null}
          </div>
        </div>
      )}

      {tab === 'contracts' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">قراردادهای مرتبط</h2>
          {contractItems.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {contractItems.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{TYPE_LABELS[c.type] ?? c.type}</span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs dark:bg-slate-900">
                      {STATUS_LABELS[c.status] ?? c.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">
                      {formatShamsiDate(c.created_at)}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate(`/contracts/${c.id}`)}
                      className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      مشاهده
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-slate-500">قراردادی برای این کاربر در mock ثبت نشده.</p>
          )}
        </div>
      )}
    </div>
  )
}
