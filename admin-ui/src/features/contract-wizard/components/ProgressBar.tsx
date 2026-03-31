import { getProgress, STEP_ORDER } from '../registry/stepRegistry';
import type { ContractType, PRContractStep } from '../types/wizard';
import { getStepRegistry } from '../registry/stepRegistry';

interface ProgressBarProps {
  currentStep: PRContractStep;
  completedSteps: PRContractStep[];
  contractType: ContractType;
  editableSteps?: PRContractStep[];
  onStepClick?: (step: PRContractStep) => void;
}

export function ProgressBar({
  currentStep,
  completedSteps,
  contractType,
  editableSteps = [],
  onStepClick,
}: ProgressBarProps) {
  const registry = getStepRegistry(contractType);
  const progress = getProgress(currentStep);
  const currentIndex = STEP_ORDER.indexOf(currentStep);

  return (
    <div dir="rtl" className="w-full" role="navigation" aria-label="مراحل قرارداد">
      {/* نمایش درصد پیشرفت */}
      <div className="flex items-center justify-between mb-3 text-sm text-gray-600">
        <span>{currentIndex + 1} از {STEP_ORDER.length} مرحله</span>
        <span>{progress}٪</span>
      </div>

      {/* نوار پیشرفت */}
      <div className="relative mb-4">
        <div className="h-1.5 bg-gray-200 rounded-full">
          <div
            className="h-1.5 bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* مراحل */}
      <ol className="flex items-start justify-between gap-1 overflow-x-auto pb-2">
        {STEP_ORDER.map((step, index) => {
          const isCompleted = completedSteps.includes(step);
          const isCurrent = step === currentStep;
          const isEditable = editableSteps.includes(step);
          const isPast = index < currentIndex;
          const isClickable = isCompleted && isEditable && onStepClick;

          return (
            <li
              key={step}
              className="flex flex-col items-center gap-1 min-w-[60px]"
            >
              <button
                type="button"
                onClick={() => isClickable && onStepClick(step)}
                disabled={!isClickable}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`${registry[step].label}${isCompleted ? ' — تکمیل‌شده' : ''}`}
                className={[
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all',
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isCurrent
                    ? 'bg-primary text-white ring-2 ring-primary ring-offset-2'
                    : isPast
                    ? 'bg-gray-300 text-gray-500'
                    : 'bg-gray-100 text-gray-400 border border-gray-300',
                  isClickable ? 'cursor-pointer hover:opacity-80' : 'cursor-default',
                ].join(' ')}
              >
                {isCompleted ? '✓' : isCurrent ? '●' : index + 1}
              </button>
              <span
                className={[
                  'text-xs text-center leading-tight',
                  isCurrent ? 'text-primary font-semibold' : 'text-gray-500',
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
