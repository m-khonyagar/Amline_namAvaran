import { useState } from 'react';
import { contractApi } from '../../api/contractApi';
import type { AddContractPartyResponse } from '../../types/api';
import type { StepProps } from '../../types/wizard';
import { StepErrorBanner } from '../StepErrorBanner';
import { NaturalPersonForm } from './NaturalPersonForm';
import { LegalPersonForm } from './LegalPersonForm';
import { PartyList } from './PartyList';
import type { NaturalPersonFormData, LegalPersonFormData } from '../../schemas/partySchema';
import { signingPartiesStorage } from '../../storage/signingPartiesStorage';
import { useMappedStepError } from '../../hooks/useMappedStepError';
import { WfLabeledRadio } from '../wizardFigma/Primitives';
import '../wizardFigma/wizardFigma.css';

type PersonKind = 'NATURAL' | 'LEGAL';

const OWNER_ORDINAL_FA = ['اول', 'دوم', 'سوم', 'چهارم', 'پنجم', 'ششم', 'هفتم', 'هشتم', 'نهم', 'دهم'];

export function LandlordStep({ contractId, contractType, onComplete, isScribeMode }: StepProps) {
  const [parties, setParties] = useState<AddContractPartyResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { error, details, hint, setFromError, clear } = useMappedStepError();
  const [personKind, setPersonKind] = useState<PersonKind>('NATURAL');

  const partyLabel = contractType === 'PROPERTY_RENT' ? 'مالک' : 'فروشنده';

  async function handleAddNatural(data: NaturalPersonFormData) {
    setIsLoading(true);
    clear();
    try {
      const res = await contractApi.addLandlord(contractId, {
        person_type: 'NATURAL_PERSON',
        contract_type: contractType,
        natural_person_detail: {
          national_code: data.national_code,
          is_forigen_citizen: data.is_forigen_citizen,
          mobile: data.mobile,
          birth_date: data.birth_date,
          family_members_count: data.family_members_count,
          bank_account: data.bank_account,
          postal_code: data.postal_code,
          home_electricy_bill: Number(data.home_electricy_bill ?? 0),
        },
        legal_person_detail: null,
      });
      setParties((prev) => [...prev, res.data]);
      signingPartiesStorage.upsert(contractId, {
        id: res.data.id,
        label: partyLabel,
        mobile: data.mobile,
        partyType: 'LANDLORD',
        personType: 'NATURAL_PERSON',
      });
    } catch (err: unknown) {
      setFromError(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddLegal(data: LegalPersonFormData) {
    setIsLoading(true);
    clear();
    try {
      const res = await contractApi.addLandlord(contractId, {
        person_type: 'LEGAL_PERSON',
        contract_type: contractType,
        natural_person_detail: null,
        legal_person_detail: {
          national_nc: data.national_nc,
          ceo_mobile: data.ceo_mobile,
          ownership_type: data.ownership_type,
          is_knowledge_based: data.is_knowledge_based,
          postal_code: data.postal_code,
          bank_account: data.bank_account,
          signers: data.signers.map((s) => ({
            national_code: s.national_code,
            mobile: s.mobile,
            birth_date: s.birth_date,
            title: s.title,
          })),
        },
      });
      setParties((prev) => [...prev, res.data]);
      signingPartiesStorage.upsert(contractId, {
        id: res.data.id,
        label: partyLabel,
        mobile: data.ceo_mobile,
        partyType: 'LANDLORD',
        personType: 'LEGAL_PERSON',
      });
    } catch (err: unknown) {
      setFromError(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteParty(partyId: string) {
    setIsLoading(true);
    try {
      await contractApi.deleteParty(contractId, partyId);
      setParties((prev) => prev.filter((p) => p.id !== partyId));
      signingPartiesStorage.remove(contractId, partyId);
    } catch (err: unknown) {
      setFromError(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConfirm() {
    if (parties.length === 0) {
      setFromError(new Error(`حداقل یک ${partyLabel} الزامی است`));
      return;
    }
    setIsLoading(true);
    clear();
    try {
      const res = await contractApi.setLandlord(contractId, 'TENANT_INFORMATION');
      const nextStep = (res.data as { next_step?: string })?.next_step ?? 'TENANT_INFORMATION';
      onComplete(nextStep as import('../../types/wizard').PRContractStep);
    } catch (err: unknown) {
      setFromError(err);
    } finally {
      setIsLoading(false);
    }
  }

  const ownerOrdinal = OWNER_ORDINAL_FA[parties.length] ?? String(parties.length + 1);
  const stepTitle = `اطلاعات ${partyLabel} ${ownerOrdinal}`;

  return (
    <div dir="rtl" className="wizard-figma space-y-6">
      <h2 className="text-lg font-bold text-[var(--wf-title)] dark:text-slate-100">
        اطلاعات {partyLabel}
        {isScribeMode && <span className="mr-2 text-sm font-normal text-[var(--wf-caption)]">(حالت کاتب)</span>}
      </h2>

      <StepErrorBanner
        message={error}
        details={details}
        hint={hint}
        onDismiss={() => clear()}
      />

      <div
        className="flex flex-col gap-5 border border-[var(--wf-border)] bg-[var(--wf-surface)] p-3 dark:border-slate-600 dark:bg-slate-900/35"
        style={{ borderRadius: 'var(--wf-card-radius)' }}
      >
        <div className="flex min-h-8 items-center justify-between gap-3">
          <span className="wf-body-m text-[var(--wf-caption)] dark:text-slate-400">{stepTitle}</span>
        </div>

        <div className="flex flex-row-reverse flex-wrap items-center justify-end gap-6">
          <WfLabeledRadio
            label="شخص حقوقی هستم"
            name="landlord_person_kind"
            value="LEGAL"
            id="ld-kind-legal"
            checked={personKind === 'LEGAL'}
            onChange={() => setPersonKind('LEGAL')}
          />
          <WfLabeledRadio
            label="شخص حقیقی هستم"
            name="landlord_person_kind"
            value="NATURAL"
            id="ld-kind-natural"
            checked={personKind === 'NATURAL'}
            onChange={() => setPersonKind('NATURAL')}
          />
        </div>

        {personKind === 'NATURAL' ? (
          <NaturalPersonForm
            onSubmit={handleAddNatural}
            isLoading={isLoading}
            submitLabel={`افزودن ${partyLabel}`}
          />
        ) : (
          <LegalPersonForm
            onSubmit={handleAddLegal}
            isLoading={isLoading}
            submitLabel={`افزودن ${partyLabel} (حقوقی)`}
          />
        )}
      </div>

      <PartyList
        parties={parties}
        onDelete={handleDeleteParty}
        isLoading={isLoading}
        label={`${partyLabel}های اضافه‌شده`}
      />

      {parties.length > 0 && (
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isLoading}
          className="w-full rounded-[var(--wf-field-radius)] bg-[var(--amline-accent)] py-2.5 font-medium text-white hover:opacity-95 disabled:opacity-50 dark:bg-teal-600"
        >
          {isLoading ? 'در حال ثبت...' : `تأیید ${partyLabel}ان و ادامه`}
        </button>
      )}
    </div>
  );
}
