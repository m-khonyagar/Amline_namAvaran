import type { CrmStats, Lead, LeadActivity, LeadStatus, LeadTask } from './types'
import * as local from './crmStorage'
import * as remote from './crmApi'

function isCrmRemoteApiEnabled(): boolean {
  if (import.meta.env.MODE === 'test') return true
  return import.meta.env.VITE_USE_CRM_API === 'true'
}

export async function loadLeads(): Promise<Lead[]> {
  if (isCrmRemoteApiEnabled()) return remote.remoteListLeads()
  return local.getLeads()
}

export async function loadLead(id: string): Promise<Lead | null> {
  if (isCrmRemoteApiEnabled()) return remote.remoteGetLead(id)
  return local.getLeads().find((l) => l.id === id) ?? null
}

export async function saveLeadStatus(
  id: string,
  status: LeadStatus
): Promise<Lead | null> {
  if (isCrmRemoteApiEnabled()) {
    return remote.remotePatchLead(id, { status })
  }
  return local.updateLeadStatus(id, status)
}

export async function bulkSaveLeadStatus(ids: string[], status: LeadStatus): Promise<number> {
  if (ids.length === 0) return 0
  if (isCrmRemoteApiEnabled()) {
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
  if (isCrmRemoteApiEnabled()) {
    return remote.remoteCreateLead(base)
  }
  return Promise.resolve(local.createLead(base))
}

export async function updateLeadRecord(
  id: string,
  updates: Partial<Omit<Lead, 'id' | 'created_at'>>
): Promise<Lead | null> {
  if (isCrmRemoteApiEnabled()) {
    return remote.remotePatchLead(id, updates)
  }
  return local.updateLead(id, updates)
}

export async function loadActivities(leadId: string): Promise<LeadActivity[]> {
  if (isCrmRemoteApiEnabled()) return remote.remoteListActivities(leadId)
  return local.getActivities(leadId)
}

export async function addLeadActivityRecord(
  data: Omit<LeadActivity, 'id' | 'created_at'>
): Promise<LeadActivity> {
  if (isCrmRemoteApiEnabled()) {
    return remote.remoteAddActivity(data.lead_id, data)
  }
  return Promise.resolve(local.addActivity(data))
}

const TASKS_STORAGE_KEY = 'amline_crm_tasks_v1'

function readTaskMap(): Record<string, LeadTask[]> {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(TASKS_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, LeadTask[]>) : {}
  } catch {
    return {}
  }
}

function writeTaskMap(m: Record<string, LeadTask[]>) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(m))
}

function newTaskId(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  return `t_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

/** آمار CRM از روی لیست لیدها (بدون endpoint جداگانه) */
export async function loadStats(): Promise<CrmStats> {
  const leads = await loadLeads()
  const total = leads.length
  const contracted = leads.filter((l) => l.status === 'CONTRACTED').length
  const lost = leads.filter((l) => l.status === 'LOST').length
  const active = leads.filter((l) => l.status !== 'LOST' && l.status !== 'CONTRACTED').length
  const now = new Date()
  const leads_this_month = leads.filter((l) => {
    const d = new Date(l.created_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length
  const conversion_rate = total > 0 ? Math.round((contracted / total) * 100) : 0
  return {
    active_leads: active,
    contracted_leads: contracted,
    total_leads: total,
    conversion_rate,
    leads_this_month,
    lost_leads: lost,
  }
}

/** وظایف لید — فعلاً فقط سمت کلاینت (localStorage) تا API تسک آماده شود */
export async function loadTasks(leadId: string): Promise<LeadTask[]> {
  const all = readTaskMap()
  return all[leadId] ?? []
}

export async function createTask(
  leadId: string,
  data: Omit<LeadTask, 'id' | 'created_at'>
): Promise<LeadTask> {
  const all = readTaskMap()
  const list = all[leadId] ?? []
  const task: LeadTask = {
    ...data,
    id: newTaskId(),
    created_at: new Date().toISOString(),
  }
  all[leadId] = [...list, task]
  writeTaskMap(all)
  return task
}

export async function updateTask(
  leadId: string,
  taskId: string,
  patch: Partial<Pick<LeadTask, 'done' | 'title' | 'due_date'>>
): Promise<LeadTask> {
  const all = readTaskMap()
  const list = all[leadId] ?? []
  const idx = list.findIndex((t) => t.id === taskId)
  if (idx < 0) throw new Error('task_not_found')
  const updated = { ...list[idx], ...patch }
  const next = [...list]
  next[idx] = updated
  all[leadId] = next
  writeTaskMap(all)
  return updated
}

export async function deleteTask(leadId: string, taskId: string): Promise<void> {
  const all = readTaskMap()
  const list = all[leadId] ?? []
  all[leadId] = list.filter((t) => t.id !== taskId)
  writeTaskMap(all)
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
