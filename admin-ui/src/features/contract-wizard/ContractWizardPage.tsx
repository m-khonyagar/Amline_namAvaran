import { useEffect } from 'react';
import { WizardProvider, useWizard } from './engine/WizardContext';
import { ProgressBar } from './components/ProgressBar';
import { WizardErrorBoundary } from './components/WizardErrorBoundary';
import { ContractStatusBanner } from './components/ContractStatusBanner';
import { StartStep } from './components/steps/StartStep';
import { DraftBanner } from './components/DraftBanner';
import { RevokeContractButton } from './components/RevokeContractButton';
import { CommissionStep } from './components/steps/CommissionStep';
import { getStepRegistry } from './registry/stepRegistry';
import { localDraftStorage } from './storage/draftStorage';
import type { DraftEntry } from './storage/draftStorage';
import { useContractStatusPolling } from './hooks/useContractStatusPolling';
import type { ContractStatus, PRContractStep } from './types/wizard';

interface WizardInnerProps {
  platform: 'admin' | 'user';
}

function WizardInner({ platform }: WizardInnerProps) {
  const { state, dispatch } = useWizard();

  // Polling وضعیت قرارداد
  useContractStatusPolling(state.contractId, (status: ContractStatus) => {
    dispatch({ type: 'SET_STATUS', payload: { status } });
  });

  // ذخیره draft پس از هر تغییر مرحله
  useEffect(() => {
    if (!state.contractId || !state.contractType || state.currentStep === 'DRAFT') return;
    localDraftStorage.save({
      contractId: state.contractId,
      contractType: state.contractType,
      currentStep: state.currentStep,
      isScribeMode: state.isScribeMode,
    });
  }, [state.contractId, state.contractType, state.currentStep, state.isScribeMode]);

  // هشدار هنگام ترک صفحه
  useEffect(() => {
    if (!state.contractId || state.currentStep === 'FINISH') return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [state.contractId, state.currentStep]);

  function handleStepComplete(nextStep: PRContractStep) {
    dispatch({ type: 'APPLY_NEXT_STEP', payload: { nextStep } });
  }

  // مرحله DRAFT — نمایش DraftBanner + StartStep
  if (state.currentStep === 'DRAFT' || !state.contractId || !state.contractType) {
    return (
      <div dir="rtl" className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <DraftBanner
          onContinue={(draft: DraftEntry) => {
            dispatch({
              type: 'RESTORE_DRAFT',
              payload: {
                contractId: draft.contractId,
                currentStep: draft.currentStep,
                contractType: draft.contractType,
                isScribeMode: draft.isScribeMode,
              },
            });
          }}
          onStartNew={() => {/* نمایش StartStep با state داخلی */}}
        />
        <StartStep
          platform={platform}
          onStart={({ contractId, nextStep, contractType, isScribeMode }) => {
            dispatch({
              type: 'START_CONTRACT',
              payload: { contractId, nextStep, contractType, isScribeMode },
            });
          }}
        />
      </div>
    );
  }

  const registry = getStepRegistry(state.contractType);
  const StepComponent = registry[state.currentStep]?.component;

  // وضعیت PENDING_COMMISSION — نمایش CommissionStep
  if (state.contractStatus === 'PENDING_COMMISSION') {
    return (
      <div dir="rtl" className="max-w-2xl mx-auto px-4 py-6">
        <CommissionStep
          contractId={state.contractId}
          contractType={state.contractType}
          platform={platform}
          isScribeMode={state.isScribeMode}
          onComplete={handleStepComplete}
        />
      </div>
    );
  }

  return (
    <div dir="rtl" className="max-w-2xl mx-auto px-4 py-6">
      {/* نوار پیشرفت */}
      <div className="mb-6">
        <ProgressBar
          currentStep={state.currentStep}
          completedSteps={state.completedSteps}
          contractType={state.contractType}
          editableSteps={state.editableSteps}
          onStepClick={(step) =>
            dispatch({ type: 'APPLY_NEXT_STEP', payload: { nextStep: step } })
          }
        />
      </div>

      {/* بنر وضعیت */}
      <ContractStatusBanner
        status={state.contractStatus}
        onRequestEdit={() =>
          dispatch({ type: 'SET_EDITABLE_STEPS', payload: { steps: state.completedSteps } })
        }
      />

      {/* loading indicator */}
      {state.isLoading && (
        <div className="flex justify-center py-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {/* رندر مرحله فعال */}
      {StepComponent ? (
        <StepComponent
          contractId={state.contractId}
          contractType={state.contractType}
          platform={platform}
          isScribeMode={state.isScribeMode}
          onComplete={handleStepComplete}
        />
      ) : (
        <div className="text-center py-8 text-gray-400 text-sm">
          این مرحله در حال توسعه است...
        </div>
      )}

      {/* دکمه فسخ قرارداد — فقط در وضعیت ACTIVE */}
      {state.contractStatus === 'ACTIVE' && (
        <div className="mt-8 flex justify-center">
          <RevokeContractButton
            contractId={state.contractId}
            onRevoked={() =>
              dispatch({ type: 'SET_STATUS', payload: { status: 'REVOKED' } })
            }
          />
        </div>
      )}
    </div>
  );
}

interface ContractWizardPageProps {
  platform?: 'admin' | 'user';
}

export function ContractWizardPage({ platform = 'user' }: ContractWizardPageProps) {
  return (
    <WizardProvider platform={platform}>
      <WizardErrorBoundary>
        <WizardInner platform={platform} />
      </WizardErrorBoundary>
    </WizardProvider>
  );
}
