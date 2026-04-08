import type { Lead, LeadActivity, LeadStatus, LeadTask, CrmStats } from './types'
import * as local from './crmStorage'
import * as remote from './crmApi'

function useRemote(): boolean {
  if (import.meta.env.MODE === 'test') return true
  return import.meta.env.VITE_USE_CRM_API === 'true'
}

export async function loadLeads(): Promise<Lead[]> {
  if (useRemote()) return remote.remoteListLeads()
  return local.getLeads()
}

export async function loadLead(id: string): Promise<Lead | null> {
  if (useRemote()) return remote.remoteGetLead(id)
  return local.getLeads().find((l) => l.id === id) ?? null
}

export async function saveLeadStatus(
  id: string,
  status: LeadStatus
): Promise<Lead | null> {
  if (useRemote()) {
    return remote.remotePatchLead(id, { status })
  }
  return local.updateLeadStatus(id, status)
}

export async function bulkSaveLeadStatus(ids: string[], status: LeadStatus): Promise<number> {
  if (ids.length === 0) return 0
  if (useRemote()) {
    const results = await Promise.allSettled(
      ids.map((id) => remote.remotePatchLead(id, { status }))
    )
    return results.filter((r) => r.status === 'fulfilled').length
  }
  return local.bulkUpdateLeadStatus(ids, status)
}

export async function createLeadRecord(data: {
  full_name: string
  mobile: string
  need_type: 'RENT' | 'BUY' | 'SELL'
  notes: string
  assigned_to: string | null
  province_id?: string | null
  city_id?: string | null
}): Promise<Lead> {
  const base = {
    ...data,
    province_id: data.province_id ?? null,
    city_id: data.city_id ?? null,
    status: 'NEW' as const,
    contract_id: null,
  }
  if (useRemote()) {
    return remote.remoteCreateLead(base)
  }
  return Promise.resolve(local.createLead(base))
}

export async function updateLeadRecord(
  id: string,
  updates: Partial<Omit<Lead, 'id' | 'created_at'>>
): Promise<Lead | null> {
  if (useRemote()) {
    return remote.remotePatchLead(id, updates)
  }
  return local.updateLead(id, updates)
}

export async function loadActivities(leadId: string): Promise<LeadActivity[]> {
  if (useRemote()) return remote.remoteListActivities(leadId)
  return local.getActivities(leadId)
}

export async function addLeadActivityRecord(
  data: Omit<LeadActivity, 'id' | 'created_at'>
): Promise<LeadActivity> {
  if (useRemote()) {
    return remote.remoteAddActivity(data.lead_id, data)
  }
  return Promise.resolve(local.addActivity(data))
}

export async function loadTasks(leadId: string): Promise<LeadTask[]> {
  return Promise.resolve(local.getTasks(leadId))
}

export async function createTask(
  leadId: string,
  payload: Omit<LeadTask, 'id' | 'created_at'>
): Promise<LeadTask> {
  return Promise.resolve(
    local.addTask({
      ...payload,
      lead_id: leadId,
    })
  )
}

export async function updateTask(
  _leadId: string,
  taskId: string,
  updates: Partial<Omit<LeadTask, 'id' | 'lead_id' | 'created_at'>>
): Promise<LeadTask> {
  const next = local.updateTask(taskId, updates)
  if (!next) throw new Error('task_not_found')
  return next
}

export async function deleteTask(_leadId: string, taskId: string): Promise<void> {
  const ok = local.deleteTask(taskId)
  if (!ok) throw new Error('task_not_found')
}

export async function loadStats(): Promise<CrmStats> {
  const leads = await loadLeads()
  const total = leads.length
  const contracted = leads.filter((l) => l.status === 'CONTRACTED').length
  const lost = leads.filter((l) => l.status === 'LOST').length
  const active = leads.filter((l) => l.status !== 'LOST' && l.status !== 'CONTRACTED').length
  const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const leadsThisMonth = leads.filter((l) => l.created_at >= thisMonthStart).length
  return {
    active_leads: active,
    contracted_leads: contracted,
    total_leads: total,
    conversion_rate: total > 0 ? Math.round((contracted / total) * 100) : 0,
    leads_this_month: leadsThisMonth,
    lost_leads: lost,
  }
}

export async function migrateLocalStorageToApi(): Promise<void> {
  if (typeof localStorage === 'undefined') return
  const raw = localStorage.getItem('amline_crm_leads')
  const rows = raw ? (JSON.parse(raw) as Array<Partial<Lead>>) : []

  for (const row of rows) {
    await remote.remoteCreateLead({
      full_name: row.full_name ?? '',
      mobile: row.mobile ?? '',
      need_type: (row.need_type as Lead['need_type']) ?? 'RENT',
      status: (row.status as LeadStatus) ?? 'NEW',
      assigned_to: row.assigned_to ?? null,
      notes: row.notes ?? '',
      contract_id: row.contract_id ?? null,
      province_id: row.province_id ?? null,
      city_id: row.city_id ?? null,
      province_name_fa: row.province_name_fa ?? null,
      city_name_fa: row.city_name_fa ?? null,
    })
  }

  localStorage.removeItem('amline_crm_leads')
  localStorage.removeItem('amline_crm_activities')
}
