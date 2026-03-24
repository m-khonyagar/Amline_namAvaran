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

  const cycleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark';
    setTheme(nextTheme);
  };

  const getPageDescription = (page: string) => {
    switch (page) {
      case 'dashboard':
        return 'See where to start, what is already working, and which result or workflow needs your attention next.';
      case 'agents':
        return 'Inspect the planner and execution roles when you need deeper operational detail.';
      case 'tasks':
        return 'Describe one outcome, run it locally, and keep the queue simple and readable.';
      case 'chat':
        return 'Ask for help in plain language, attach files, and let tools or agent mode take action for you.';
      case 'files':
        return 'Open generated outputs, preview them quickly, and copy or share the result.';
      case 'history':
        return 'Review what the workspace has learned from previous runs.';
      case 'settings':
        return 'Adjust workspace location, interface comfort, and default operating behavior.';
      case 'computer':
        return 'Use deeper desktop controls only when you need shell, screenshot, or direct input automation.';
      case 'task-detail':
        return 'Follow one workflow from plan to logs to final output.';
      default:
        return 'Operate the local task orchestration workspace with a clear, reliable flow.';
    }
  };

  const getPageTitle = (page: string) => {
    switch (page) {
      case 'dashboard':
        return 'Start Here';
      case 'agents':
        return 'Workers';
      case 'tasks':
        return 'Workflows';
      case 'chat':
        return 'Assistant';
      case 'files':
        return 'Outputs';
      case 'history':
        return 'Memory';
      case 'settings':
        return t('settings');
      case 'computer':
        return 'Desktop Control';
      case 'task-detail':
        return t('taskDetail');
      default:
        return 'Agent Windsurf';
    }
  };

  return (
    <div className={`h-[88px] flex items-center justify-between px-5 md:px-6 border-b soft-divider panel-header ${className}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="shell-section-label">Current view</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap mt-1">
          <h2 className="text-[24px] leading-tight font-semibold tracking-[-0.03em] text-foreground truncate">{getPageTitle(currentPage)}</h2>
          <span className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-[11px] text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {t('liveOrchestration')}
          </span>
          <span className="hidden xl:inline-flex items-center rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-[11px] text-muted-foreground">
            Local-first
          </span>
        </div>
        <p className="hidden lg:block text-[12px] text-muted-foreground mt-1.5 leading-relaxed max-w-3xl">
          {getPageDescription(currentPage)}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="hidden xl:flex items-center gap-1.5 rounded-xl border border-border bg-secondary/60 px-3 py-2 text-[11px] text-muted-foreground">
          <span className="font-mono">Ctrl+K</span>
          <span>{t('commandPalette')}</span>
        </div>
        <button
          onClick={() => setLanguage(language === 'en' ? 'fa' : 'en')}
          className="shell-control text-[11px] font-semibold shrink-0"
          title={t('switchLanguage')}
        >
          <span className="opacity-70">Language</span>
          <span>{language === 'en' ? 'FA' : 'EN'}</span>
        </button>
        <button
          onClick={cycleTheme}
          className="shell-control shell-control-strong text-[11px] font-semibold shrink-0"
          title={t('toggleTheme')}
        >
          <span className="opacity-70">Theme</span>
          <span>{theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'System'}</span>
        </button>
      </div>
    </div>
  );
}
