import React, { useEffect, useState } from 'react';
import { useLanguageStore, useTranslation } from '../i18n';
import { useThemeStore } from '../stores/themeStore';

interface WindowsDesktopLayoutProps {
  children: React.ReactNode;
  className?: string;
}

function formatClock(date: Date, language: string) {
  return date.toLocaleTimeString(language === 'fa' ? 'fa-IR' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(date: Date, language: string) {
  return date.toLocaleDateString(language === 'fa' ? 'fa-IR' : 'en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function WindowsDesktopLayout({ children, className = '' }: WindowsDesktopLayoutProps) {
  const { t } = useTranslation();
  const { isDark } = useThemeStore();
  const { language } = useLanguageStore();
  const [systemTime, setSystemTime] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setSystemTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div
      className={`h-screen overflow-hidden ${className}`}
      style={{
        background: isDark
          ? 'radial-gradient(circle at 15% 15%, rgba(87, 147, 255, 0.12), transparent 18%), radial-gradient(circle at 85% 10%, rgba(56, 189, 248, 0.08), transparent 20%), linear-gradient(180deg, #080b10 0%, #0b0f15 100%)'
          : 'radial-gradient(circle at 15% 15%, rgba(37, 99, 235, 0.08), transparent 18%), radial-gradient(circle at 85% 10%, rgba(14, 165, 233, 0.08), transparent 20%), linear-gradient(180deg, #f7f9fc 0%, #eef3f9 100%)',
      }}
    >
      <div className="h-full p-[var(--shell-padding)]">
        <div className="app-shell h-full">
          <div className="glass-frame surface-panel h-full flex flex-col overflow-hidden">
            <div className="h-[62px] px-4 md:px-6 border-b soft-divider flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-[18px] bg-primary/12 border border-primary/20 flex items-center justify-center shadow-[0_12px_28px_hsl(var(--primary)/0.18)]">
                  <span className="text-[11px] font-bold tracking-[0.12em] text-primary">AW</span>
                </div>
                <div className="min-w-0">
                  <p className="shell-section-label mb-1">{t('workspaceReady')}</p>
                  <p className="text-[14px] font-semibold text-foreground truncate">Agent Windsurf</p>
                  <p className="text-[11px] text-muted-foreground truncate">Local-first orchestration, chat, automation, and desktop control</p>
                </div>
              </div>

              <div className="hidden lg:flex items-center gap-2">
                <div className="hero-chip text-[11px] font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  <span>{t('liveOrchestration')}</span>
                </div>
                <div className="shell-meta-chip">
                  <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                  <span>{t('systemHealthy')}</span>
                </div>
                <div className="dock-surface px-3 py-2 text-right">
                  <p className="text-[11px] font-semibold text-foreground leading-none">{formatClock(systemTime, language)}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-none">{formatDate(systemTime, language)}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden page-enter">{children}</div>

            <div className="h-[46px] px-4 md:px-6 border-t soft-divider flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-2 w-2 rounded-full bg-success animate-pulse shrink-0" />
                <span className="text-[11px] text-muted-foreground truncate">Release-ready local desktop workspace</span>
              </div>

              <div className="hidden md:flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="rounded-full border border-border bg-secondary/70 px-2.5 py-1">Tasks</span>
                <span className="rounded-full border border-border bg-secondary/70 px-2.5 py-1">Chat</span>
                <span className="rounded-full border border-border bg-secondary/70 px-2.5 py-1">Files</span>
                <span className="rounded-full border border-border bg-secondary/70 px-2.5 py-1">Computer</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
