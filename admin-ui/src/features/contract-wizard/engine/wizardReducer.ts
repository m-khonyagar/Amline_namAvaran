import type { PRContractStep, WizardAction, WizardState } from '../types/wizard';

export const STEP_ORDER: PRContractStep[] = [
  'DRAFT',
  'LANDLORD_INFORMATION',
  'TENANT_INFORMATION',
  'PLACE_INFORMATION',
  'DATING',
  'MORTGAGE',
  'RENTING',
  'SIGNING',
  'WITNESS',
  'FINISH',
];

export const initialWizardState: WizardState = {
  contractId: null,
  contractType: null,
  userRole: 'PARTY',
  isScribeMode: false,
  currentStep: 'DRAFT',
  contractStatus: null,
  completedSteps: [],
  editableSteps: [],
  isLoading: false,
  error: null,
  platform: 'user',
};

/**
 * قانون اصلی: currentStep همیشه از next_step API می‌آید.
 * هرگز مرحله بعدی را بدون دریافت next_step از API تعیین نکن.
 */
export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'START_CONTRACT':
      return {
        ...state,
        contractId: action.payload.contractId,
        contractType: action.payload.contractType,
        isScribeMode: action.payload.isScribeMode,
        currentStep: action.payload.nextStep, // ← از API
        completedSteps: [],
        isLoading: false,
        error: null,
      };

    case 'RESUME_CONTRACT': {
      const idx = STEP_ORDER.indexOf(action.payload.nextStep);
      const completedSteps =
        idx > 1 ? (STEP_ORDER.slice(1, idx) as PRContractStep[]) : [];
      return {
        ...state,
        contractId: action.payload.contractId,
        contractType: action.payload.contractType,
        isScribeMode: action.payload.isScribeMode,
        currentStep: action.payload.nextStep,
        contractStatus: action.payload.status,
        completedSteps,
        isLoading: false,
        error: null,
      };
    }

    case 'APPLY_NEXT_STEP':
      return {
        ...state,
        completedSteps: state.completedSteps.includes(state.currentStep)
          ? state.completedSteps
          : [...state.completedSteps, state.currentStep],
        currentStep: action.payload.nextStep, // ← از API
        isLoading: false,
        error: null,
      };

    case 'COMMISSION_PAID_CONTINUE':
      return {
        ...state,
        contractStatus: action.payload.status,
        currentStep: action.payload.nextStep,
        isLoading: false,
        error: null,
      };

    case 'SET_STATUS':
      return { ...state, contractStatus: action.payload.status };

    case 'SET_EDITABLE_STEPS':
      return { ...state, editableSteps: action.payload.steps };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };

    case 'RESTORE_DRAFT':
      return {
        ...state,
        contractId: action.payload.contractId,
        contractType: action.payload.contractType,
        isScribeMode: action.payload.isScribeMode,
        currentStep: action.payload.currentStep,
        isLoading: false,
        error: null,
      };

    case 'RESET_WIZARD':
      return {
        ...initialWizardState,
        platform: state.platform,
      };

    default:
      return state;
  }
}
