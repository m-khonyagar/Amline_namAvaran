import { useState } from 'react';
import { contractApi } from '../../api/contractApi';
import type { AddContractPartyResponse } from '../../types/api';
import type { StepProps } from '../../types/wizard';
import { StepErrorBanner } from '../StepErrorBanner';
import { NaturalPersonForm } from './NaturalPersonForm';
import { PartyList } from './PartyList';
import type { NaturalPersonFormData } from '../../schemas/partySchema';

export function TenantStep({ contractId, contractType, onComplete, isScribeMode }: StepProps) {
  const [parties, setParties] = useState<AddContractPartyResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const partyLabel = contractType === 'PROPERTY_RENT' ? 'مستاجر' : 'خریدار';

  async function handleAddParty(data: NaturalPersonFormData) {
    setIsLoading(true);
    setError(null);
    try {
      const res = await contractApi.addTenant(contractId, {
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
    } catch (err: unknown) {
      const e = err as { type?: string; message?: string };
      setError(e.message ?? 'خطا در ثبت اطلاعات');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteParty(partyId: string) {
    setIsLoading(true);
    try {
      await contractApi.deleteParty(contractId, partyId);
      setParties((prev) => prev.filter((p) => p.id !== partyId));
    } catch {
      setError('خطا در حذف');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConfirm() {
    if (parties.length === 0) {
      setError(`حداقل یک ${partyLabel} الزامی است`);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await contractApi.setTenant(contractId, 'PLACE_INFORMATION');
      const nextStep = (res.data as { next_step?: string })?.next_step ?? 'PLACE_INFORMATION';
      onComplete(nextStep as import('../../types/wizard').PRContractStep);
    } catch (err: unknown) {
      const e = err as { type?: string; message?: string };
      setError(e.message ?? 'خطا در تأیید');
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

      <StepErrorBanner message={error} onDismiss={() => setError(null)} />

      <NaturalPersonForm
        onSubmit={handleAddParty}
        isLoading={isLoading}
        submitLabel={`افزودن ${partyLabel}`}
      />

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
