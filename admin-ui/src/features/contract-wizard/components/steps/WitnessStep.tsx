import { useCallback, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';
import { contractApi } from '../../api/contractApi';
import type { StepProps } from '../../types/wizard';
import type { WitnessType } from '../../types/api';
import { OtpForm } from '../OtpForm';
import { StepErrorBanner } from '../StepErrorBanner';
import { ensureMappedError } from '../../../../lib/errorMapper';
import { useMappedStepError } from '../../hooks/useMappedStepError';
import { validateIranianNationalCode } from '../../schemas/partySchema';
import { useWizard } from '../../engine/WizardContext';
import { STEP_ORDER } from '../../registry/stepRegistry';
import {
  WfFieldBlock,
  WfInfoIcon,
  WfInput,
} from '../wizardFigma/Primitives';
import '../wizardFigma/wizardFigma.css';
import { DEV_FIXED_TEST_OTP, isAdminDevBypassEnabled } from '../../../../lib/devLocalAuth';

const witnessFieldSchema = z.object({
  national_code: z.string().length(10).refine(validateIranianNationalCode, 'کد ملی نامعتبر است'),
  mobile: z.string().regex(/^09\d{9}$/, 'شماره موبایل نامعتبر است'),
  witness_name: z.string().optional(),
});

type WitnessFieldData = z.infer<typeof witnessFieldSchema>;
type Phase = 'form' | 'otp';

interface WitnessSlotState {
  phase: Phase;
  data: WitnessFieldData | null;
}

const initialSlot: WitnessSlotState = { phase: 'form', data: null };

export function WitnessStep({ contractId, contractType, onComplete }: StepProps) {
  const devQuickOtp = isAdminDevBypassEnabled() ? DEV_FIXED_TEST_OTP : undefined;
  const { dispatch } = useWizard();
  const [landlord, setLandlord] = useState<WitnessSlotState>(initialSlot);
  const [tenant, setTenant] = useState<WitnessSlotState>(initialSlot);
  const [landlordDone, setLandlordDone] = useState(false);
  const [loadingSlot, setLoadingSlot] = useState<'landlord' | 'tenant' | null>(null);
  const { error, details, hint, setFromError, clear } = useMappedStepError();
  const [otpErrors, setOtpErrors] = useState<{ landlord?: string | null; tenant?: string | null }>({});

  const landlordForm = useForm<WitnessFieldData>({
    resolver: zodResolver(witnessFieldSchema),
    defaultValues: { national_code: '', mobile: '', witness_name: '' },
  });

  const tenantForm = useForm<WitnessFieldData>({
    resolver: zodResolver(witnessFieldSchema),
    defaultValues: { national_code: '', mobile: '', witness_name: '' },
  });

  const landlordLabel = contractType === 'PROPERTY_RENT' ? 'مالک' : 'فروشنده';
  const tenantLabel = contractType === 'PROPERTY_RENT' ? 'مستاجر' : 'خریدار';

  const goBack = useCallback(() => {
    const ok = window.confirm(
      'آیا مطمئن هستید می‌خواهید به مرحله قبل برگردید؟ پیشرفت تأیید شاهد ممکن است از دست برود.'
    );
    if (!ok) return;
    const idx = STEP_ORDER.indexOf('WITNESS');
    const prev = idx > 0 ? STEP_ORDER[idx - 1] : 'SIGNING';
    dispatch({ type: 'APPLY_NEXT_STEP', payload: { nextStep: prev } });
  }, [dispatch]);

  async function submitWitness(slot: 'landlord' | 'tenant', data: WitnessFieldData, type: WitnessType) {
    setLoadingSlot(slot);
    clear();
    setOtpErrors((o) => ({ ...o, [slot]: null }));
    try {
      await contractApi.addWitness(contractId, { next_step: 'WITNESS' });
      await contractApi.sendWitnessOtp(contractId, {
        national_code: data.national_code,
        mobile: data.mobile,
        witness_type: type,
        witness_name: data.witness_name || undefined,
      });
      if (slot === 'landlord') {
        setLandlord({ phase: 'otp', data });
      } else {
        setTenant({ phase: 'otp', data });
      }
    } catch (err: unknown) {
      setFromError(err);
    } finally {
      setLoadingSlot(null);
    }
  }

  async function verifyOtp(slot: 'landlord' | 'tenant', type: WitnessType, otp: string) {
    const data = slot === 'landlord' ? landlord.data : tenant.data;
    if (!data) return;
    setLoadingSlot(slot);
    setOtpErrors((o) => ({ ...o, [slot]: null }));
    try {
      const res = await contractApi.verifyWitness(contractId, {
        otp,
        mobile: data.mobile,
        national_code: data.national_code,
        salt: '',
        witness_type: type,
      });
      if (res.data.ok) {
        if (slot === 'landlord') {
          setLandlordDone(true);
          setLandlord({ phase: 'form', data: null });
          landlordForm.reset();
        } else {
          onComplete('FINISH');
        }
      }
    } catch (err: unknown) {
      setOtpErrors((o) => ({ ...o, [slot]: ensureMappedError(err).message }));
    } finally {
      setLoadingSlot(null);
    }
  }

  async function resendOtp(slot: 'landlord' | 'tenant', type: WitnessType) {
    const data = slot === 'landlord' ? landlord.data : tenant.data;
    if (!data) return;
    await contractApi.sendWitnessOtp(contractId, {
      national_code: data.national_code,
      mobile: data.mobile,
      witness_type: type,
      witness_name: data.witness_name || undefined,
    });
  }

  const landlordExpanded = !landlordDone && (landlord.phase === 'form' || landlord.phase === 'otp');
  const tenantExpanded = landlordDone && (tenant.phase === 'form' || tenant.phase === 'otp');

  return (
    <div dir="rtl" className="wizard-figma space-y-4">
      <div className="flex flex-col shadow-sm">
        <div className="flex h-14 items-center justify-between border-b-2 border-[var(--wf-border)] bg-[var(--wf-surface)] px-6 py-2">
          <button
            type="button"
            onClick={goBack}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[var(--wf-title)] hover:bg-[var(--wf-light-surface)]"
            aria-label="بازگشت"
          >
            <ChevronRight className="size-6" strokeWidth={1.5} />
          </button>
          <h2 className="min-w-0 flex-1 text-center wf-subtitle-m font-medium text-[var(--wf-title)]">
            افزودن شاهدین قرارداد
          </h2>
          <span className="w-9 shrink-0" aria-hidden />
        </div>
      </div>

      <StepErrorBanner message={error} details={details} hint={hint} onDismiss={() => clear()} />

      <div className="mx-auto flex w-full max-w-[375px] flex-col gap-4">
        <WitnessSection
          title={`اطلاعات شاهد ${landlordLabel}`}
          expanded={landlordExpanded}
          done={landlordDone}
          chevronUp={landlordExpanded}
        >
          {landlordExpanded && landlord.phase === 'form' && (
            <form
              className="flex flex-col gap-8"
              onSubmit={landlordForm.handleSubmit((d) => void submitWitness('landlord', d, 'LANDLORD'))}
              noValidate
            >
              <WfFieldBlock
                label="کدملی"
                labelFor="wf-witness-ll-nc"
                hint="کدملی و شماره موبایل باید متعلق به یک نفر باشد"
                hintIcon={<WfInfoIcon />}
                error={landlordForm.formState.errors.national_code?.message}
              >
                <WfInput
                  id="wf-witness-ll-nc"
                  {...landlordForm.register('national_code')}
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="کدملی شاهد را وارد کنید"
                  error={!!landlordForm.formState.errors.national_code}
                />
              </WfFieldBlock>
              <WfFieldBlock
                label="شماره موبایل"
                labelFor="wf-witness-ll-mob"
                error={landlordForm.formState.errors.mobile?.message}
              >
                <WfInput
                  id="wf-witness-ll-mob"
                  {...landlordForm.register('mobile')}
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  placeholder="شماره موبایل شاهد را وارد کنید"
                  error={!!landlordForm.formState.errors.mobile}
                />
              </WfFieldBlock>
              <button
                type="submit"
                disabled={
                  loadingSlot === 'landlord' ||
                  !landlordForm.watch('national_code')?.trim() ||
                  !landlordForm.watch('mobile')?.trim()
                }
                className="inline-flex h-8 max-h-8 min-h-8 min-w-8 items-center justify-center gap-1.5 self-start rounded-lg px-1.5 text-xs font-bold transition-colors disabled:bg-[var(--wf-light-surface)] disabled:text-[var(--wf-disable-2)] enabled:bg-[var(--amline-accent)] enabled:text-white"
              >
                <span>ارسال کد امضا</span>
                <CheckCircle2 className="size-5 opacity-80" strokeWidth={1.5} />
              </button>
            </form>
          )}
          {landlordExpanded && landlord.phase === 'otp' && landlord.data && (
            <OtpForm
              mobile={landlord.data.mobile}
              onVerify={(otp) => verifyOtp('landlord', 'LANDLORD', otp)}
              onResend={() => resendOtp('landlord', 'LANDLORD')}
              isLoading={loadingSlot === 'landlord'}
              error={otpErrors.landlord}
              devQuickOtp={devQuickOtp}
            />
          )}
        </WitnessSection>

        <WitnessSection
          title={`اطلاعات شاهد ${tenantLabel}`}
          expanded={tenantExpanded}
          done={false}
          chevronUp={tenantExpanded}
          disabled={!landlordDone}
        >
          {tenantExpanded && tenant.phase === 'form' && (
            <form
              className="flex flex-col gap-8"
              onSubmit={tenantForm.handleSubmit((d) => void submitWitness('tenant', d, 'TENANT'))}
              noValidate
            >
              <WfFieldBlock
                label="کدملی"
                labelFor="wf-witness-tn-nc"
                hint="کدملی و شماره موبایل باید متعلق به یک نفر باشد"
                hintIcon={<WfInfoIcon />}
                error={tenantForm.formState.errors.national_code?.message}
              >
                <WfInput
                  id="wf-witness-tn-nc"
                  {...tenantForm.register('national_code')}
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="کدملی شاهد را وارد کنید"
                  error={!!tenantForm.formState.errors.national_code}
                />
              </WfFieldBlock>
              <WfFieldBlock
                label="شماره موبایل"
                labelFor="wf-witness-tn-mob"
                error={tenantForm.formState.errors.mobile?.message}
              >
                <WfInput
                  id="wf-witness-tn-mob"
                  {...tenantForm.register('mobile')}
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  placeholder="شماره موبایل شاهد را وارد کنید"
                  error={!!tenantForm.formState.errors.mobile}
                />
              </WfFieldBlock>
              <button
                type="submit"
                disabled={
                  loadingSlot === 'tenant' ||
                  !tenantForm.watch('national_code')?.trim() ||
                  !tenantForm.watch('mobile')?.trim()
                }
                className="inline-flex h-8 max-h-8 min-h-8 min-w-8 items-center justify-center gap-1.5 self-start rounded-lg px-1.5 text-xs font-bold transition-colors disabled:bg-[var(--wf-light-surface)] disabled:text-[var(--wf-disable-2)] enabled:bg-[var(--amline-accent)] enabled:text-white"
              >
                <span>ارسال کد امضا</span>
                <CheckCircle2 className="size-5 opacity-80" strokeWidth={1.5} />
              </button>
            </form>
          )}
          {tenantExpanded && tenant.phase === 'otp' && tenant.data && (
            <OtpForm
              mobile={tenant.data.mobile}
              onVerify={(otp) => verifyOtp('tenant', 'TENANT', otp)}
              onResend={() => resendOtp('tenant', 'TENANT')}
              isLoading={loadingSlot === 'tenant'}
              error={otpErrors.tenant}
              devQuickOtp={devQuickOtp}
            />
          )}
        </WitnessSection>
      </div>
    </div>
  );
}

function WitnessSection({
  title,
  expanded,
  done,
  chevronUp,
  disabled,
  children,
}: {
  title: string;
  expanded: boolean;
  done: boolean;
  chevronUp: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  const header = (
    <>
      <span className="flex size-6 shrink-0 items-center justify-center text-[var(--wf-paragraph-2)]">
        {chevronUp ? <ChevronUp className="size-6" /> : <ChevronDown className="size-6" />}
      </span>
      <span className="flex min-w-0 flex-1 items-center justify-end gap-2 wf-subtitle-m font-medium text-[var(--wf-paragraph-2)]">
        <span className="truncate">{title}</span>
        {done ? <CheckCircle2 className="size-5 shrink-0 text-[var(--amline-accent)]" strokeWidth={2} /> : null}
      </span>
    </>
  );

  return (
    <div
      className={`flex w-full flex-col gap-4 border border-[var(--wf-border)] bg-[var(--wf-surface)] p-4 ${
        disabled ? 'opacity-60' : ''
      }`}
      style={{ borderRadius: 'var(--wf-field-radius)' }}
    >
      <div className="flex w-full items-center justify-between gap-2 text-right">{header}</div>
      {expanded ? (
        <>
          <div className="h-px w-full bg-[var(--wf-border)]" />
          {children}
        </>
      ) : null}
    </div>
  );
}
