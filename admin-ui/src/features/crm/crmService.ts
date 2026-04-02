import type { Lead, LeadActivity, LeadStatus } from './types'
import * as local from './crmStorage'
import * as remote from './crmApi'

function useRemote(): boolean {
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
    const results = await Promise.all(
      ids.map((id) =>
        remote.remotePatchLead(id, { status }).then(
          () => 1,
          () => 0
        )
      )
    )
    return results.reduce((a, b) => a + b, 0)
  }
  return local.bulkUpdateLeadStatus(ids, status)
}

export async function createLeadRecord(data: {
  full_name: string
  mobile: string
  need_type: 'RENT' | 'BUY' | 'SELL'
  notes: string
  assigned_to: string | null
}): Promise<Lead> {
  const base = {
    ...data,
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
