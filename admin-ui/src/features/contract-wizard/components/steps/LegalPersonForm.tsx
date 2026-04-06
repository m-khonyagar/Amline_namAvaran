import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, Minus, Plus } from 'lucide-react';
import { legalPersonSchema, type LegalPersonFormData } from '../../schemas/partySchema';
import {
  WfSectionDivider,
  WfLabeledRadio,
  WfFieldBlock,
  WfInput,
  WfSelect,
  WfShebaRow,
} from '../wizardFigma/Primitives';

const COMPANY_TYPES = [
  { value: '', label: 'نوع شرکت را انتخاب کنید' },
  { value: 'public_jsc', label: 'سهامی عام' },
  { value: 'private_jsc', label: 'سهامی خاص' },
  { value: 'llc', label: 'مسئولیت محدود' },
  { value: 'coop', label: 'تعاونی' },
  { value: 'other', label: 'سایر' },
];

interface LegalPersonFormProps {
  defaultValues?: Partial<LegalPersonFormData>;
  onSubmit: (data: LegalPersonFormData) => void;
  isLoading?: boolean;
  submitLabel?: string;
}

const OWNER_WORD = ['اول', 'دوم', 'سوم', 'چهارم', 'پنجم', 'ششم', 'هفتم', 'هشتم', 'نهم', 'دهم'];

