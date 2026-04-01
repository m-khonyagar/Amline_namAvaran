import { useState } from 'react';
import { contractApi } from '../../api/contractApi';
import type { ContractType, PRContractStep } from '../../types/wizard';
import { StepErrorBanner } from '../StepErrorBanner';
import { useMappedStepError } from '../../hooks/useMappedStepError';
import type { PartyType } from '../../types/api';

interface StartStepProps {
  platform: 'admin' | 'user';
  onStart: (params: {
    contractId: string;
    nextStep: PRContractStep;
    contractType: ContractType;
    isScribeMode: boolean;
  }) => void;
}

export function StartStep({ onStart }: StartStepProps) {
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

  return (
    <div dir="rtl" className="space-y-6 max-w-md mx-auto py-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">انعقاد قرارداد جدید</h1>
        <p className="text-sm text-gray-500">نوع قرارداد و حالت ثبت را انتخاب کنید</p>
      </div>

      <StepErrorBanner message={error} details={details} hint={hint} onDismiss={() => clear()} />

      {/* انتخاب نوع قرارداد */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">نوع قرارداد</p>
        <div className="grid grid-cols-2 gap-3">
          {([
            { value: 'PROPERTY_RENT', label: 'رهن و اجاره', icon: '🏠' },
            { value: 'BUYING_AND_SELLING', label: 'خرید و فروش', icon: '🤝' },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setContractType(opt.value)}
              className={[
                'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                contractType === opt.value
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300',
              ].join(' ')}
            >
              <span className="text-2xl">{opt.icon}</span>
              <span className="text-sm font-medium">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* نقش شروع‌کننده قرارداد */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">نقش شما در شروع قرارداد</p>
        <div className="grid grid-cols-2 gap-3">
          {([
            { value: 'LANDLORD' as const, label: contractType === 'PROPERTY_RENT' ? 'مالک' : 'فروشنده' },
            { value: 'TENANT' as const, label: contractType === 'PROPERTY_RENT' ? 'مستاجر' : 'خریدار' },
          ]).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPartyType(opt.value)}
              className={[
                'rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all',
                partyType === opt.value
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* انتخاب حالت کاتب */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">حالت ثبت</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: false, label: 'برای خودم', desc: 'من طرف قرارداد هستم', icon: '👤' },
            { value: true, label: 'برای دیگران', desc: 'کاتب قرارداد هستم', icon: '✍️' },
          ].map((opt) => (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => setIsScribeMode(opt.value)}
              className={[
                'flex flex-col items-start gap-1 p-4 rounded-xl border-2 transition-all text-right',
                isScribeMode === opt.value
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-gray-300',
              ].join(' ')}
            >
              <span className="text-xl">{opt.icon}</span>
              <span className="text-sm font-medium text-gray-800">{opt.label}</span>
              <span className="text-xs text-gray-500">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={handleStart}
        disabled={isLoading}
        className="w-full bg-primary text-white rounded-xl py-3 font-bold text-base disabled:opacity-50"
      >
        {isLoading ? 'در حال شروع...' : 'شروع قرارداد'}
      </button>
    </div>
  );
}
