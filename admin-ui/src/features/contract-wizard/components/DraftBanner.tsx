  import { useEffect, useState } from 'react';
import { localDraftStorage, type DraftEntry } from '../storage/draftStorage';
import { formatShamsiDateShort } from '../../../lib/persianDateTime';

const contractTypeLabel: Record<string, string> = {
  PROPERTY_RENT: 'رهن و اجاره',
  BUYING_AND_SELLING: 'خرید و فروش',
};

const stepLabel: Record<string, string> = {
  DRAFT: 'شروع',
  LANDLORD_INFORMATION: 'اطلاعات مالک',
  TENANT_INFORMATION: 'اطلاعات مستاجر',
  PLACE_INFORMATION: 'اطلاعات ملک اجاره‌ای',
  DATING: 'تاریخ‌ها',
  MORTGAGE: 'رهن',
  RENTING: 'اجاره',
  SIGNING: 'امضا',
  WITNESS: 'شاهد',
  FINISH: 'پایان',
};

function formatDate(iso: string): string {
  try {
    return formatShamsiDateShort(iso);
  } catch {
    return iso;
  }
}

interface DraftBannerProps {
  onContinue: (draft: DraftEntry) => void;
  onStartNew: () => void;
}

export function DraftBanner({ onContinue, onStartNew }: DraftBannerProps) {
  const [drafts, setDrafts] = useState<DraftEntry[]>([]);

  useEffect(() => {
    setDrafts(localDraftStorage.loadAll());
  }, []);

  if (drafts.length === 0) {
    return (
      <div dir="rtl" className="text-center py-6">
        <button
          type="button"
          onClick={onStartNew}
          className="bg-primary text-white rounded-xl px-6 py-3 font-bold text-base"
        >
          شروع قرارداد جدید
        </button>
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">پیش‌نویس‌های ذخیره‌شده</p>
        <button
          type="button"
          onClick={onStartNew}
          className="text-sm text-primary hover:underline"
        >
          + قرارداد جدید
        </button>
      </div>

      <div className="space-y-2">
        {drafts.map((draft) => (
          <div
            key={draft.contractId}
            className="flex items-center justify-between border border-gray-200 rounded-xl px-4 py-3 bg-white shadow-sm"
          >
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-gray-800">
                {contractTypeLabel[draft.contractType] ?? draft.contractType}
              </p>
              <p className="text-xs text-gray-500">
                مرحله: {stepLabel[draft.currentStep] ?? draft.currentStep}
              </p>
              <p className="text-xs text-gray-400">
                آخرین ویرایش: {formatDate(draft.lastUpdated)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onContinue(draft)}
              className="text-sm text-primary border border-primary rounded-lg px-3 py-1.5 hover:bg-primary/5 transition-colors"
            >
              ادامه
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
