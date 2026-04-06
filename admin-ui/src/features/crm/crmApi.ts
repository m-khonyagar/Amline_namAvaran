import { apiClient } from '@/lib/api'
import type { Lead, LeadActivity, LeadTask, CrmStats, ConversionReport } from './types'

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

export async function remoteDeleteLead(id: string): Promise<void> {
  await apiClient.delete(`/admin/crm/leads/${id}`)
}

export async function remoteListTasks(leadId: string): Promise<LeadTask[]> {
  const { data } = await apiClient.get<LeadTask[]>(`/admin/crm/leads/${leadId}/tasks`)
  return Array.isArray(data) ? data : []
}

export async function remoteCreateTask(
  leadId: string,
  payload: Omit<LeadTask, 'id' | 'created_at'>
): Promise<LeadTask> {
  const { data } = await apiClient.post<LeadTask>(`/admin/crm/leads/${leadId}/tasks`, payload)
  return data
}

export async function remotePatchTask(
  leadId: string,
  taskId: string,
  patch: Partial<LeadTask>
): Promise<LeadTask> {
  const { data } = await apiClient.patch<LeadTask>(
    `/admin/crm/leads/${leadId}/tasks/${taskId}`,
    patch
  )
  return data
}

export async function remoteDeleteTask(leadId: string, taskId: string): Promise<void> {
  await apiClient.delete(`/admin/crm/leads/${leadId}/tasks/${taskId}`)
}

export async function remoteGetStats(): Promise<CrmStats> {
  const { data } = await apiClient.get<CrmStats>('/admin/crm/stats')
  return data
}

export async function remoteGetConversionReport(
  params?: { from_date?: string; to_date?: string }
): Promise<ConversionReport> {
  const { data } = await apiClient.get<ConversionReport>('/admin/crm/reports/conversion', {
    params,
  })
  return data
}
