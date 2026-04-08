import { useState } from 'react';
import { contractApi } from '../../api/contractApi';
import type { ContractType, PRContractStep } from '../../types/wizard';
import { StepErrorBanner } from '../StepErrorBanner';
import { useMappedStepError } from '../../hooks/useMappedStepError';
import type { PartyType } from '../../types/api';

interface StartStepProps {
  platform: 'admin' | 'user';
  /** فقط dev + env: دکمهٔ پیش‌نمایش بدون API */
  previewMode?: boolean;
  onStart: (params: {
    contractId: string;
    nextStep: PRContractStep;
    contractType: ContractType;
    isScribeMode: boolean;
  }) => void;
  onPreviewBootstrap?: (params: {
    contractId: string;
    nextStep: PRContractStep;
    contractType: ContractType;
    isScribeMode: boolean;
  }) => void;
}

export function StartStep({ platform, previewMode, onStart, onPreviewBootstrap }: StartStepProps) {
  const [contractType, setContractType] = useState<ContractType>('PROPERTY_RENT');
  const [partyType, setPartyType] = useState<PartyType>('LANDLORD');
  const [isScribeMode, setIsScribeMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { error, details, hint, setFromError, clear } = useMappedStepError();

  async function handleStart() {
    setIsLoading(true);
    clear();
    try {
      const res = await contractApi.start({
        contract_type: contractType,
        party_type: partyType,
      });
      const data = res.data;
      onStart({
        contractId: data.id,
        nextStep: (data.step ?? 'LANDLORD_INFORMATION') as PRContractStep,
        contractType,
        isScribeMode,
      });
    } catch (err: unknown) {
      setFromError(err);
    } finally {
      setIsLoading(false);
    }
  }

  function handlePreviewBootstrap() {
    if (!onPreviewBootstrap) return;
    const contractId = `local-preview__${contractType}__${Date.now()}`;
    onPreviewBootstrap({
      contractId,
      nextStep: 'LANDLORD_INFORMATION',
      contractType,
      isScribeMode,
    });
  }

  const cardBtn =
    'rounded-[var(--amline-radius-lg)] border-2 transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--amline-accent)]';

  return (
    <div dir="rtl" className="mx-auto max-w-lg space-y-8 py-2">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--amline-fg-subtle)]">
          {platform === 'admin' ? 'پنل مدیریت' : 'قرارداد'}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--amline-fg)] sm:text-3xl">
          انعقاد قرارداد جدید
        </h1>
        <p className="mt-2 text-sm text-[var(--amline-fg-muted)]">
          نوع قرارداد، نقش و حالت ثبت را انتخاب کنید
        </p>
      </div>

      {previewMode && (
        <div className="rounded-[var(--amline-radius-lg)] border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-100">
          <span className="font-semibold">حالت پیش‌نمایش ویزارد</span>
          <span className="mt-1 block text-xs opacity-90">
            می‌توانید بدون تکمیل فرم بین مراحل جابه‌جا شوید یا با «پیش‌نمایش UI» بدون درخواست سرور وارد ویزارد شوید (نیاز به MSW در dev).
          </span>
        </div>
      )}

      <StepErrorBanner message={error} details={details} hint={hint} onDismiss={() => clear()} />

      {/* انتخاب نوع قرارداد — Master Spec v2 */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">نوع قرارداد</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {([
            { value: 'PROPERTY_RENT' as const, label: 'رهن و اجاره', icon: '🏠' },
            { value: 'BUYING_AND_SELLING' as const, label: 'خرید و فروش', icon: '🤝' },
            { value: 'EXCHANGE' as const, label: 'معاوضه', icon: '🔁' },
            { value: 'CONSTRUCTION' as const, label: 'مشارکت در ساخت', icon: '🏗️' },
            { value: 'PRE_SALE' as const, label: 'پیش‌فروش', icon: '🏢' },
            { value: 'LEASE_TO_OWN' as const, label: 'اجاره به شرط تملیک', icon: '📜' },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setContractType(opt.value)}
              className={[
                cardBtn,
                'flex flex-col items-center gap-2 p-4 text-center',
                contractType === opt.value
                  ? 'border-[var(--amline-accent)] bg-[var(--amline-accent)]/8 text-[var(--amline-accent)] shadow-sm'
                  : 'border-[var(--amline-border)] bg-[var(--amline-surface)] text-[var(--amline-fg-muted)] hover:border-[var(--amline-fg-subtle)]/50',
              ].join(' ')}
            >
              <span className="text-2xl">{opt.icon}</span>
              <span className="text-sm font-medium text-center leading-snug">{opt.label}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          انواع جدید در ویزارد فعلاً از مسیر خرید/فروش عبور می‌کنند؛ شرایط اختصاصی را در API با PATCH /terms ثبت کنید.
        </p>
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold text-[var(--amline-fg)]">نقش شما در شروع</p>
        <div className="grid grid-cols-2 gap-3">
          {([
            {
              value: 'LANDLORD' as const,
              label:
                contractType === 'PROPERTY_RENT'
                  ? 'موجر / مالک'
                  : contractType === 'BUYING_AND_SELLING'
                    ? 'فروشنده'
                    : 'طرف اول',
            },
            {
              value: 'TENANT' as const,
              label:
                contractType === 'PROPERTY_RENT'
                  ? 'مستأجر'
                  : contractType === 'BUYING_AND_SELLING'
                    ? 'خریدار'
                    : 'طرف دوم',
            },
          ]).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPartyType(opt.value)}
              className={[
                cardBtn,
                'px-4 py-3 text-sm font-medium',
                partyType === opt.value
                  ? 'border-[var(--amline-accent)] bg-[var(--amline-accent)]/8 text-[var(--amline-accent)]'
                  : 'border-[var(--amline-border)] text-[var(--amline-fg-muted)] hover:border-[var(--amline-fg-subtle)]/50',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold text-[var(--amline-fg)]">حالت ثبت</p>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              { value: false, label: 'برای خودم', desc: 'من طرف قرارداد هستم', icon: '👤' },
              { value: true, label: 'برای دیگران', desc: 'کاتب قرارداد هستم', icon: '✍️' },
            ] as const
          ).map((opt) => (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => setIsScribeMode(opt.value)}
              className={[
                cardBtn,
                'flex flex-col items-start gap-1 p-4 text-right',
                isScribeMode === opt.value
                  ? 'border-[var(--amline-accent)] bg-[var(--amline-accent)]/8'
                  : 'border-[var(--amline-border)] hover:border-[var(--amline-fg-subtle)]/50',
              ].join(' ')}
            >
              <span className="text-xl" aria-hidden>
                {opt.icon}
              </span>
              <span className="text-sm font-semibold text-[var(--amline-fg)]">{opt.label}</span>
              <span className="text-xs text-[var(--amline-fg-muted)]">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={handleStart}
          disabled={isLoading}
          className="w-full rounded-[var(--amline-radius-lg)] bg-[var(--amline-accent)] py-3.5 text-base font-bold text-white shadow-md transition hover:opacity-95 disabled:opacity-50"
        >
          {isLoading ? 'در حال شروع...' : 'شروع قرارداد (ثبت در سرور)'}
        </button>
        {previewMode && onPreviewBootstrap && (
          <button
            type="button"
            onClick={handlePreviewBootstrap}
            disabled={isLoading}
            className="w-full rounded-[var(--amline-radius-lg)] border border-[var(--amline-border)] bg-[var(--amline-surface)] py-3 text-sm font-semibold text-[var(--amline-fg)] transition hover:bg-[var(--amline-surface-muted)] disabled:opacity-50 dark:border-slate-600"
          >
            پیش‌نمایش UI — بدون ثبت در سرور
          </button>
        )}
      </div>
    </div>
  );
}
