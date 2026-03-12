import React from 'react';
import { useTranslation } from '../i18n';
import { useThemeStore } from '../design-system/theme';
import { useLanguageStore } from '../i18n';

interface TopBarProps {
  currentPage?: string;
  className?: string;
}

export function TopBar({ currentPage = 'dashboard', className = '' }: TopBarProps) {
  const { t } = useTranslation();
  const { theme, setTheme } = useThemeStore();
  const { language, setLanguage } = useLanguageStore();

  const getPageTitle = (page: string) => {
    switch (page) {
      case 'dashboard': return t('dashboard');
      case 'agents': return t('agents');
      case 'tasks': return t('tasks');
      case 'files': return t('files');
      case 'history': return t('history');
      case 'integrations': return t('integrations');
      case 'settings': return t('settings');
      case 'task-detail': return t('taskDetail');
      case 'collaboration': return t('collaboration');
      case 'supervision': return t('supervision');
      case 'computer-control': return t('computerControl');
      default: return 'Agent Windsurf Amline';
    }
  };

  return (
    <div className={`h-[64px] flex items-center justify-between px-5 border-b soft-divider ${className}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <h2 className="text-[22px] leading-tight font-semibold text-foreground truncate">{getPageTitle(currentPage)}</h2>
          <span className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-[11px] text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {t('liveOrchestration')}
          </span>
        </div>
        <p className="hidden lg:block text-[12px] text-muted-foreground mt-1.5 leading-tight">
          {t('shellDescription')}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="hidden xl:flex items-center gap-1.5 rounded-lg border border-border bg-secondary/60 px-2.5 py-1.5 text-[11px] text-muted-foreground">
          <span className="font-mono">⌘K</span>
          <span>{t('commandPalette')}</span>
        </div>
        <button
          onClick={() => setLanguage(language === 'en' ? 'fa' : 'en')}
          className="h-8 w-8 rounded-lg border border-border bg-secondary hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shrink-0"
          title={t('switchLanguage')}
        >
          {language === 'en' ? '🇺🇸' : '🇮🇷'}
        </button>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="h-8 w-8 rounded-lg border border-border bg-secondary hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shrink-0"
          title={t('toggleTheme')}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </div>
  );
}
