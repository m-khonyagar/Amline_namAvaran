import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { contractApi } from '../../api/contractApi';
import type { StepProps } from '../../types/wizard';
import { OtpForm } from '../OtpForm';
import { StepErrorBanner } from '../StepErrorBanner';
import { validateIranianNationalCode } from '../../schemas/partySchema';

const witnessSchema = z.object({
  national_code: z.string().length(10).refine(validateIranianNationalCode, 'کد ملی نامعتبر است'),
  mobile: z.string().regex(/^09\d{9}$/, 'شماره موبایل نامعتبر است'),
  witness_type: z.enum(['LANDLORD', 'TENANT']),
  witness_name: z.string().optional(),
});

type WitnessFormData = z.infer<typeof witnessSchema>;
type WitnessPhase = 'form' | 'otp_sent' | 'done';

export function WitnessStep({ contractId, contractType, onComplete }: StepProps) {
  const [phase, setPhase] = useState<WitnessPhase>('form');
  const [witnessData, setWitnessData] = useState<WitnessFormData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<WitnessFormData>({
    resolver: zodResolver(witnessSchema),
    defaultValues: { witness_type: 'LANDLORD' },
  });

  async function handleAddWitness(data: WitnessFormData) {
    setIsLoading(true);
    setError(null);
    try {
      await contractApi.addWitness(contractId, { next_step: 'WITNESS' });
      await contractApi.sendWitnessOtp(contractId, {
        national_code: data.national_code,
        mobile: data.mobile,
        witness_type: data.witness_type,
        witness_name: data.witness_name,
      });
      setWitnessData(data);
      setPhase('otp_sent');
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? 'خطا در ثبت شاهد');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerifyOtp(otp: string) {
    if (!witnessData) return;
    setOtpError(null);
    setIsLoading(true);
    try {
      const res = await contractApi.verifyWitness(contractId, {
        otp,
        mobile: witnessData.mobile,
        national_code: witnessData.national_code,
        salt: '',
        witness_type: witnessData.witness_type,
      });
      if (res.data.ok) {
        setPhase('done');
        onComplete('FINISH');
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setOtpError(e.message ?? 'کد وارد شده نادرست است');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResendOtp() {
    if (!witnessData) return;
    await contractApi.sendWitnessOtp(contractId, {
      national_code: witnessData.national_code,
      mobile: witnessData.mobile,
      witness_type: witnessData.witness_type,
    });
  }

  const landlordLabel = contractType === 'PROPERTY_RENT' ? 'مالک' : 'فروشنده';
  const tenantLabel = contractType === 'PROPERTY_RENT' ? 'مستاجر' : 'خریدار';

  return (
    <div dir="rtl" className="space-y-4">
      <h2 className="text-lg font-bold text-gray-800">شاهد قرارداد</h2>
      <StepErrorBanner message={error} onDismiss={() => setError(null)} />

      {phase === 'form' && (
        <form onSubmit={handleSubmit(handleAddWitness)} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">نوع شاهد *</label>
            <select
              {...register('witness_type')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="LANDLORD">شاهد {landlordLabel}</option>
              <option value="TENANT">شاهد {tenantLabel}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">نام شاهد</label>
            <input
              {...register('witness_name')}
              type="text"
              placeholder="نام و نام خانوادگی"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">کد ملی شاهد *</label>
            <input
              {...register('national_code')}
              type="text"
              inputMode="numeric"
              maxLength={10}
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${errors.national_code ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.national_code && <p className="mt-1 text-xs text-red-600">{errors.national_code.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">موبایل شاهد *</label>
            <input
              {...register('mobile')}
              type="tel"
              inputMode="numeric"
              maxLength={11}
              placeholder="09xxxxxxxxx"
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${errors.mobile ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.mobile && <p className="mt-1 text-xs text-red-600">{errors.mobile.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-white rounded-lg py-2.5 font-medium disabled:opacity-50"
          >
            {isLoading ? 'در حال ارسال...' : 'ارسال OTP به شاهد'}
          </button>
        </form>
      )}

      {phase === 'otp_sent' && witnessData && (
        <OtpForm
          mobile={witnessData.mobile}
          onVerify={handleVerifyOtp}
          onResend={handleResendOtp}
          isLoading={isLoading}
          error={otpError}
        />
      )}
    </div>
  );
}