export function LegalPersonForm({
  defaultValues,
  onSubmit,
  isLoading,
  submitLabel = 'ثبت اطلاعات',
}: LegalPersonFormProps) {
  const [openSigner, setOpenSigner] = useState(0);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LegalPersonFormData>({
    resolver: zodResolver(legalPersonSchema),
    defaultValues: {
      company_type: '',
      signers: [{ national_code: '', mobile: '', birth_date: '', title: '' }],
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'signers' });
  const isKb = watch('is_knowledge_based');
  const bankAccount = watch('bank_account');

  function adjustSigners(delta: number) {
    const n = fields.length + delta;
    if (n < 1 || n > 10) return;
    if (delta > 0) append({ national_code: '', mobile: '', birth_date: '', title: '' });
    else remove(fields.length - 1);
    setOpenSigner(Math.min(openSigner, Math.max(0, n - 1)));
  }

  return (
    <form dir="rtl" onSubmit={handleSubmit(onSubmit)} className="wizard-figma space-y-5" noValidate>
      <WfSectionDivider label="اطلاعات شرکت" />

      <div className="flex flex-col gap-8">
        <WfFieldBlock label="شناسه ملی شرکت" labelFor="lp-nc" error={errors.national_nc?.message}>
          <WfInput
            id="lp-nc"
            {...register('national_nc')}
            inputMode="numeric"
            maxLength={11}
            placeholder="شناسه ملی شرکت را وارد کنید"
            error={!!errors.national_nc}
          />
        </WfFieldBlock>

        <WfFieldBlock label="شماره موبایل مدیر عامل" labelFor="lp-ceo" error={errors.ceo_mobile?.message}>
          <WfInput
            id="lp-ceo"
            {...register('ceo_mobile')}
            type="tel"
            inputMode="numeric"
            maxLength={11}
            placeholder="شماره موبایل مدیر عامل را وارد کنید"
            error={!!errors.ceo_mobile}
          />
        </WfFieldBlock>

        <WfFieldBlock label="نوع شرکت" labelFor="lp-ctype">
          <WfSelect id="lp-ctype" {...register('company_type')}>
            {COMPANY_TYPES.map((o) => (
              <option key={o.value || 'empty'} value={o.value}>
                {o.label}
              </option>
            ))}
          </WfSelect>
        </WfFieldBlock>

        <div className="flex w-full flex-row-reverse flex-wrap items-center justify-between gap-3">
          <div className="flex flex-row-reverse items-center gap-6">
            <WfLabeledRadio
              label="نیست"
              name="lp_kb"
              value="no"
              id="lp-kb-no"
              checked={!isKb}
              onChange={() => setValue('is_knowledge_based', false, { shouldValidate: true })}
            />
            <WfLabeledRadio
              label="است"
              name="lp_kb"
              value="yes"
              id="lp-kb-yes"
              checked={isKb}
              onChange={() => setValue('is_knowledge_based', true, { shouldValidate: true })}
            />
          </div>
          <span className="wf-subtitle-m text-[var(--wf-title)]">این شرکت دانش بنیان:</span>
        </div>

        <WfFieldBlock label="نوع مالکیت" labelFor="lp-own" error={errors.ownership_type?.message}>
          <WfSelect id="lp-own" {...register('ownership_type')} error={!!errors.ownership_type}>
            <option value="PRIVATE_DEED">سند خصوصی</option>
            <option value="LONG_TERM_LEASE">اجاره بلندمدت</option>
          </WfSelect>
        </WfFieldBlock>

        <WfFieldBlock label="کدپستی شرکت" labelFor="lp-postal" error={errors.postal_code?.message}>
          <WfInput
            id="lp-postal"
            {...register('postal_code')}
            inputMode="numeric"
            maxLength={10}
            placeholder="کدپستی را وارد کنید"
            error={!!errors.postal_code}
          />
        </WfFieldBlock>
      </div>

      <WfSectionDivider label="اطلاعات حساب" />

      <div className="flex flex-col gap-3">
        <div className="flex flex-row-reverse flex-wrap items-center justify-end gap-6">
          <WfLabeledRadio
            label="شماره شبا"
            name="lp_acct"
            value="sheba"
            id="lp-acct-sheba"
            checked
            onChange={() => {}}
          />
          <WfLabeledRadio
            label="شماره کارت"
            name="lp_acct"
            value="card"
            id="lp-acct-card"
            checked={false}
            onChange={() => {}}
          />
        </div>
        <WfFieldBlock label="شماره شبا" error={errors.bank_account?.message}>
          <WfShebaRow
            id="lp-bank"
            value={bankAccount ?? ''}
            onChange={(v) => setValue('bank_account', v, { shouldValidate: true })}
            placeholder="شماره شبای ۲۴ رقمی را وارد کنید"
            error={!!errors.bank_account}
          />
        </WfFieldBlock>
      </div>

      <WfSectionDivider label="اطلاعات صاحبان امضا" />

      <div className="flex flex-col gap-4">
        <div className="flex max-w-[327px] flex-row-reverse items-center gap-2">
          <div className="min-w-0 flex-1 text-right">
            <span className="wf-subtitle-m text-[var(--wf-title)]">تعداد صاحبان امضا</span>
          </div>
          <div className="flex shrink-0 flex-row-reverse items-stretch">
            <button
              type="button"
              className="flex h-12 w-12 items-center justify-center rounded-br-[13px] rounded-tr-[13px] bg-[var(--wf-light-surface)] text-[var(--wf-title)] hover:bg-[var(--wf-border)]"
              onClick={() => adjustSigners(1)}
              disabled={fields.length >= 10}
              aria-label="افزودن امضاکننده"
            >
              <Plus className="size-5" strokeWidth={2} />
            </button>
            <div className="flex h-12 w-[65px] items-center justify-center border border-[var(--wf-border)] bg-[var(--wf-surface)] wf-body-m text-[var(--wf-paragraph-2)]">
              {fields.length}
            </div>
            <button
              type="button"
              className="flex h-12 w-12 items-center justify-center rounded-bl-[13px] rounded-tl-[13px] bg-[var(--wf-light-surface)] text-[var(--wf-title)] hover:bg-[var(--wf-border)]"
              onClick={() => adjustSigners(-1)}
              disabled={fields.length <= 1}
              aria-label="کاهش امضاکننده"
            >
              <Minus className="size-5" strokeWidth={2} />
            </button>
          </div>
        </div>

        {errors.signers?.root ? (
          <p className="text-xs text-red-600" role="alert">
            {errors.signers.root.message}
          </p>
        ) : null}

        {fields.map((field, index) => {
          const ord = OWNER_WORD[index] ?? String(index + 1);
          const open = openSigner === index;
          return (
            <div key={field.id} className="flex w-full max-w-[327px] flex-col gap-2">
              <button
                type="button"
                className="flex h-12 w-full flex-row-reverse items-center justify-between gap-2 rounded-[var(--wf-field-radius)] bg-[var(--wf-light-surface)] px-4 text-right wf-body-m font-medium text-[var(--wf-paragraph-2)] dark:bg-slate-800/80"
                onClick={() => setOpenSigner(open ? -1 : index)}
                aria-expanded={open}
              >
                <ChevronDown
                  className={`size-5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                  strokeWidth={2}
                />
                اطلاعات صاحب امضای {ord}
              </button>
              {open ? (
                <div className="flex flex-col gap-4 border border-[var(--wf-border)] p-3" style={{ borderRadius: 'var(--wf-field-radius)' }}>
                  <WfFieldBlock
                    label="کد ملی"
                    labelFor={`lp-s-${index}-nc`}
                    error={errors.signers?.[index]?.national_code?.message}
                  >
                    <WfInput
                      id={`lp-s-${index}-nc`}
                      {...register(`signers.${index}.national_code`)}
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="۱۰ رقم"
                      error={!!errors.signers?.[index]?.national_code}
                    />
                  </WfFieldBlock>
                  <WfFieldBlock
                    label="شماره موبایل"
                    labelFor={`lp-s-${index}-mob`}
                    error={errors.signers?.[index]?.mobile?.message}
                  >
                    <WfInput
                      id={`lp-s-${index}-mob`}
                      {...register(`signers.${index}.mobile`)}
                      type="tel"
                      inputMode="numeric"
                      maxLength={11}
                      placeholder="09xxxxxxxxx"
                      error={!!errors.signers?.[index]?.mobile}
                    />
                  </WfFieldBlock>
                  <WfFieldBlock
                    label="تاریخ تولد"
                    labelFor={`lp-s-${index}-bd`}
                    error={errors.signers?.[index]?.birth_date?.message}
                  >
                    <WfInput
                      id={`lp-s-${index}-bd`}
                      {...register(`signers.${index}.birth_date`)}
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="۱۳۷۰/۰۱/۰۱"
                      error={!!errors.signers?.[index]?.birth_date}
                    />
                  </WfFieldBlock>
                  <WfFieldBlock
                    label="سمت"
                    labelFor={`lp-s-${index}-title`}
                    error={errors.signers?.[index]?.title?.message}
                  >
                    <WfInput
                      id={`lp-s-${index}-title`}
                      {...register(`signers.${index}.title`)}
                      placeholder="مثال: مدیرعامل"
                      error={!!errors.signers?.[index]?.title}
                    />
                  </WfFieldBlock>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-[var(--wf-field-radius)] bg-primary py-2.5 font-medium text-white disabled:opacity-50"
      >
        {isLoading ? 'در حال ثبت…' : submitLabel}
      </button>
    </form>
  );
}
