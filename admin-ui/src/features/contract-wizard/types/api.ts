// ============================================================
// Contract Wizard — API Types (from OpenAPI amline-dev v0.1.3)
// ============================================================

import type { ContractStatus, ContractType, PRContractStep } from './wizard';

export type PartyType = 'LANDLORD' | 'TENANT';
export type PersonType = 'LEGAL_PERSON' | 'NATURAL_PERSON';
export type PaymentMethod = 'CASH' | 'CHEQUE';
export type SignatureType = 'OTP' | 'ADMIN_SIGN';
export type WitnessType = 'LANDLORD' | 'TENANT';
export type LegalPersonOwnershipType = 'PRIVATE_DEED' | 'LONG_TERM_LEASE';

// ---- Response Types ----

export type LegalReviewStatus = 'NONE' | 'AWAITING_STAFF' | 'APPROVED' | 'REJECTED';

/** parties شامل آرایه‌های landlords/tenants و فیلدهای مالی (sale_price، rent_amount، …) از بک‌اند */
export interface ContractResponse {
  id: string;
  type: ContractType;
  status: ContractStatus;
  step: PRContractStep | null;
  parties: Record<string, unknown>;
  is_owner: boolean;
  key: string;
  password: string | null;
  created_at: string;
  tracking_code?: string | null;
  legal_review_status?: LegalReviewStatus;
}

/** پاسخ GET /contracts/{id}/status — با OpenAPI رسمی align شود در openapi-sync */
export interface ContractStatusApiResponse {
  status: ContractStatus;
  step: PRContractStep | string;
  contract_id?: string;
  type?: ContractType;
  /** نگاشت محصول v2 — docs/STATUS_MAPPING_v2.md */
  lifecycle_v2?: string;
}

export interface Party {
  id: string;
  party_type: PartyType;
  person_type: PersonType;
  contract: Record<string, unknown>;
}

export interface AddContractPartyResponse {
  id: string;
  contract: Record<string, unknown>;
  party_type: PartyType;
  person_type: PersonType;
}

export interface UpdateStatus {
  ok: boolean;
}

export interface ResolveInfoResponse {
  result: string;
}

export interface FileResponse {
  id: string;
  url: string | null;
}

// ---- Request DTOs ----

export interface StartContractDto {
  contract_type: ContractType;
  /** party_type در OpenAPI رسمی نیست — فقط برای mock/dev استفاده می‌شه */
  party_type?: PartyType;
  is_guaranteed?: boolean;
}

export interface NaturalPersonDetail {
  national_code: string;
  is_forigen_citizen: boolean | null;
  mobile: string;
  birth_date: string;
  family_members_count: number | null;
  bank_account: string;
  postal_code: string;
  home_electricy_bill: number;
}

export interface LegalPersonSigner {
  national_code: string;
  mobile: string;
  birth_date: string;
  title: string;
}

export interface LegalPersonDetail {
  national_nc: string;
  ceo_mobile: string;
  ownership_type: LegalPersonOwnershipType;
  is_knowledge_based: boolean;
  postal_code: string;
  bank_account: string;
  signers: LegalPersonSigner[];
}

export interface UpdateContractPartyDto {
  person_type: PersonType;
  contract_type: ContractType;
  legal_person_detail: LegalPersonDetail | null;
  natural_person_detail: NaturalPersonDetail | null;
}

export interface AddHomeInfoDto {
  property_use_type: 'RESIDENTIAL' | 'COMMERCIAL';
  deed_image_file_ids: number[];
  postal_code: number;
  electricity_bill_id: number;
  area_m2: number;
  construction_date: string;
  restroom_type: 'NO_RESTROOM' | 'IRANIAN' | 'FOREIGN' | 'IRANIAN_AND_FOREIGN';
  heating_system_type: string;
  cooling_system_type: string;
  water_supply_type: 'NOTHIIG' | 'PRIVATE' | 'SHARED';
  electricity_supply_type: 'NOTHIIG' | 'PRIVATE' | 'SHARED';
  gas_supply_type: 'NOTHIIG' | 'PRIVATE' | 'SHARED';
  wastewater_supply_type: 'NOTHIIG' | 'PRIVATE' | 'SHARED';
  storage_area_m2: number | null;
  has_elevator: boolean;
  parking_number?: number | string | null;
  storage_number?: number | string | null;
  telephone_numbers?: string[] | null;
  next_step: PRContractStep;
}

export interface AddDatingDto {
  start_date: string;
  end_date: string;
  delivery_date: string;
  next_step: PRContractStep;
}

export interface PaymentStage {
  due_date: string;
  payment_type: PaymentMethod;
  amount: number;
  cheque_image_file_id?: number | null;
  description?: string | null;
}

export interface AddMortgageDto {
  total_amount: number;
  stages: PaymentStage[];
  next_step: PRContractStep;
}

/** خرید و فروش — POST /contracts/:id/sale-price */
export interface AddSalePriceDto {
  total_price: number;
  stages: PaymentStage[];
  next_step: PRContractStep;
}

export interface AddRentDto {
  monthly_rent_amount: number;
  rent_due_day_of_month?: number | null;
  stages: PaymentStage[];
  next_step: PRContractStep;
}

export interface SendSignRequestDto {
  party_id: number | null;
  signer_id: number | null;
  user_id: number | null;
  sign_type?: SignatureType;
}

export interface VerifySignOtpDto {
  otp: string;
  mobile: string;
  salt: string;
}

export interface SetSigningDto {
  next_step: PRContractStep;
}

export interface AddWithnessDto {
  next_step: PRContractStep;
}

export interface SendWitnessOtpDto {
  national_code: string;
  mobile: string;
  witness_type: WitnessType;
  witness_name?: string | null;
}

export interface VerifyWitnessOtpDto {
  otp: string;
  mobile: string;
  national_code: string;
  salt: string;
  witness_type: WitnessType;
}

export interface EmptyNextStepDto {
  next_step: PRContractStep;
}

export interface CommissionPayDto {
  use_wallet_credit?: boolean;
  use_all_wallet_credits?: boolean;
  wallet_credits?: number | null;
  /** اگر بک‌اند پشتیبانی کند — اعمال کد تخفیف هنگام پرداخت */
  discount_code?: string | null;
}

export interface CommissionPayResponse {
  ok: boolean;
  redirect_url?: string;
  used_wallet?: boolean;
  /** پرداخت از قبل ثبت شده (idempotent) */
  already_paid?: boolean;
}

/** پاسخ GET /contracts/:id/commission/invoice */
export interface CommissionInvoiceResponse {
  /** مبلغ پایه کمیسیون (ریال) در صورت برگردان از سرور */
  commission?: number;
  /** مالیات (ریال) */
  tax?: number;
  tracking_code_fee?: number;
  total_amount: number;
  /** قبل از تخفیف؛ فقط وقتی تخفیف اعمال شده */
  gross_total_amount?: number;
  discount_amount?: number;
  discount_percent?: number | null;
  landlord_share: number;
  tenant_share: number;
  invoice_id: string;
  commission_paid?: boolean;
  commission_paid_at?: string | null;
  /** در صورت پشتیبانی API — مبلغ پایه قبل از مالیات */
  commission_base_rial?: number | null;
  vat_amount_rial?: number | null;
  vat_percent?: number | null;
}
