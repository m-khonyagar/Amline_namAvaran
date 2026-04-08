import { getStepRegistry, STEP_ORDER } from '../registry/stepRegistry';
import type { ContractType, PRContractStep } from '../types/wizard';

export function getNextContractStep(current: PRContractStep): PRContractStep | null {
  const i = STEP_ORDER.indexOf(current);
  if (i < 0 || i >= STEP_ORDER.length - 1) return null;
  return STEP_ORDER[i + 1];
}

type Props = {
  contractType: ContractType;
  currentStep: PRContractStep;
  onJumpNext: (next: PRContractStep) => void;
};

/**
 * در پنل ادمین: پرش به مرحلهٔ بعد بدون ارسال فرم این مرحله (وضعیت UI؛ API ممکن است هم‌خوان نباشد).
 */
export function AdminWizardStepToolbar({ contractType, currentStep, onJumpNext }: Props) {
  const next = getNextContractStep(currentStep);
  if (!next || next === 'DRAFT') return null;

  const reg = getStepRegistry(contractType);
  const label = reg[next]?.label ?? next;

  return (
    <div className="rounded-[var(--amline-radius-lg)] border border-amber-200/90 bg-amber-50/95 p-4 text-sm dark:border-amber-700/50 dark:bg-amber-950/35">
      <p className="font-semibold text-amber-950 dark:text-amber-100">حالت ادمین</p>
      <p className="mt-1 text-[var(--amline-fg-muted)] dark:text-amber-200/85">
        می‌توانید بدون تکمیل یا ثبت این مرحله در سرور، مستقیم به مرحلهٔ بعد بروید (مثلاً برای تست جریان یا آموزش).
      </p>
      <button
        type="button"
        onClick={() => onJumpNext(next)}
        className="mt-3 w-full rounded-[var(--amline-radius-md)] border border-amber-600/40 bg-white px-4 py-2.5 text-sm font-bold text-amber-900 shadow-sm transition hover:bg-amber-100 dark:border-amber-600/50 dark:bg-amber-900/50 dark:text-amber-50 dark:hover:bg-amber-900/70 sm:w-auto"
      >
        رد کردن این مرحله و رفتن به «{label}»
      </button>
    </div>
  );
}
