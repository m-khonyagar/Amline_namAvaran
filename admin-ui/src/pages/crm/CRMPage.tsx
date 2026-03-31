import { CRMDashboard } from '../../features/crm/components/CRMDashboard'
import { KanbanBoard } from '../../features/crm/components/KanbanBoard'

export default function CRMPage() {
  return (
    <div dir="rtl" className="p-6 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">مدیریت ارتباط با مشتری (CRM)</h1>
      <CRMDashboard />
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-800">تابلوی Kanban</h2>
        <KanbanBoard />
      </div>
    </div>
  )
}
