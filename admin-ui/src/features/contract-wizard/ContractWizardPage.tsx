import { useCallback, useEffect, useState } from 'react';
import { WizardProvider, useWizard } from './engine/WizardContext';
import { contractApi } from './api/contractApi';
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
import { isMappedApiError } from '../../lib/errorMapper';
import type { ContractStatus, ContractType, PRContractStep } from './types/wizard';
import {
  isAdminContractWizardFlexible,
  isPreviewBootstrapContractId,
  isWizardPreviewMode,
} from './wizardPreviewMode';
import { AdminWizardStepToolbar } from './components/AdminWizardStepToolbar';

interface WizardInnerProps {
  platform: 'admin' | 'user';
  resumeContractId?: string | null;
  wizardPreviewMode: boolean;
  flexibleWizardNav: boolean;
}

const RESUME_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function coerceWizardStep(step: string | null | undefined): PRContractStep {
  if (step && (STEP_ORDER as readonly string[]).includes(step)) {
    return step as PRContractStep;
  }
  return 'SIGNING';
}

/** بازگشایی از API: «DRAFT» را به اولین مرحلهٔ فرم تبدیل می‌کند تا UI گیر نکند. */
function coerceResumeStep(step: string | null | undefined): PRContractStep {
  if (step && (STEP_ORDER as readonly string[]).includes(step)) {
    const s = step as PRContractStep;
    if (s === 'DRAFT') return 'LANDLORD_INFORMATION';
    return s;
  }
  return 'LANDLORD_INFORMATION';
}

function coerceContractType(t: unknown): ContractType {
  if (t === 'BUYING_AND_SELLING') return 'BUYING_AND_SELLING';
  return 'PROPERTY_RENT';
}

