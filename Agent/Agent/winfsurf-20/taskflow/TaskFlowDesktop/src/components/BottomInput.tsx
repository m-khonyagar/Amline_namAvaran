import React, { useRef } from 'react';
import { useTranslation } from '../i18n';

interface BottomInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onSuggestionClick?: (value: string) => void;
  suggestions?: string[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function BottomInput({
  value,
  onChange,
  onSubmit,
  onSuggestionClick,
  suggestions = [],
  placeholder,
  disabled = false,
  className = '',
}: BottomInputProps) {
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className={`px-4 pb-4 pt-3 ${className}`}>
      <div className="chat-input-container">
        <div className="dock-surface px-4 py-3.5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{t('commandSurface')}</p>
            <p className="hidden md:block text-[11px] text-muted-foreground">{t('enterToSend')} • {t('shiftEnterNewline')}</p>
          </div>
          <div className="flex items-end gap-2.5">
            <button type="button" className="btn-secondary h-9 w-9 !p-0 shrink-0" title={t('attachFile')}>
              <svg className="w-[16px] h-[16px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828L18 9.828a4 4 0 10-5.657-5.657L5.757 10.757a6 6 0 108.486 8.486L20 13" />
              </svg>
            </button>
            <div className="flex-1 min-w-0 rounded-xl border border-border bg-[hsl(var(--input-bg))] px-4 py-2.5">
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder ?? t('askAnything')}
                disabled={disabled}
                rows={1}
                className="chat-input"
              />
            </div>
            <button
              onClick={onSubmit}
              disabled={disabled || !value.trim()}
              className="btn-primary h-9 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed px-4"
              title={t('send')}
            >
              <svg className="w-[16px] h-[16px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M13 5l7 7-7 7" />
              </svg>
              <span className="hidden sm:inline ml-1.5">{t('send')}</span>
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="rounded-md border border-border bg-secondary/60 px-2 py-0.5 text-[11px] text-muted-foreground">{t('attach')}</span>
              <span className="rounded-md border border-border bg-secondary/60 px-2 py-0.5 text-[11px] text-muted-foreground">{t('cmd')}</span>
            </div>
            <p className="hidden lg:block text-[11px] text-muted-foreground">{t('describeOutcome')}</p>
          </div>
          {suggestions.length > 0 && onSuggestionClick && (
            <div className="mt-3 flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="rounded-md border border-border bg-secondary/50 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-secondary"
                  onClick={() => onSuggestionClick(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
