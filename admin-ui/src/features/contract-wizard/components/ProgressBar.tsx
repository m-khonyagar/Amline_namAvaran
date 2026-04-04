import { getProgress, STEP_ORDER } from '../registry/stepRegistry';
import type { ContractType, PRContractStep } from '../types/wizard';
import { getStepRegistry } from '../registry/stepRegistry';

type WizardStepVisible = Exclude<PRContractStep, 'DRAFT'>;

/** مراحل قابل‌نمایش در نوار (بدون DRAFT) */
const VISUAL_STEPS: WizardStepVisible[] = STEP_ORDER.filter(
  (s): s is WizardStepVisible => s !== 'DRAFT'
);

interface ProgressBarProps {
  currentStep: PRContractStep;
  completedSteps: PRContractStep[];
  contractType: ContractType;
  editableSteps?: PRContractStep[];
  /** dev + VITE_WIZARD_PREVIEW_MODE: کلیک روی هر مرحله */
  freeStepNavigation?: boolean;
  onStepClick?: (step: PRContractStep) => void;
}

export function ProgressBar({
  currentStep,
  completedSteps,
  contractType,
  editableSteps = [],
  freeStepNavigation = false,
  onStepClick,
}: ProgressBarProps) {
  const registry = getStepRegistry(contractType);
  const progress = getProgress(currentStep);
  const currentVisualIndex =
    currentStep === 'DRAFT' ? -1 : VISUAL_STEPS.indexOf(currentStep);
  const displayIndex = currentVisualIndex >= 0 ? currentVisualIndex + 1 : 0;
  const totalVisual = VISUAL_STEPS.length;

  return (
    <div
      dir="rtl"
      className="w-full rounded-[var(--amline-radius-lg)] border border-[var(--amline-border)] bg-[var(--amline-surface-muted)]/40 p-4 dark:border-slate-700 dark:bg-slate-900/40"
      role="navigation"
      aria-label="مراحل قرارداد"
    >
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--amline-fg-subtle)]">
            پیشرفت فرایند
          </p>
          <p className="mt-0.5 text-sm font-semibold text-[var(--amline-fg)]">
            مرحله {displayIndex || '—'} از {totalVisual}
          </p>
        </div>
        <div className="rounded-full bg-[var(--amline-surface)] px-3 py-1 text-sm font-bold tabular-nums text-[var(--amline-accent)] shadow-sm dark:bg-slate-800">
          {progress}٪
        </div>
      </div>

      <div className="relative mb-5">
        <div className="h-2 overflow-hidden rounded-full bg-[var(--amline-border)]/60 dark:bg-slate-700/80">
          <div
            className="h-full rounded-full bg-gradient-to-l from-[var(--amline-accent)] to-[var(--amline-accent)]/75 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <ol className="flex items-start justify-between gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {VISUAL_STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(step);
          const isCurrent = step === currentStep;
          const isEditable = editableSteps.includes(step);
          const isPast = index < currentVisualIndex;
          const isClickable =
            Boolean(onStepClick) &&
            (freeStepNavigation || (isCompleted && isEditable));

          return (
            <li key={step} className="flex min-w-[4.5rem] flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => isClickable && onStepClick?.(step)}
                disabled={!isClickable}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`${registry[step].label}${isCompleted ? ' — تکمیل‌شده' : ''}`}
                className={[
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-200',
                  isCompleted
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                    : isCurrent
                      ? 'bg-[var(--amline-accent)] text-white shadow-lg shadow-[var(--amline-accent)]/30 ring-2 ring-[var(--amline-accent)]/40 ring-offset-2 ring-offset-[var(--amline-surface)] dark:ring-offset-slate-900'
                      : isPast
                        ? 'bg-[var(--amline-border)] text-[var(--amline-fg-muted)] dark:bg-slate-600'
                        : 'border border-dashed border-[var(--amline-border)] bg-[var(--amline-surface)] text-[var(--amline-fg-subtle)] dark:bg-slate-800/80',
                  isClickable
                    ? 'cursor-pointer hover:scale-105 hover:opacity-95 active:scale-100'
                    : 'cursor-default opacity-90',
                ].join(' ')}
              >
                {isCompleted ? '✓' : isCurrent ? '●' : index + 1}
              </button>
              <span
                className={[
                  'max-w-[5.5rem] text-center text-[11px] leading-tight sm:text-xs',
                  isCurrent
                    ? 'font-semibold text-[var(--amline-accent)]'
                    : 'text-[var(--amline-fg-muted)]',
                ].join(' ')}
              >
                {registry[step].label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
