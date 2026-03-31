import type { ContractStatus } from '../types/wizard';

interface ContractStatusBannerProps {
  status: ContractStatus | null;
  onRequestEdit?: () => void;
}

const STATUS_CONFIG: Partial<Record<ContractStatus, { color: string; icon: string; message: string }>> = {
  PARTY_REJECTED: {
    color: 'bg-red-50 border-red-200 text-red-700',
    icon: '✗',
    message: 'قرارداد توسط طرف مقابل رد شد.',
  },
  EDIT_REQUESTED: {
    color: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    icon: '✎',
    message: 'درخواست ویرایش قرارداد ثبت شده است.',
  },
  PENDING_ADMIN_APPROVAL: {
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    icon: '⏳',
    message: 'قرارداد در انتظار تأیید مدیر است.',
  },
  ADMIN_REJECTED: {
    color: 'bg-red-50 border-red-200 text-red-700',
    icon: '✗',
    message: 'قرارداد توسط مدیر رد شد.',
  },
  REVOKED: {
    color: 'bg-gray-50 border-gray-200 text-gray-700',
    icon: '⊘',
    message: 'این قرارداد فسخ شده است.',
  },
  ONE_PARTY_SIGNED: {
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    icon: '✍',
    message: 'در انتظار امضای طرف مقابل...',
  },
  PENDING_COMMISSION: {
    color: 'bg-orange-50 border-orange-200 text-orange-700',
    icon: '💳',
    message: 'در انتظار پرداخت کمیسیون.',
  },
};

export function ContractStatusBanner({ status, onRequestEdit }: ContractStatusBannerProps) {
  if (!status) return null;
  const config = STATUS_CONFIG[status];
  if (!config) return null;

  return (
    <div
      dir="rtl"
      role="status"
      className={`flex items-center gap-3 border rounded-lg p-3 mb-4 ${config.color}`}
    >
      <span className="text-xl leading-none">{config.icon}</span>
      <p className="flex-1 text-sm font-medium">{config.message}</p>
      {status === 'EDIT_REQUESTED' && onRequestEdit && (
        <button
          type="button"
          onClick={onRequestEdit}
          className="text-sm underline font-medium"
        >
          ویرایش
        </button>
      )}
    </div>
  );
}
