import React from 'react';
import { useTranslation } from '../i18n';

interface CommandCenterProps {
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
  onApprove?: () => void;
  onEdit?: () => void;
  onCancel?: () => void;
  disabled?: boolean;
  status?: 'running' | 'completed' | 'waiting' | 'error' | 'paused' | 'idle';
  className?: string;
}

export function CommandCenter({
  onStart,
  onPause,
  onResume,
  onStop,
  onApprove,
  onEdit,
  onCancel,
  disabled = false,
  status = 'idle',
  className = '',
}: CommandCenterProps) {
  const { t } = useTranslation();

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {status === 'idle' || status === 'completed' || status === 'error' ? (
        <button
          onClick={onStart}
          disabled={disabled}
          className="btn-primary text-[12px] h-8 px-3 disabled:opacity-50"
        >
          {t('start')}
        </button>
      ) : null}
      {status === 'running' && (
        <>
          <button
            onClick={onPause}
            disabled={disabled}
            className="btn-secondary text-[12px] h-8 px-3 disabled:opacity-50"
          >
            {t('pause')}
          </button>
          <button
            onClick={onEdit}
            disabled={disabled}
            className="btn-secondary text-[12px] h-8 px-3 disabled:opacity-50"
          >
            {t('edit')}
          </button>
          <button
            onClick={onStop}
            disabled={disabled}
            className="btn-secondary text-[12px] h-8 px-3 disabled:opacity-50 text-destructive hover:bg-destructive/10"
          >
            {t('stop')}
          </button>
          <button
            onClick={onCancel}
            disabled={disabled}
            className="btn-secondary text-[12px] h-8 px-3 disabled:opacity-50"
          >
            {t('cancel')}
          </button>
        </>
      )}
      {status === 'paused' && (
        <button
          onClick={onResume}
          disabled={disabled}
          className="btn-primary text-[12px] h-8 px-3 disabled:opacity-50"
        >
          {t('resume')}
        </button>
      )}
      {status === 'waiting' && (
        <button
          onClick={onApprove}
          disabled={disabled}
          className="btn-primary text-[12px] h-8 px-3 disabled:opacity-50"
        >
          {t('approve')}
        </button>
      )}
    </div>
  );
}
