export type ConsultantApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'NEEDS_INFO'

export type ConsultantVerificationTier = 'NONE' | 'BASIC' | 'VERIFIED' | 'PREMIUM'

export interface ConsultantApplicationRow {
  id: string
  consultant_user_id: string
  full_name: string
  mobile: string
  national_code: string
  license_no: string
  city: string
  agency_name?: string
  status: ConsultantApplicationStatus
  reviewer_note?: string
  submitted_at: string
  updated_at: string
}

export interface ConsultantProfile {
  id: string
  full_name: string
  mobile: string
  verification_tier: ConsultantVerificationTier
  application_status: ConsultantApplicationStatus
  credit_score: number
  active_contracts_count: number
  assigned_leads_count: number
}
