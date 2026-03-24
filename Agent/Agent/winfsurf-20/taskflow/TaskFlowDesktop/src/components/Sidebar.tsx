import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '../i18n';

interface SidebarProps {
  currentPage?: string;
  onPageChange?: (page: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

const Icon = ({ name, className = 'w-4 h-4' }: { name: string; className?: string }) => {
  const icons: Record<string, React.ReactElement> = {
    dashboard: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>,
    agents: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>,
    tasks: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>,
    chat: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.313-3.063C3.486 15.545 3 13.812 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>,
    files: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>,
    history: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
    integrations: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"/></svg>,
    settings: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
    computer: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L8 21m8-4 1.75 4M4 13h16M5 5h14a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z"/></svg>,
    chevron: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>,
    plus: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>,
  };
  return icons[name] || icons.dashboard;
};

export function Sidebar({ currentPage = 'dashboard', onPageChange, collapsed = false, onToggleCollapse, className = '' }: SidebarProps) {
  const { t } = useTranslation();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const primaryItems = useMemo(
    () => [
      { id: 'dashboard', label: 'Start here', caption: 'Simple overview and first next step' },
      { id: 'tasks', label: 'Workflows', caption: 'Create and run one outcome at a time' },
      { id: 'chat', label: 'Assistant', caption: 'Chat, uploads, tools, and agent mode' },
      { id: 'files', label: 'Outputs', caption: 'Generated files and result previews' },
      { id: 'settings', label: 'Settings', caption: 'Workspace, language, theme, and safety' },
    ],
    []
  );
  const advancedItems = useMemo(
    () => [
      { id: 'agents', label: 'Workers', caption: 'Planner and execution role details' },
      { id: 'computer', label: 'Desktop control', caption: 'PowerShell, screenshots, and input control' },
      { id: 'history', label: 'Memory', caption: 'Previous learnings and saved context' },
    ],
    []
  );

  useEffect(() => {
    if (advancedItems.some((item) => item.id === currentPage)) {
      setShowAdvanced(true);
    }
  }, [advancedItems, currentPage]);

  return (
    <aside
      className={`surface-sidebar flex flex-col transition-all duration-200 ${collapsed ? 'w-[72px]' : 'w-[240px]'} ${className}`}
    >
      <div className="flex items-center justify-between px-3 py-3 border-b soft-divider">
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/12 border border-primary/20 flex items-center justify-center shrink-0">
              <span className="text-primary font-bold text-xs tracking-tight">AW</span>
            </div>
            <div className="min-w-0">
              <p className="shell-section-label mb-1">Navigation</p>
              <p className="text-[13px] font-semibold text-foreground truncate leading-tight">Agent Windsurf</p>
              <p className="text-[11px] text-muted-foreground truncate leading-tight">Outcome-driven desktop workspace</p>
            </div>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="h-7 w-7 rounded-lg border border-transparent hover:border-border hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shrink-0"
          title={collapsed ? t('expand') : t('collapse')}
        >
          <span className={`inline-block transition-transform ${collapsed ? 'rotate-180' : ''}`}>
            <Icon name="chevron" className="w-[16px] h-[16px]" />
          </span>
        </button>
      </div>

      {!collapsed && (
        <div className="px-2 py-2.5 border-b soft-divider">
          <button
            onClick={() => onPageChange?.('tasks')}
            className="btn-primary w-full justify-center text-[13px] h-10"
          >
            <Icon name="plus" className="w-[16px] h-[16px] flex-shrink-0" />
            <span className="font-medium">{t('newTask')}</span>
          </button>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto shell-scroll px-2 py-2">
        <div className="nav-group">
          {!collapsed && <p className="shell-section-label px-2 pt-1 pb-1.5">Main flow</p>}
          {primaryItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onPageChange?.(item.id)}
                title={collapsed ? item.label : undefined}
                className={`nav-row w-full ${isActive ? 'nav-row-active' : ''} ${collapsed ? 'justify-center px-0' : ''}`}
              >
                <Icon name={item.id} className="w-[18px] h-[18px] flex-shrink-0" />
                {!collapsed && (
                  <span className="truncate flex-1 text-left">
                    <span className="block text-[13px] font-medium">{item.label}</span>
                    <span className="nav-row-caption truncate">{item.caption}</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {!collapsed && (
          <div className="nav-group">
            <button
              onClick={() => setShowAdvanced((value) => !value)}
              className="nav-row w-full"
            >
              <Icon name="integrations" className="w-[18px] h-[18px] flex-shrink-0" />
              <span className="truncate flex-1 text-left">
                <span className="block text-[13px] font-medium">{showAdvanced ? 'Hide advanced tools' : 'Show advanced tools'}</span>
                <span className="nav-row-caption truncate">Worker details, desktop control, and saved memory</span>
              </span>
            </button>
          </div>
        )}

        {(showAdvanced || collapsed) && (
          <div className="nav-group">
            {!collapsed && <p className="shell-section-label px-2 pt-1 pb-1.5">Advanced</p>}
            {advancedItems.map((item) => {
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onPageChange?.(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={`nav-row w-full ${isActive ? 'nav-row-active' : ''} ${collapsed ? 'justify-center px-0' : ''}`}
                >
                  <Icon name={item.id} className="w-[18px] h-[18px] flex-shrink-0" />
                  {!collapsed && (
                    <span className="truncate flex-1 text-left">
                      <span className="block text-[13px] font-medium">{item.label}</span>
                      <span className="nav-row-caption truncate">{item.caption}</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </nav>

      <div className="px-2 py-2.5 border-t soft-divider">
        <div className={`surface-elevated px-2.5 py-2.5 flex items-center gap-2 ${collapsed ? 'justify-center px-0' : ''}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shrink-0" />
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-foreground truncate">{t('systemHealthy')}</p>
              <p className="text-[10px] text-muted-foreground truncate">Local backend, desktop operator, and chat workspace ready</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
