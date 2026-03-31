export type LeadStatus = 'NEW' | 'CONTACTED' | 'NEGOTIATING' | 'CONTRACTED' | 'LOST'

export interface Lead {
  id: string
  full_name: string
  mobile: string
  need_type: 'RENT' | 'BUY' | 'SELL'
  status: LeadStatus
  assigned_to: string | null
  notes: string
  created_at: string
  updated_at: string
  contract_id: string | null
}

export interface LeadActivity {
  id: string
  lead_id: string
  type: 'CALL' | 'MESSAGE' | 'NOTE' | 'STATUS_CHANGE'
  content: string
  created_by: string
  created_at: string
}
