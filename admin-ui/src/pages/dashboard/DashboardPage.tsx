import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../hooks/useAuth'
import { apiClient } from '../../lib/api'
import { getLeads } from '../../features/crm/crmStorage'

interface ContractsListResponse {
  items: { id: string; created_at: string }[]
  total: number
}

interface UsersListResponse {
  items: { id: string; created_at: string }[]
  total: number
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const today = new Date().toISOString().slice(0, 10)

  const { data: contractsData } = useQuery<ContractsListResponse>({
    queryKey: ['dashboard-contracts'],
    queryFn: async () => {
      const res = await apiClient.get<ContractsListResponse>('/contracts/list', {
        params: { from_date: today, to_date: today, limit: 100 },
      })
      return res.data
    },
  })

  const { data: usersData } = useQuery<UsersListResponse>({
    queryKey: ['dashboard-users'],
    queryFn: async () => {
      const res = await apiClient.get<UsersListResponse>('/admin/users', {
        params: { limit: 100 },
      })
      return res.data
    },
  })

  const leads = getLeads()
  const activeLeads = leads.filter((l) => l.status !== 'LOST' && l.status !== 'CONTRACTED').length

  const todayContracts = contractsData?.items?.filter(
    (c) => c.created_at?.slice(0, 10) === today
  ).length ?? 0

  const startOfWeek = new Date()
  startOfWeek.setDate(startOfWeek.getDate() - 7)
  const newUsers = usersData?.items?.filter(
    (u) => new Date(u.created_at) >= startOfWeek
  ).length ?? 0

  return (
    <div dir="rtl" className="p-6 space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          خوش آمدید{user?.full_name ? `، ${user.full_name}` : ''}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {new Date().toLocaleDateString('fa-IR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
          <p className="text-sm text-blue-600">قراردادهای امروز</p>
          <p className="mt-2 text-3xl font-bold text-blue-700">{todayContracts}</p>
        </div>
        <div className="rounded-xl border border-green-100 bg-green-50 p-5">
          <p className="text-sm text-green-600">کاربران جدید (هفته اخیر)</p>
          <p className="mt-2 text-3xl font-bold text-green-700">{newUsers}</p>
        </div>
        <div className="rounded-xl border border-purple-100 bg-purple-50 p-5">
          <p className="text-sm text-purple-600">Lead های فعال</p>
          <p className="mt-2 text-3xl font-bold text-purple-700">{activeLeads}</p>
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-800">دسترسی سریع</h2>
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/contracts/wizard')}
            className="rounded-xl border-2 border-dashed border-blue-300 p-6 text-center hover:border-blue-400 hover:bg-blue-50"
          >
            <div className="text-3xl mb-2">📄</div>
            <p className="text-sm font-medium text-blue-700">قرارداد جدید</p>
          </button>
          <button
            onClick={() => navigate('/crm')}
            className="rounded-xl border-2 border-dashed border-purple-300 p-6 text-center hover:border-purple-400 hover:bg-purple-50"
          >
            <div className="text-3xl mb-2">🎯</div>
            <p className="text-sm font-medium text-purple-700">مدیریت CRM</p>
          </button>
          <button
            onClick={() => navigate('/users')}
            className="rounded-xl border-2 border-dashed border-green-300 p-6 text-center hover:border-green-400 hover:bg-green-50"
          >
            <div className="text-3xl mb-2">👥</div>
            <p className="text-sm font-medium text-green-700">کاربران</p>
          </button>
        </div>
      </div>
    </div>
  )
}
