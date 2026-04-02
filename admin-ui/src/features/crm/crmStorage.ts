import type { Lead, LeadActivity, LeadStatus } from './types'

const LEADS_KEY = 'amline_crm_leads'
const ACTIVITIES_KEY = 'amline_crm_activities'

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// ---- Leads ----

export function getLeads(): Lead[] {
  try {
    const raw = localStorage.getItem(LEADS_KEY)
    return raw ? (JSON.parse(raw) as Lead[]) : []
  } catch {
    return []
  }
}

export function saveLead(lead: Lead): void {
  const leads = getLeads()
  const idx = leads.findIndex((l) => l.id === lead.id)
  if (idx >= 0) {
    leads[idx] = lead
  } else {
    leads.push(lead)
  }
  localStorage.setItem(LEADS_KEY, JSON.stringify(leads))
}

export function createLead(data: Omit<Lead, 'id' | 'created_at' | 'updated_at'>): Lead {
  const now = new Date().toISOString()
  const lead: Lead = {
    ...data,
    id: generateId(),
    created_at: now,
    updated_at: now,
  }
  saveLead(lead)
  return lead
}

export function updateLead(id: string, updates: Partial<Omit<Lead, 'id' | 'created_at'>>): Lead | null {
  const leads = getLeads()
  const idx = leads.findIndex((l) => l.id === id)
  if (idx < 0) return null
  const updated: Lead = { ...leads[idx], ...updates, updated_at: new Date().toISOString() }
  leads[idx] = updated
  localStorage.setItem(LEADS_KEY, JSON.stringify(leads))
  return updated
}

export function deleteLead(id: string): void {
  const leads = getLeads().filter((l) => l.id !== id)
  localStorage.setItem(LEADS_KEY, JSON.stringify(leads))
}

export function updateLeadStatus(id: string, status: LeadStatus): Lead | null {
  return updateLead(id, { status })
}

/** به‌روزرسانی دسته‌ای وضعیت (یک بار نوشتن localStorage) */
export function bulkUpdateLeadStatus(ids: string[], status: LeadStatus): number {
  const idSet = new Set(ids)
  const leads = getLeads()
  let n = 0
  const now = new Date().toISOString()
  const next = leads.map((l) => {
    if (!idSet.has(l.id)) return l
    n += 1
    return { ...l, status, updated_at: now }
  })
  if (n > 0) localStorage.setItem(LEADS_KEY, JSON.stringify(next))
  return n
}

// ---- Activities ----

export function getActivities(leadId?: string): LeadActivity[] {
  try {
    const raw = localStorage.getItem(ACTIVITIES_KEY)
    const all: LeadActivity[] = raw ? (JSON.parse(raw) as LeadActivity[]) : []
    return leadId ? all.filter((a) => a.lead_id === leadId) : all
  } catch {
    return []
  }
}

export function addActivity(data: Omit<LeadActivity, 'id' | 'created_at'>): LeadActivity {
  const all = getActivities()
  const activity: LeadActivity = {
    ...data,
    id: generateId(),
    created_at: new Date().toISOString(),
  }
  all.push(activity)
  localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(all))
  return activity
}

export function deleteActivity(id: string): void {
  const all = getActivities().filter((a) => a.id !== id)
  localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(all))
}
