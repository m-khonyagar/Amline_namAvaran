import { apiClient } from '@/lib/api'
import { apiV1 } from '@/lib/apiPaths'
import type { Lead, LeadActivity, LeadStatus } from './types'

/** Backend CRM v1 shapes (subset) */
interface CrmLeadApi {
  id: string
  source?: string
  full_name: string
  mobile: string
  need_type: string
  status: string
  notes: string
  assigned_to: string | null
  contract_id: string | null
  listing_id?: string | null
  requirement_id?: string | null
  province_id?: string | null
  city_id?: string | null
  province_name_fa?: string | null
  city_name_fa?: string | null
  sla_due_at?: string | null
  created_at: string
  updated_at: string
}

interface CrmLeadListBody {
  items: CrmLeadApi[]
  total: number
  skip: number
  limit: number
}

interface CrmActivityApi {
  id: string
  lead_id: string
  type: string
  note: string
  user_id: string
  created_at: string
}

const CRM_BASE = apiV1('crm')

function normalizeNeedType(raw: string): Lead['need_type'] {
  const u = raw.toUpperCase()
  if (u === 'RENT' || u === 'BUY' || u === 'SELL') return u
  return 'RENT'
}

function normalizeLeadStatus(raw: string): LeadStatus {
  const u = raw.toUpperCase()
  if (u === 'QUALIFIED' || u === 'NEGOTIATION' || u === 'PROPOSAL') return 'NEGOTIATING'
  const allowed: LeadStatus[] = [
    'NEW',
    'CONTACTED',
    'NEGOTIATING',
    'CONTRACTED',
    'LOST',
  ]
  return (allowed.includes(u as LeadStatus) ? u : 'NEW') as LeadStatus
}

function mapLead(row: CrmLeadApi): Lead {
  return {
    id: row.id,
    full_name: row.full_name,
    mobile: row.mobile,
    need_type: normalizeNeedType(row.need_type),
    status: normalizeLeadStatus(row.status),
    assigned_to: row.assigned_to,
    notes: row.notes ?? '',
    created_at: row.created_at,
    updated_at: row.updated_at,
    contract_id: row.contract_id,
    province_id: row.province_id ?? null,
    city_id: row.city_id ?? null,
    province_name_fa: row.province_name_fa ?? null,
    city_name_fa: row.city_name_fa ?? null,
  }
}

function mapActivity(a: CrmActivityApi): LeadActivity {
  const typeMap: Record<string, LeadActivity['type']> = {
    CALL: 'CALL',
    NOTE: 'NOTE',
    FOLLOW_UP: 'MESSAGE',
  }
  return {
    id: a.id,
    lead_id: a.lead_id,
    type: typeMap[a.type] ?? 'NOTE',
    content: a.note,
    created_by: a.user_id,
    created_at: a.created_at,
  }
}

function toApiActivityType(t: LeadActivity['type']): string {
  if (t === 'MESSAGE') return 'NOTE'
  if (t === 'STATUS_CHANGE') return 'FOLLOW_UP'
  if (t === 'CALL') return 'CALL'
  return 'NOTE'
}

export async function remoteListLeads(): Promise<Lead[]> {
  const { data } = await apiClient.get<CrmLeadListBody>(`${CRM_BASE}/leads`, {
    params: { skip: 0, limit: 500 },
  })
  return Array.isArray(data?.items) ? data.items.map(mapLead) : []
}

export async function remoteGetLead(id: string): Promise<Lead | null> {
  try {
    const { data } = await apiClient.get<CrmLeadApi>(`${CRM_BASE}/leads/${id}`)
    return data ? mapLead(data) : null
  } catch {
    return null
  }
}

export async function remoteCreateLead(
  payload: Omit<Lead, 'id' | 'created_at' | 'updated_at'>
): Promise<Lead> {
  const { data } = await apiClient.post<CrmLeadApi>(`${CRM_BASE}/leads`, {
    source: 'MANUAL',
    full_name: payload.full_name,
    mobile: payload.mobile,
    need_type: payload.need_type,
    status: payload.status,
    notes: payload.notes,
    assigned_to: payload.assigned_to,
    contract_id: payload.contract_id,
    province_id: payload.province_id || undefined,
    city_id: payload.city_id || undefined,
  })
  return mapLead(data)
}

export async function remotePatchLead(id: string, patch: Partial<Lead>): Promise<Lead> {
  const body: Record<string, unknown> = {}
  const keys = [
    'full_name',
    'mobile',
    'need_type',
    'status',
    'notes',
    'assigned_to',
    'contract_id',
    'province_id',
    'city_id',
  ] as const
  for (const k of keys) {
    if (patch[k] !== undefined) body[k] = patch[k]
  }
  const { data } = await apiClient.patch<CrmLeadApi>(`${CRM_BASE}/leads/${id}`, body)
  return mapLead(data)
}

export async function remoteListActivities(leadId: string): Promise<LeadActivity[]> {
  const { data } = await apiClient.get<CrmActivityApi[]>(
    `${CRM_BASE}/leads/${leadId}/activities`
  )
  return Array.isArray(data) ? data.map(mapActivity) : []
}

export async function remoteAddActivity(
  leadId: string,
  payload: Omit<LeadActivity, 'id' | 'created_at'>
): Promise<LeadActivity> {
  const { data } = await apiClient.post<CrmActivityApi>(
    `${CRM_BASE}/leads/${leadId}/activities`,
    {
      type: toApiActivityType(payload.type),
      note: payload.content,
      user_id: payload.created_by,
    }
  )
  return mapActivity(data)
}