function WizardInner({
  platform,
  resumeContractId = null,
  wizardPreviewMode,
  flexibleWizardNav,
}: WizardInnerProps) {
  const { state, dispatch } = useWizard();
  const idForResume = resumeContractId?.trim() ?? '';
  const resumeIdValid = RESUME_UUID_RE.test(idForResume);

  const [resumeBusy, setResumeBusy] = useState(() => resumeIdValid);
  const [resumeError, setResumeError] = useState<string | null>(null);

  useEffect(() => {
    if (!idForResume) {
      setResumeBusy(false);
      setResumeError(null);
      return;
    }
    if (!resumeIdValid) {
      setResumeBusy(false);
      setResumeError('شناسه قرارداد در نشانی نامعتبر است.');
      return;
    }
    let cancelled = false;
    setResumeBusy(true);
    setResumeError(null);
    void (async () => {
      try {
        const res = await contractApi.getStatus(idForResume);
        if (cancelled) return;
        const data = res.data;
        const nextStep = coerceResumeStep(typeof data.step === 'string' ? data.step : undefined);
        const contractType = coerceContractType(data.type);
        const draft = localDraftStorage.load(idForResume);
        const isScribeMode = draft?.isScribeMode ?? false;
        dispatch({
          type: 'RESUME_CONTRACT',
          payload: {
            contractId: idForResume,
            nextStep,
            contractType,
            isScribeMode,
            status: data.status as ContractStatus,
          },
        });
        localDraftStorage.save({
          contractId: idForResume,
          contractType,
          currentStep: nextStep,
          isScribeMode,
        });
      } catch (err: unknown) {
        if (!cancelled) {
          setResumeError(
            isMappedApiError(err)
              ? err.message
              : 'امکان بازیابی این قرارداد نبود. دوباره تلاش کنید یا از لیست قراردادها باز کنید.'
          );
        }
      } finally {
        if (!cancelled) setResumeBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [idForResume, resumeIdValid, dispatch]);

  const handleCommissionContinue = useCallback(async () => {
    if (!state.contractId) return;
    try {
      const res = await contractApi.getStatus(state.contractId);
      let status: ContractStatus = res.data.status;
      let nextStep = coerceWizardStep(
        typeof res.data.step === 'string' ? res.data.step : undefined
      );
      if (status === 'PENDING_COMMISSION') {
        status = 'DRAFT';
        nextStep = 'SIGNING';
      }
      dispatch({
        type: 'COMMISSION_PAID_CONTINUE',
        payload: { status, nextStep },
      });
    } catch {
      dispatch({
        type: 'COMMISSION_PAID_CONTINUE',
        payload: { status: 'DRAFT', nextStep: 'SIGNING' },
      });
    }
  }, [state.contractId, dispatch]);

  // Polling وضعیت قرارداد
  useContractStatusPolling(state.contractId, (status: ContractStatus) => {
    dispatch({ type: 'SET_STATUS', payload: { status } });
  });

  /** بلافاصله پس از ورود به امضا، وضعیت مؤثر (مثلاً PENDING_COMMISSION) را از API بگیر — بدون انتظار برای interval پولینگ */
  useEffect(() => {
    if (!state.contractId || state.currentStep !== 'SIGNING') return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await contractApi.getStatus(state.contractId!);
        if (cancelled) return;
        dispatch({ type: 'SET_STATUS', payload: { status: res.data.status as ContractStatus } });
      } catch {
        /* پولینگ بعداً همگام می‌کند */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state.contractId, state.currentStep, dispatch]);

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
    if (platform === 'admin') return;
    if (wizardPreviewMode && state.contractId && isPreviewBootstrapContractId(state.contractId)) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [state.contractId, state.currentStep, wizardPreviewMode, platform]);

  function handleStepComplete(nextStep: PRContractStep) {
    dispatch({ type: 'APPLY_NEXT_STEP', payload: { nextStep } });
  }

  if (resumeBusy && !state.contractId) {
    return (
      <div
        dir="rtl"
        className="mx-auto flex min-h-[40vh] w-full max-w-3xl flex-col items-center justify-center gap-3 rounded-[var(--amline-radius-xl)] border border-[var(--amline-border)] bg-[var(--amline-surface)] p-8 shadow-amline dark:border-slate-700 dark:bg-[var(--amline-surface-elevated)]"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--amline-primary)] border-t-transparent" />
        <p className="text-sm text-[var(--amline-fg-muted)]">در حال باز کردن قرارداد…</p>
      </div>
    );
  }

  function handleStepNavigation(nextStep: PRContractStep) {
    if (!state.contractId || !state.contractType) {
      dispatch({ type: 'APPLY_NEXT_STEP', payload: { nextStep } });
      return;
    }
    const currentIndex = STEP_ORDER.indexOf(state.currentStep);
    const targetIndex = STEP_ORDER.indexOf(nextStep);
    const isBackNavigation = targetIndex >= 0 && currentIndex >= 0 && targetIndex < currentIndex;
    if (isBackNavigation && !flexibleWizardNav) {
      const ok = window.confirm(
        'آیا مطمئن هستید می‌خواهید به مرحله قبل برگردید؟ تغییرات ثبت‌نشده این مرحله از بین می‌رود.'
      );
      if (!ok) return;
    }
    if (nextStep === 'DRAFT' && flexibleWizardNav) {
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
    if (flexibleWizardNav) {
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
        {resumeError ? (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-50"
          >
            {resumeError}
          </div>
        ) : null}
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
          onCommissionContinue={handleCommissionContinue}
        />
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="mx-auto w-full max-w-3xl space-y-6 rounded-[var(--amline-radius-xl)] border border-[var(--amline-border)] bg-gradient-to-b from-[var(--amline-surface)] to-[var(--amline-surface-muted)]/30 p-4 shadow-amline sm:p-6 lg:p-8 dark:border-slate-700 dark:from-[var(--amline-surface-elevated)] dark:to-slate-950/50"
    >
      {flexibleWizardNav && (
        <div
          className={
            wizardPreviewMode
              ? 'flex items-center gap-2 rounded-[var(--amline-radius-lg)] border border-sky-200/70 bg-sky-50/90 px-4 py-2.5 text-sm text-sky-950 dark:border-sky-500/25 dark:bg-sky-950/35 dark:text-sky-100'
              : 'flex items-center gap-2 rounded-[var(--amline-radius-lg)] border border-teal-200/80 bg-teal-50/90 px-4 py-2.5 text-sm text-teal-950 dark:border-teal-700/40 dark:bg-teal-950/30 dark:text-teal-100'
          }
        >
          <span
            className={`inline-flex h-2 w-2 rounded-full ${wizardPreviewMode ? 'animate-pulse bg-sky-500' : 'bg-teal-500'}`}
            aria-hidden
          />
          <span>
            {wizardPreviewMode ? (
              <>
                <span className="font-semibold">پیش‌نمایش dev:</span> پیمایش آزاد و دکمهٔ شروع بدون POST؛ داده با API ممکن است
                هم‌خوان نباشد.
              </>
            ) : (
              <>
                <span className="font-semibold">پنل ادمین:</span> می‌توانید از نوار مراحل یا دکمهٔ «رد کردن این مرحله» بدون
                تکمیل فرم جابه‌جا شوید؛ برای ثبت واقعی هر بخش همان دکمهٔ اصلی مرحله را بزنید.
              </>
            )}
          </span>
        </div>
      )}

      <div className="mb-2">
        <ProgressBar
          currentStep={state.currentStep}
          completedSteps={state.completedSteps}
          contractType={state.contractType}
          editableSteps={state.editableSteps}
          freeStepNavigation={flexibleWizardNav}
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
          {flexibleWizardNav
            ? 'نوار بالا تمام مراحل را باز می‌کند؛ در ادمین نیازی به تکمیل فرم برای جابه‌جایی نیست.'
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
        <>
          {platform === 'admin' && state.currentStep !== 'FINISH' ? (
            <AdminWizardStepToolbar
              contractType={state.contractType}
              currentStep={state.currentStep}
              onJumpNext={(next: PRContractStep) => handleStepNavigation(next)}
            />
          ) : null}
          <StepComponent
            contractId={state.contractId}
            contractType={state.contractType}
            platform={platform}
            isScribeMode={state.isScribeMode}
            signingParties={signingPartiesStorage.load(state.contractId)}
            onComplete={handleStepComplete}
          />
        </>
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
  /** اگر مثلاً از `/contracts/wizard?resume=<uuid>` پر شود، همان قرارداد از API باز می‌شود. */
  resumeContractId?: string | null;
}

export function ContractWizardPage({
  platform = 'user',
  resumeContractId = null,
}: ContractWizardPageProps) {
  const wizardPreviewMode = isWizardPreviewMode();
  const flexibleWizardNav = isAdminContractWizardFlexible(platform);
  return (
    <WizardProvider platform={platform}>
      <WizardErrorBoundary>
        <WizardInner
          platform={platform}
          resumeContractId={resumeContractId}
          wizardPreviewMode={wizardPreviewMode}
          flexibleWizardNav={flexibleWizardNav}
        />
      </WizardErrorBoundary>
    </WizardProvider>
  );
}
