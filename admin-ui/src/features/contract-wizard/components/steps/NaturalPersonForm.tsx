import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { naturalPersonSchema, type NaturalPersonFormData } from '../../schemas/partySchema';
import { resolveService } from '../../services/resolveService';
import {
  WfSectionDivider,
  WfLabeledRadio,
  WfFieldBlock,
  WfInput,
  WfSelect,
  WfShebaRow,
  WfInfoIcon,
} from '../wizardFigma/Primitives';

interface NaturalPersonFormProps {
  defaultValues?: Partial<NaturalPersonFormData>;
  onSubmit: (data: NaturalPersonFormData) => void;
  isLoading?: boolean;
  submitLabel?: string;
}

function parseBirthParts(s?: string): { y: string; m: string; d: string } {
  if (!s) return { y: '', m: '', d: '' };
  const m = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(s.trim());
  if (!m) return { y: '', m: '', d: '' };
  return { y: m[1], m: String(Number(m[2])), d: String(Number(m[3])) };
}

const J_YEARS = Array.from({ length: 1410 - 1310 + 1 }, (_, i) => String(1310 + i)).reverse();
const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1));

export function NaturalPersonForm({
  defaultValues,
  onSubmit,
  isLoading,
  submitLabel = 'ثبت اطلاعات',
}: NaturalPersonFormProps) {
  const [acctKind, setAcctKind] = useState<'sheba' | 'card'>('sheba');
  const initialBd = useMemo(() => parseBirthParts(defaultValues?.birth_date), [defaultValues?.birth_date]);
  const [bdY, setBdY] = useState(initialBd.y);
  const [bdM, setBdM] = useState(initialBd.m);
  const [bdD, setBdD] = useState(initialBd.d);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<NaturalPersonFormData>({
    resolver: zodResolver(naturalPersonSchema),
    defaultValues: {
      is_forigen_citizen: false,
      family_members_count: null,
      home_electricy_bill: '',
      ...defaultValues,
    },
  });

  const nationalCode = watch('national_code');
  const bankAccount = watch('bank_account');

  useEffect(() => {
    if (bdY && bdM && bdD) {
      const composed = `${bdY}/${bdM.padStart(2, '0')}/${bdD.padStart(2, '0')}`;
      setValue('birth_date', composed, { shouldValidate: true });
    }
  }, [bdY, bdM, bdD, setValue]);

  useEffect(() => {
    if (!nationalCode || nationalCode.length !== 10) return;
    resolveService('ORGANIZATION_CODE', nationalCode, (res, err) => {
      if (err) setError('national_code', { message: err });
      else if (res?.result) clearErrors('national_code');
    });
  }, [nationalCode, setError, clearErrors]);

  useEffect(() => {
    if (!bankAccount || !/^IR\d{24}$/.test(bankAccount)) return;
    resolveService('BANK_IBAN', bankAccount, (res, err) => {
      if (err) setError('bank_account', { message: err });
      else if (res?.result) clearErrors('bank_account');
    });
  }, [bankAccount, setError, clearErrors]);

  return (
    <form
      dir="rtl"
      onSubmit={handleSubmit(onSubmit)}
      className="wizard-figma space-y-4"
      noValidate
    >
      <input type="hidden" {...register('birth_date')} />

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-8">
          <WfFieldBlock
            label="کدملی"
            labelFor="np-national"
            hint="کدملی و شماره موبایل باید متعلق به یک نفر باشد"
            hintIcon={<WfInfoIcon />}
            error={errors.national_code?.message}
          >
            <WfInput
              id="np-national"
              {...register('national_code')}
              inputMode="numeric"
              maxLength={10}
              placeholder="کدملی خود را وارد کنید"
              error={!!errors.national_code}
            />
          </WfFieldBlock>

          <WfFieldBlock
            label="شماره موبایل"
            labelFor="np-mobile"
            error={errors.mobile?.message}
          >
            <WfInput
              id="np-mobile"
              {...register('mobile')}
              type="tel"
              inputMode="numeric"
              maxLength={11}
              placeholder="شماره موبایل خود را وارد کنید"
              error={!!errors.mobile}
            />
          </WfFieldBlock>

          <div className="flex w-full max-w-[327px] flex-col gap-2">
            <span className="block w-full text-right wf-subtitle-m text-[var(--wf-title)]">تاریخ تولد</span>
            <div className="flex flex-row-reverse gap-1">
              <WfSelect
                className="min-w-0 flex-1"
                value={bdD}
                onChange={(e) => setBdD(e.target.value)}
                aria-label="روز تولد"
              >
                <option value="">روز</option>
                {DAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </WfSelect>
              <WfSelect
                className="min-w-0 flex-1"
                value={bdM}
                onChange={(e) => setBdM(e.target.value)}
                aria-label="ماه تولد"
              >
                <option value="">ماه</option>
                {MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </WfSelect>
              <WfSelect
                className="min-w-0 flex-1"
                value={bdY}
                onChange={(e) => setBdY(e.target.value)}
                aria-label="سال تولد"
              >
                <option value="">سال</option>
                {J_YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </WfSelect>
            </div>
            {errors.birth_date?.message ? (
              <p className="text-xs text-red-600" role="alert">
                {errors.birth_date.message}
              </p>
            ) : null}
          </div>
        </div>

        <WfSectionDivider label="اطلاعات حساب" />

        <div className="flex flex-col gap-3">
          <div className="flex flex-row-reverse flex-wrap items-center justify-end gap-6">
            <WfLabeledRadio
              label="شماره شبا"
              name="np_acct"
              value="sheba"
              id="np-acct-sheba"
              checked={acctKind === 'sheba'}
              onChange={() => setAcctKind('sheba')}
            />
            <WfLabeledRadio
              label="شماره کارت"
              name="np_acct"
              value="card"
              id="np-acct-card"
              checked={acctKind === 'card'}
              onChange={() => setAcctKind('card')}
            />
          </div>

          {acctKind === 'sheba' ? (
            <WfFieldBlock label="شماره شبا" error={errors.bank_account?.message}>
              <WfShebaRow
                id="np-bank"
                value={watch('bank_account') ?? ''}
                onChange={(v) => setValue('bank_account', v, { shouldValidate: true })}
                placeholder="شماره شبای ۲۴ رقمی را وارد کنید"
                error={!!errors.bank_account}
              />
            </WfFieldBlock>
          ) : (
            <p className="rounded-[var(--wf-field-radius)] border border-amber-200 bg-amber-50 p-3 wf-body-s text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
              ثبت نهایی قرارداد فعلاً فقط با شماره شبا انجام می‌شود. لطفاً گزینهٔ «شماره شبا» را انتخاب کنید.
            </p>
          )}
        </div>

        <WfSectionDivider label="اطلاعات محل سکونت" />

        <div className="flex flex-col gap-8">
          <WfFieldBlock label="کدپستی محل سکونت" labelFor="np-postal" error={errors.postal_code?.message}>
            <WfInput
              id="np-postal"
              {...register('postal_code')}
              inputMode="numeric"
              maxLength={10}
              placeholder="کدپستی را وارد کنید"
              error={!!errors.postal_code}
            />
          </WfFieldBlock>

          <WfFieldBlock
            label="شناسه قبض برق محل سکونت"
            labelFor="np-bill"
            error={errors.home_electricy_bill?.message}
          >
            <WfInput
              id="np-bill"
              {...register('home_electricy_bill')}
              inputMode="numeric"
              placeholder="شناسه قبض برق را وارد کنید"
              error={!!errors.home_electricy_bill}
            />
          </WfFieldBlock>
        </div>

        <div className="flex flex-col gap-3 border-t border-[var(--wf-border)] pt-4">
          <WfFieldBlock label="تعداد اعضای خانواده (اختیاری)">
            <WfInput
              {...register('family_members_count', {
                setValueAs: (v) =>
                  v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v),
              })}
              type="number"
              min={0}
              placeholder="۰"
            />
          </WfFieldBlock>
          <label className="flex cursor-pointer items-center gap-2 wf-body-s text-[var(--wf-title)]">
            <input
              {...register('is_forigen_citizen')}
              type="checkbox"
              className="size-4 rounded border-[var(--wf-border)] text-[var(--amline-accent)]"
            />
            تبعه خارجی
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading || acctKind !== 'sheba'}
        className="w-full rounded-[var(--wf-field-radius)] bg-primary py-2.5 font-medium text-white disabled:opacity-50"
      >
        {isLoading ? 'در حال ثبت…' : submitLabel}
      </button>
    </form>
  );
}
