import { useEffect } from 'react';
import { WizardProvider, useWizard } from './engine/WizardContext';
import { ProgressBar } from './components/ProgressBar';
import { WizardErrorBoundary } from './components/WizardErrorBoundary';
import { ContractStatusBanner } from './components/ContractStatusBanner';
import { StartStep } from './components/steps/StartStep';
import { DraftBanner } from './components/DraftBanner';
import { RevokeContractButton } from './components/RevokeContractButton';
import { CommissionStep } from './components/steps/CommissionStep';
import { getStepRegistry, STEP_ORDER } from './registry/stepRegistry';
import { localDraftStorage } from './storage/draftStorage';
import type { DraftEntry } from './storage/draftStorage';
import { signingPartiesStorage } from './storage/signingPartiesStorage';
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

  function handleStepNavigation(nextStep: PRContractStep) {
    if (!state.contractId || !state.contractType) {
      dispatch({ type: 'APPLY_NEXT_STEP', payload: { nextStep } });
      return;
    }
    const currentIndex = STEP_ORDER.indexOf(state.currentStep);
    const targetIndex = STEP_ORDER.indexOf(nextStep);
    const isBackNavigation = targetIndex >= 0 && currentIndex >= 0 && targetIndex < currentIndex;
    if (isBackNavigation) {
      const ok = window.confirm(
        'آیا مطمئن هستید می‌خواهید به مرحله قبل برگردید؟ تغییرات ثبت‌نشده این مرحله از بین می‌رود.'
      );
      if (!ok) return;
    }
    localDraftStorage.save({
      contractId: state.contractId,
      contractType: state.contractType,
      currentStep: nextStep,
      isScribeMode: state.isScribeMode,
    });
    dispatch({ type: 'APPLY_NEXT_STEP', payload: { nextStep } });
  }

  // مرحله DRAFT — نمایش DraftBanner + StartStep
  if (state.currentStep === 'DRAFT' || !state.contractId || !state.contractType) {
    return (
      <div
        dir="rtl"
        className="mx-auto w-full max-w-3xl space-y-6 rounded-[var(--amline-radius-xl)] border border-[var(--amline-border)] bg-[var(--amline-surface)] p-4 shadow-amline sm:p-6 lg:p-8 dark:border-slate-700 dark:bg-[var(--amline-surface-elevated)]"
      >
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
          onStartNew={() => {
            localDraftStorage.clearAll();
            if (state.contractId) signingPartiesStorage.clear(state.contractId);
            dispatch({ type: 'RESET_WIZARD' });
          }}
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
      <div
        dir="rtl"
        className="mx-auto w-full max-w-3xl rounded-[var(--amline-radius-xl)] border border-[var(--amline-border)] bg-[var(--amline-surface)] p-4 shadow-amline sm:p-6 dark:border-slate-700 dark:bg-[var(--amline-surface-elevated)]"
      >
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
    <div
      dir="rtl"
      className="mx-auto w-full max-w-3xl space-y-6 rounded-[var(--amline-radius-xl)] border border-[var(--amline-border)] bg-[var(--amline-surface)] p-4 shadow-amline sm:p-6 lg:p-8 dark:border-slate-700 dark:bg-[var(--amline-surface-elevated)]"
    >
      {/* نوار پیشرفت */}
      <div className="mb-6">
        <ProgressBar
          currentStep={state.currentStep}
          completedSteps={state.completedSteps}
          contractType={state.contractType}
          editableSteps={state.editableSteps}
          onStepClick={handleStepNavigation}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            const idx = STEP_ORDER.indexOf(state.currentStep);
            if (idx <= 0) return;
            handleStepNavigation(STEP_ORDER[idx - 1]);
          }}
          disabled={STEP_ORDER.indexOf(state.currentStep) <= 0}
          className="rounded-lg border border-[var(--amline-border)] px-4 py-2 text-sm font-medium text-[var(--amline-fg-muted)] hover:bg-[var(--amline-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          بازگشت به مرحله قبل
        </button>
        <span className="text-xs text-[var(--amline-fg-subtle)]">
          برای ویرایش مرحله‌های قبلی از نوار مراحل هم می‌توانید استفاده کنید
        </span>
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
          signingParties={signingPartiesStorage.load(state.contractId)}
          onComplete={handleStepComplete}
        />
      ) : (
        <div className="py-10 text-center text-sm text-[var(--amline-fg-muted)]">
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
