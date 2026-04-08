import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { apiClient } from '../../lib/api'
import { apiV1 } from '../../lib/apiPaths'

interface UserDetail {
  id: string
  mobile: string
  full_name?: string
  national_id?: string
  email?: string
  role: string
  wallet_balance?: number
  created_at: string
  profile?: { avatar?: string; birth_date?: string }
}

interface ContractListItem {
  id: string
  type: string
  status: string
  created_at: string
}

interface ContractsListResponse {
  items: ContractListItem[]
  total: number
  page: number
  limit: number
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'مدیر', user: 'کاربر', realtor: 'مشاور', accountant: 'حسابدار',
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'فعال', DRAFT: 'پیش‌نویس', COMPLETED: 'تکمیل شده',
  REVOKED: 'فسخ شده', PENDING_ADMIN_APPROVAL: 'در انتظار تأیید',
}

const TYPE_LABELS: Record<string, string> = {
  PROPERTY_RENT: 'رهن و اجاره', BUYING_AND_SELLING: 'خرید و فروش',
}

const mockActivities = [
  { id: '1', type: 'LOGIN', description: 'ورود به سیستم', created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: '2', type: 'CONTRACT_START', description: 'شروع قرارداد جدید', created_at: new Date(Date.now() - 172800000).toISOString() },
  { id: '3', type: 'CONTRACT_SIGN', description: 'امضای قرارداد', created_at: new Date(Date.now() - 259200000).toISOString() },
  { id: '4', type: 'LOGIN', description: 'ورود به سیستم', created_at: new Date(Date.now() - 345600000).toISOString() },
]

const activityChartData = [
  { name: 'فروردین', count: 2 }, { name: 'اردیبهشت', count: 5 },
  { name: 'خرداد', count: 3 }, { name: 'تیر', count: 7 },
  { name: 'مرداد', count: 4 }, { name: 'شهریور', count: 6 },
]

const ACTIVITY_ICONS: Record<string, string> = {
  LOGIN: '🔑', CONTRACT_START: '📄', CONTRACT_SIGN: '✍️', CHAT: '💬', PAYMENT: '💳',
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: user, isLoading, isError } = useQuery<UserDetail>({
    queryKey: ['user', id],
    queryFn: async () => {
      const res = await apiClient.get<UserDetail>(apiV1(`admin/users/${id}`))
      return res.data
    },
    enabled: !!id,
  })

  const { data: contractsData } = useQuery<ContractsListResponse>({
    queryKey: ['user-contracts', id],
    queryFn: async () => {
      const res = await apiClient.get<ContractsListResponse>(apiV1('contracts/list'), {
        params: { user_id: id, limit: 10 },
      })
      return res.data
    },
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  if (isError || !user) {
    return (
      <div dir="rtl" className="p-6">
        <div className="rounded-lg bg-red-50 p-4 text-red-700">خطا در دریافت اطلاعات کاربر</div>
      </div>
    )
  }

  const contracts = contractsData?.items ?? []

  return (
    <div dir="rtl" className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => navigate('/users')} className="text-sm text-gray-500 hover:text-gray-700">
          ← بازگشت
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{user.full_name ?? user.mobile}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">اطلاعات پروفایل</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500">نام کامل</dt>
                <dd className="mt-1 font-medium">{user.full_name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">موبایل</dt>
                <dd className="mt-1 font-mono">{user.mobile}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">نقش</dt>
                <dd className="mt-1">
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {ROLE_LABELS[user.role] ?? user.role}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">تاریخ عضویت</dt>
                <dd className="mt-1 text-sm">{new Date(user.created_at).toLocaleDateString('fa-IR')}</dd>
              </div>
              {user.email && (
                <div>
                  <dt className="text-sm text-gray-500">ایمیل</dt>
                  <dd className="mt-1 text-sm">{user.email}</dd>
                </div>
              )}
              {user.national_id && (
                <div>
                  <dt className="text-sm text-gray-500">کد ملی</dt>
                  <dd className="mt-1 font-mono text-sm">{user.national_id}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm text-center">
              <div className="text-3xl font-bold text-blue-600">{contracts.length}</div>
              <div className="mt-1 text-sm text-gray-500">تعداد قراردادها</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm text-center">
              <div className="text-2xl font-bold text-green-600">
                {user.wallet_balance != null ? user.wallet_balance.toLocaleString('fa-IR') : '—'}
              </div>
              <div className="mt-1 text-sm text-gray-500">موجودی کیف پول (ریال)</div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">نمودار فعالیت</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={activityChartData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {contracts.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">قراردادها</h2>
              <div className="space-y-2">
                {contracts.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{TYPE_LABELS[c.type] ?? c.type}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {STATUS_LABELS[c.status] ?? c.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">
                        {new Date(c.created_at).toLocaleDateString('fa-IR')}
                      </span>
                      <button
                        onClick={() => navigate(`/contracts/${c.id}`)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        مشاهده
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">تایم‌لاین فعالیت</h2>
            <div className="space-y-4">
              {mockActivities.map((activity, idx) => (
                <div key={activity.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-sm">
                      {ACTIVITY_ICONS[activity.type] ?? '📌'}
                    </div>
                    {idx < mockActivities.length - 1 && (
                      <div className="mt-1 h-8 w-px bg-gray-200" />
                    )}
                  </div>
                  <div className="pb-2">
                    <p className="text-sm font-medium text-gray-800">{activity.description}</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {new Date(activity.created_at).toLocaleDateString('fa-IR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
