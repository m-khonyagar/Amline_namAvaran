import React, { useMemo, useState } from 'react';
import { useTranslation } from '../i18n';
import { useThemeStore } from '../design-system/theme';
import { useLanguageStore } from '../i18n';

type AppPage = 'dashboard' | 'agents' | 'tasks' | 'files' | 'history' | 'settings' | 'task-detail' | 'computer' | 'chat';

interface Command {
  id: string;
  label: string;
  hint: string;
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (page: AppPage) => void;
  onOpenSelectedTask?: () => void;
}

export function CommandPalette({ isOpen, onClose, onNavigate, onOpenSelectedTask }: CommandPaletteProps) {
  const { t } = useTranslation();
  const { setTheme } = useThemeStore();
  const { setLanguage } = useLanguageStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands: Command[] = useMemo(
    () => [
      {
        id: 'open-dashboard',
        label: t('dashboard'),
        hint: 'Open the live overview and current workspace health.',
        action: () => {
          onNavigate?.('dashboard');
          onClose();
        },
        keywords: ['dashboard', 'overview', 'home'],
      },
      {
        id: 'open-tasks',
        label: t('tasks'),
        hint: 'Create a focused task or review the active queue.',
        action: () => {
          onNavigate?.('tasks');
          onClose();
        },
        keywords: ['tasks', 'list', 'queue'],
      },
      {
        id: 'open-chat',
        label: 'Chat',
        hint: 'Open interactive chat, attach files, assign tools, and switch to agent mode.',
        action: () => {
          onNavigate?.('chat');
          onClose();
        },
        keywords: ['chat', 'assistant', 'gmail', 'upload', 'agent mode'],
      },
      {
        id: 'open-selected-task',
        label: t('taskDetail'),
        hint: 'Jump into the currently selected workflow.',
        action: () => {
          onOpenSelectedTask?.();
          onClose();
        },
        keywords: ['task', 'detail', 'selected'],
      },
      {
        id: 'open-agents',
        label: t('agents'),
        hint: 'Inspect live executor and planner activity.',
        action: () => {
          onNavigate?.('agents');
          onClose();
        },
        keywords: ['agents', 'workers', 'orchestration'],
      },
      {
        id: 'open-files',
        label: t('files'),
        hint: 'Preview generated outputs and download artifacts.',
        action: () => {
          onNavigate?.('files');
          onClose();
        },
        keywords: ['files', 'artifacts', 'downloads'],
      },
      {
        id: 'open-computer-control',
        label: t('computerControl'),
        hint: 'Open the desktop operator for PowerShell, screenshots, keyboard, and mouse control.',
        action: () => {
          onNavigate?.('computer');
          onClose();
        },
        keywords: ['computer', 'powershell', 'terminal', 'desktop', 'mouse', 'keyboard'],
      },
      {
        id: 'open-history',
        label: t('history'),
        hint: 'Review memory and prior workflow context.',
        action: () => {
          onNavigate?.('history');
          onClose();
        },
        keywords: ['history', 'memory', 'activity'],
      },
      {
        id: 'toggle-theme',
        label: t('toggleTheme'),
        hint: 'Switch between light and dark presentation.',
        action: () => {
          const { theme } = useThemeStore.getState();
          setTheme(theme === 'dark' ? 'light' : 'dark');
          onClose();
        },
        keywords: ['theme', 'dark', 'light'],
      },
      {
        id: 'switch-language',
        label: t('switchLanguage'),
        hint: 'Toggle the interface language between English and Persian.',
        action: () => {
          const { language } = useLanguageStore.getState();
          setLanguage(language === 'en' ? 'fa' : 'en');
          onClose();
        },
        keywords: ['language', 'farsi', 'english'],
      },
      {
        id: 'open-settings',
        label: t('openSettings'),
        hint: 'Adjust workspace, execution, and safety defaults.',
        action: () => {
          onNavigate?.('settings');
          onClose();
        },
        keywords: ['settings', 'preferences', 'config'],
      },
    ],
    [onClose, onNavigate, onOpenSelectedTask, setLanguage, setTheme, t]
  );

  const filteredCommands = useMemo(
    () =>
      commands.filter(
        (command) =>
          command.label.toLowerCase().includes(query.toLowerCase()) ||
          command.hint.toLowerCase().includes(query.toLowerCase()) ||
          command.keywords?.some((keyword) => keyword.toLowerCase().includes(query.toLowerCase()))
      ),
    [commands, query]
  );

  React.useEffect(() => {
    setSelectedIndex(0);
  }, [query, isOpen]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (filteredCommands.length === 0 && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter')) {
        e.preventDefault();
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
          break;
        case 'Enter':
          e.preventDefault();
          filteredCommands[selectedIndex]?.action();
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredCommands, isOpen, onClose, selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-2xl page-enter">
        <div className="surface-panel glass-frame overflow-hidden shadow-[0_30px_80px_hsl(220_35%_2%_/0.42)]">
          <div className="p-5 border-b soft-divider">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">{t('commandPalette')}</p>
                <h3 className="text-[18px] font-semibold text-foreground">Navigate the workspace quickly</h3>
              </div>
              <div className="hidden md:flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="rounded-lg border border-border bg-secondary/70 px-2 py-1">Enter</span>
                <span className="rounded-lg border border-border bg-secondary/70 px-2 py-1">Esc</span>
              </div>
            </div>
            <input
              type="text"
              placeholder="Search pages, actions, and settings"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input w-full h-12 text-[14px]"
              autoFocus
            />
          </div>

          <div className="max-h-[420px] overflow-y-auto shell-scroll p-3">
            {filteredCommands.length === 0 ? (
              <div className="surface-card p-8 text-center">
                <p className="text-[14px] font-medium text-foreground">No matching commands</p>
                <p className="text-[12px] text-muted-foreground mt-2">Try searching for tasks, files, settings, theme, or language.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCommands.map((command, index) => (
                  <button
                    key={command.id}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
                      index === selectedIndex
                        ? 'border-primary/25 bg-primary/12 text-foreground'
                        : 'border-border bg-secondary/30 text-foreground hover:bg-accent'
                    }`}
                    onClick={() => command.action()}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[14px] font-semibold">{command.label}</div>
                        <div className="text-[12px] text-muted-foreground mt-1 leading-relaxed">{command.hint}</div>
                      </div>
                      <span className="rounded-full border border-border bg-secondary/70 px-2 py-1 text-[10px] text-muted-foreground">
                        {index + 1}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 border-t soft-divider">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <span>Arrow keys move through commands.</span>
              <span>Enter opens the selected item.</span>
              <span>Escape closes the palette.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function useCommandPalette(options: {
  onNavigate?: (page: AppPage) => void;
  onOpenSelectedTask?: () => void;
} = {}) {
  const [isOpen, setIsOpen] = useState(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    open,
    close,
    CommandPalette: () => (
      <CommandPalette
        isOpen={isOpen}
        onClose={close}
        onNavigate={options.onNavigate}
        onOpenSelectedTask={options.onOpenSelectedTask}
      />
    ),
  };
}
