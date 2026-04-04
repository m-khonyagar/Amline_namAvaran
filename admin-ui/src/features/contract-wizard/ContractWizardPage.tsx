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
import { isPreviewBootstrapContractId, isWizardPreviewMode } from './wizardPreviewMode';

interface WizardInnerProps {
  platform: 'admin' | 'user';
  wizardPreviewMode: boolean;
}

function WizardInner({ platform, wizardPreviewMode }: WizardInnerProps) {
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
    if (wizardPreviewMode && state.contractId && isPreviewBootstrapContractId(state.contractId)) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [state.contractId, state.currentStep, wizardPreviewMode]);

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
    if (isBackNavigation && !wizardPreviewMode) {
      const ok = window.confirm(
        'آیا مطمئن هستید می‌خواهید به مرحله قبل برگردید؟ تغییرات ثبت‌نشده این مرحله از بین می‌رود.'
      );
      if (!ok) return;
    }
    if (nextStep === 'DRAFT' && wizardPreviewMode) {
      localDraftStorage.clearAll();
      if (state.contractId) signingPartiesStorage.clear(state.contractId);
      dispatch({ type: 'PREVIEW_JUMP_TO_STEP', payload: { nextStep } });
      return;
    }
    if (state.contractId && state.contractType && nextStep !== 'DRAFT') {
      localDraftStorage.save({
        contractId: state.contractId,
        contractType: state.contractType,
        currentStep: nextStep,
        isScribeMode: state.isScribeMode,
      });
    }
    if (wizardPreviewMode) {
      dispatch({ type: 'PREVIEW_JUMP_TO_STEP', payload: { nextStep } });
    } else {
      dispatch({ type: 'APPLY_NEXT_STEP', payload: { nextStep } });
    }
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
          previewMode={wizardPreviewMode}
          onStart={({ contractId, nextStep, contractType, isScribeMode }) => {
            dispatch({
              type: 'START_CONTRACT',
              payload: { contractId, nextStep, contractType, isScribeMode },
            });
          }}
          onPreviewBootstrap={
            wizardPreviewMode
              ? ({ contractId, nextStep, contractType, isScribeMode }) => {
                  dispatch({
                    type: 'PREVIEW_BOOTSTRAP',
                    payload: { contractId, nextStep, contractType, isScribeMode },
                  });
                }
              : undefined
          }
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
      className="mx-auto w-full max-w-3xl space-y-6 rounded-[var(--amline-radius-xl)] border border-[var(--amline-border)] bg-gradient-to-b from-[var(--amline-surface)] to-[var(--amline-surface-muted)]/30 p-4 shadow-amline sm:p-6 lg:p-8 dark:border-slate-700 dark:from-[var(--amline-surface-elevated)] dark:to-slate-950/50"
    >
      {wizardPreviewMode && (
        <div className="flex items-center gap-2 rounded-[var(--amline-radius-lg)] border border-sky-200/70 bg-sky-50/90 px-4 py-2.5 text-sm text-sky-950 dark:border-sky-500/25 dark:bg-sky-950/35 dark:text-sky-100">
          <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-sky-500" aria-hidden />
          <span>
            <span className="font-semibold">پیش‌نمایش:</span> پیمایش آزاد بین مراحل فعال است؛ داده‌ها ممکن است با سرور هم‌خوان نباشند.
          </span>
        </div>
      )}

      <div className="mb-2">
        <ProgressBar
          currentStep={state.currentStep}
          completedSteps={state.completedSteps}
          contractType={state.contractType}
          editableSteps={state.editableSteps}
          freeStepNavigation={wizardPreviewMode}
          onStepClick={handleStepNavigation}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => {
            const idx = STEP_ORDER.indexOf(state.currentStep);
            if (idx <= 0) return;
            handleStepNavigation(STEP_ORDER[idx - 1]);
          }}
          disabled={STEP_ORDER.indexOf(state.currentStep) <= 0}
          className="rounded-[var(--amline-radius-lg)] border border-[var(--amline-border)] bg-[var(--amline-surface)] px-4 py-2.5 text-sm font-semibold text-[var(--amline-fg-muted)] shadow-sm transition hover:bg-[var(--amline-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600"
        >
          بازگشت به مرحله قبل
        </button>
        <span className="text-xs text-[var(--amline-fg-subtle)] sm:text-end">
          {wizardPreviewMode
            ? 'در حالت پیش‌نمایش می‌توانید هر مرحله را از نوار بالا باز کنید.'
            : 'برای ویرایش مراحل تکمیل‌شده از نوار مراحل استفاده کنید.'}
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
  const wizardPreviewMode = platform === 'admin' && isWizardPreviewMode();
  return (
    <WizardProvider platform={platform}>
      <WizardErrorBoundary>
        <WizardInner platform={platform} wizardPreviewMode={wizardPreviewMode} />
      </WizardErrorBoundary>
    </WizardProvider>
  );
}
