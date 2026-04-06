import axios from 'axios'
import { toast } from 'sonner'
import type { Lead, LeadActivity, LeadStatus, LeadTask, CrmStats, ConversionReport } from './types'
import * as remote from './crmApi'

// ---- Error handling helper ----

function handleError(err: unknown): never {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status
    if (status === 401) {
      window.location.href = '/login'
    } else if (status === 403) {
      toast.error('دسترسی غیرمجاز')
    } else if (status === 404) {
      toast.error('مورد درخواست‌شده یافت نشد')
    } else if (status === 500) {
      toast.error('خطای سرور — لطفاً دوباره تلاش کنید')
    } else {
      toast.error('خطای شبکه — اتصال اینترنت را بررسی کنید')
    }
  } else {
    toast.error('خطای شبکه — اتصال اینترنت را بررسی کنید')
  }
  throw err
}

// ---- Leads ----

export async function loadLeads(): Promise<Lead[]> {
  try {
    return await remote.remoteListLeads()
  } catch (err) {
    return handleError(err)
  }
}

export async function loadLead(id: string): Promise<Lead | null> {
  try {
    return await remote.remoteGetLead(id)
  } catch (err) {
    return handleError(err)
  }
}

export async function saveLeadStatus(id: string, status: LeadStatus): Promise<Lead | null> {
  try {
    return await remote.remotePatchLead(id, { status })
  } catch (err) {
    return handleError(err)
  }
}

export async function bulkSaveLeadStatus(ids: string[], status: LeadStatus): Promise<number> {
  if (ids.length === 0) return 0
  try {
    const results = await Promise.all(
      ids.map((id) =>
        remote.remotePatchLead(id, { status }).then(
          () => 1 as number,
          () => 0 as number
        )
      )
    )
    return results.reduce((a, b) => a + b, 0)
  } catch (err) {
    return handleError(err)
  }
}

export async function createLeadRecord(data: {
  full_name: string
  mobile: string
  need_type: 'RENT' | 'BUY' | 'SELL'
  notes: string
  assigned_to: string | null
}): Promise<Lead> {
  try {
    return await remote.remoteCreateLead({ ...data, status: 'NEW', contract_id: null })
  } catch (err) {
    return handleError(err)
  }
}

export async function updateLeadRecord(
  id: string,
  updates: Partial<Omit<Lead, 'id' | 'created_at'>>
): Promise<Lead | null> {
  try {
    return await remote.remotePatchLead(id, updates)
  } catch (err) {
    return handleError(err)
  }
}

export async function deleteLead(id: string): Promise<void> {
  try {
    return await remote.remoteDeleteLead(id)
  } catch (err) {
    return handleError(err)
  }
}

// ---- Activities ----

export async function loadActivities(leadId: string): Promise<LeadActivity[]> {
  try {
    return await remote.remoteListActivities(leadId)
  } catch (err) {
    return handleError(err)
  }
}

export async function addLeadActivityRecord(
  data: Omit<LeadActivity, 'id' | 'created_at'>
): Promise<LeadActivity> {
  try {
    return await remote.remoteAddActivity(data.lead_id, data)
  } catch (err) {
    return handleError(err)
  }
}

// ---- Tasks ----

export async function loadTasks(leadId: string): Promise<LeadTask[]> {
  try {
    return await remote.remoteListTasks(leadId)
  } catch (err) {
    return handleError(err)
  }
}

export async function createTask(
  leadId: string,
  data: Omit<LeadTask, 'id' | 'created_at'>
): Promise<LeadTask> {
  try {
    return await remote.remoteCreateTask(leadId, data)
  } catch (err) {
    return handleError(err)
  }
}

export async function updateTask(
  leadId: string,
  taskId: string,
  patch: Partial<LeadTask>
): Promise<LeadTask> {
  try {
    return await remote.remotePatchTask(leadId, taskId, patch)
  } catch (err) {
    return handleError(err)
  }
}

export async function deleteTask(leadId: string, taskId: string): Promise<void> {
  try {
    return await remote.remoteDeleteTask(leadId, taskId)
  } catch (err) {
    return handleError(err)
  }
}

// ---- Stats & Reports ----

export async function loadStats(): Promise<CrmStats> {
  try {
    return await remote.remoteGetStats()
  } catch (err) {
    return handleError(err)
  }
}

export async function loadConversionReport(
  params?: { from_date?: string; to_date?: string }
): Promise<ConversionReport> {
  try {
    return await remote.remoteGetConversionReport(params)
  } catch (err) {
    return handleError(err)
  }
}

// ---- Migration ----

const LEADS_KEY = 'amline_crm_leads'
const ACTIVITIES_KEY = 'amline_crm_activities'

export async function migrateLocalStorageToApi(): Promise<void> {
  try {
    const leadsRaw = localStorage.getItem(LEADS_KEY)
    const activitiesRaw = localStorage.getItem(ACTIVITIES_KEY)

    const leads: Lead[] = leadsRaw ? (JSON.parse(leadsRaw) as Lead[]) : []
    const activities: LeadActivity[] = activitiesRaw
      ? (JSON.parse(activitiesRaw) as LeadActivity[])
      : []

    // Migrate leads
    for (const lead of leads) {
      try {
        await remote.remoteCreateLead({
          full_name: lead.full_name,
          mobile: lead.mobile,
          need_type: lead.need_type,
          status: lead.status,
          notes: lead.notes,
          assigned_to: lead.assigned_to,
          contract_id: lead.contract_id,
        })
      } catch {
        // skip individual failures
      }
    }

    // Migrate activities
    for (const activity of activities) {
      try {
        await remote.remoteAddActivity(activity.lead_id, {
          lead_id: activity.lead_id,
          type: activity.type,
          content: activity.content,
          created_by: activity.created_by,
        })
      } catch {
        // skip individual failures
      }
    }

    // Clear localStorage
    localStorage.removeItem(LEADS_KEY)
    localStorage.removeItem(ACTIVITIES_KEY)
  } catch (err) {
    toast.error('خطا در انتقال داده‌ها به سرور')
    throw err
  }
}
