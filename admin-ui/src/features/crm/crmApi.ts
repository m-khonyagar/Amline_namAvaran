import { apiClient } from '@/lib/api'
import type { Lead, LeadActivity } from './types'

export async function remoteListLeads(): Promise<Lead[]> {
  const { data } = await apiClient.get<Lead[]>('/admin/crm/leads')
  return Array.isArray(data) ? data : []
}

export async function remoteGetLead(id: string): Promise<Lead | null> {
  try {
    const { data } = await apiClient.get<Lead>(`/admin/crm/leads/${id}`)
    return data ?? null
  } catch {
    return null
  }
}

export async function remoteCreateLead(
  payload: Omit<Lead, 'id' | 'created_at' | 'updated_at'>
): Promise<Lead> {
  const { data } = await apiClient.post<Lead>('/admin/crm/leads', payload)
  return data
}

export async function remotePatchLead(
  id: string,
  patch: Partial<Lead>
): Promise<Lead> {
  const { data } = await apiClient.patch<Lead>(`/admin/crm/leads/${id}`, patch)
  return data
}

export async function remoteListActivities(leadId: string): Promise<LeadActivity[]> {
  const { data } = await apiClient.get<LeadActivity[]>(
    `/admin/crm/leads/${leadId}/activities`
  )
  return Array.isArray(data) ? data : []
}

export async function remoteAddActivity(
  leadId: string,
  payload: Omit<LeadActivity, 'id' | 'created_at'>
): Promise<LeadActivity> {
  const { data } = await apiClient.post<LeadActivity>(
    `/admin/crm/leads/${leadId}/activities`,
    payload
  )
  return data
}
