// ============================================================
// Contract Wizard — Core Types
// ============================================================

export type ContractType =
  | 'PROPERTY_RENT'
  | 'BUYING_AND_SELLING'
  | 'EXCHANGE'
  | 'CONSTRUCTION'
  | 'PRE_SALE'
  | 'LEASE_TO_OWN';

export type ContractRole = 'PARTY' | 'WITNESS' | 'SCRIBE';

export type PRContractStep =
  | 'DRAFT'
  | 'LANDLORD_INFORMATION'
  | 'TENANT_INFORMATION'
  | 'PLACE_INFORMATION'
  | 'DATING'
  | 'MORTGAGE'
  | 'RENTING'
  | 'SIGNING'
  | 'WITNESS'
  | 'FINISH';

export type ContractStatus =
  | 'ADMIN_STARTED'
  | 'DRAFT'
  | 'ONE_PARTY_SIGNED'
  | 'FULLY_SIGNED'
  | 'LANDLORDS_FULLY_SIGNED'
  | 'TENANTS_FULLY_SIGNED'
  | 'ACTIVE'
  | 'PENDING_COMMISSION'
  | 'EDIT_REQUESTED'
  | 'PARTY_REJECTED'
  | 'PENDING_ADMIN_APPROVAL'
  | 'ADMIN_REJECTED'
  | 'COMPLETED'
  | 'REVOKED'
  | 'PDF_GENERATED'
  | 'PDF_GENERATING_FAILED';

export interface SigningParty {
  id: string;
  label: string;
  mobile: string;
  partyType: 'LANDLORD' | 'TENANT';
  personType: 'NATURAL_PERSON' | 'LEGAL_PERSON';
}

export interface WizardState {
  contractId: string | null;
  contractType: ContractType | null;
  userRole: ContractRole;
  isScribeMode: boolean;
  currentStep: PRContractStep;
  contractStatus: ContractStatus | null;
  completedSteps: PRContractStep[];
  editableSteps: PRContractStep[];
  isLoading: boolean;
  error: string | null;
  platform: 'admin' | 'user';
}

export type WizardAction =
  | {
      type: 'START_CONTRACT';
      payload: {
        contractId: string;
        nextStep: PRContractStep;
        contractType: ContractType;
        isScribeMode: boolean;
      };
    }
  | {
      type: 'RESUME_CONTRACT';
      payload: {
        contractId: string;
        nextStep: PRContractStep;
        contractType: ContractType;
        isScribeMode: boolean;
        status: ContractStatus;
      };
    }
  | { type: 'APPLY_NEXT_STEP'; payload: { nextStep: PRContractStep } }
  | {
      type: 'COMMISSION_PAID_CONTINUE';
      payload: { status: ContractStatus; nextStep: PRContractStep };
    }
  | { type: 'SET_STATUS'; payload: { status: ContractStatus } }
  | { type: 'SET_EDITABLE_STEPS'; payload: { steps: PRContractStep[] } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | {
      type: 'RESTORE_DRAFT';
      payload: {
        contractId: string;
        currentStep: PRContractStep;
        contractType: ContractType;
        isScribeMode: boolean;
      };
    }
  | { type: 'RESET_WIZARD' }
  /** فقط dev + VITE_WIZARD_PREVIEW_MODE: پرش به مرحله بدون وابستگی به تکمیل API */
  | { type: 'PREVIEW_JUMP_TO_STEP'; payload: { nextStep: PRContractStep } }
  /** شروع با شناسهٔ mock محلی (MSW) بدون فراخوانی POST /contracts/start */
  | {
      type: 'PREVIEW_BOOTSTRAP';
      payload: {
        contractId: string;
        nextStep: PRContractStep;
        contractType: ContractType;
        isScribeMode: boolean;
      };
    };

export interface StepProps {
  contractId: string;
  contractType: ContractType;
  platform: 'admin' | 'user';
  isScribeMode: boolean;
  signingParties?: SigningParty[];
  onComplete: (nextStep: PRContractStep) => void;
  /** پس از پرداخت کمیسیون، خروج از گیت PENDING_COMMISSION و همگام‌سازی با GET /status */
  onCommissionContinue?: () => void | Promise<void>;
}

export interface StepMeta {
  label: string;
  component: React.ComponentType<StepProps>;
}
