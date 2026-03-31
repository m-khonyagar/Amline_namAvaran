import type { AddContractPartyResponse } from '../../types/api';

interface PartyListProps {
  parties: AddContractPartyResponse[];
  onDelete: (partyId: string) => void;
  isLoading?: boolean;
  label?: string;
}

export function PartyList({ parties, onDelete, isLoading, label = 'طرفین اضافه‌شده' }: PartyListProps) {
  if (parties.length === 0) return null;

  return (
    <div dir="rtl" className="mt-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">{label}</h3>
      <ul className="space-y-2">
        {parties.map((party) => (
          <li
            key={party.id}
            className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
          >
            <div className="text-sm text-gray-700">
              <span className="font-medium">
                {party.person_type === 'NATURAL_PERSON' ? 'شخص حقیقی' : 'شخص حقوقی'}
              </span>
              <span className="text-gray-400 mx-1">—</span>
              <span className="text-gray-500 text-xs">{party.id}</span>
            </div>
            <button
              type="button"
              onClick={() => onDelete(party.id)}
              disabled={isLoading}
              aria-label="حذف"
              className="text-red-400 hover:text-red-600 text-lg leading-none disabled:opacity-40"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
