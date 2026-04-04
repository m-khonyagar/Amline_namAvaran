import { useState } from 'react';
import { contractApi } from '../../api/contractApi';
import type { AddContractPartyResponse } from '../../types/api';
import type { StepProps } from '../../types/wizard';
import { usesRentingContractFlow } from '../../types/wizard';
import { StepErrorBanner } from '../StepErrorBanner';
import { NaturalPersonForm } from './NaturalPersonForm';
import { LegalPersonForm } from './LegalPersonForm';
import { PartyList } from './PartyList';
import type { NaturalPersonFormData, LegalPersonFormData } from '../../schemas/partySchema';
import { signingPartiesStorage } from '../../storage/signingPartiesStorage';
import { useMappedStepError } from '../../hooks/useMappedStepError';

type PersonKind = 'NATURAL' | 'LEGAL';

export function LandlordStep({ contractId, contractType, onComplete, isScribeMode }: StepProps) {
  const [parties, setParties] = useState<AddContractPartyResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { error, details, hint, setFromError, clear } = useMappedStepError();
  const [personKind, setPersonKind] = useState<PersonKind>('NATURAL');

  const partyLabel = usesRentingContractFlow(contractType) ? 'مالک' : 'فروشنده';

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

  return (
    <div dir="rtl" className="space-y-6">
      <h2 className="text-lg font-bold text-gray-800">
        اطلاعات {partyLabel}
        {isScribeMode && <span className="text-sm font-normal text-gray-500 mr-2">(حالت کاتب)</span>}
      </h2>

      <StepErrorBanner
        message={error}
        details={details}
        hint={hint}
        onDismiss={() => clear()}
      />

      <div className="flex gap-2 rounded-xl border border-gray-200 bg-white p-1">
        <button
          type="button"
          onClick={() => setPersonKind('NATURAL')}
          className={[
            'flex-1 rounded-lg py-2 text-sm font-medium transition-colors',
            personKind === 'NATURAL' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50',
          ].join(' ')}
        >
          شخص حقیقی
        </button>
        <button
          type="button"
          onClick={() => setPersonKind('LEGAL')}
          className={[
            'flex-1 rounded-lg py-2 text-sm font-medium transition-colors',
            personKind === 'LEGAL' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50',
          ].join(' ')}
        >
          شخص حقوقی
        </button>
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
          className="w-full bg-green-600 text-white rounded-lg py-2.5 font-medium disabled:opacity-50"
        >
          {isLoading ? 'در حال ثبت...' : `تأیید ${partyLabel}ان و ادامه`}
        </button>
      )}
    </div>
  );
}
