import React, { useState } from 'react';
import { useTranslation } from '../i18n';
import { useThemeStore } from '../design-system/theme';
import { useLanguageStore } from '../i18n';

interface Command {
  id: string;
  label: string;
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const { t } = useTranslation();
  const { setTheme } = useThemeStore();
  const { setLanguage } = useLanguageStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands: Command[] = [
    {
      id: 'run-agent',
      label: 'Run Agent',
      action: () => {
        console.log('Run Agent');
        onClose();
      },
      keywords: ['run', 'agent', 'execute'],
    },
    {
      id: 'open-workspace',
      label: 'Open Workspace',
      action: () => {
        console.log('Open Workspace');
        onClose();
      },
      keywords: ['workspace', 'preview', 'editor', 'terminal'],
    },
    {
      id: 'search-files',
      label: 'Search Files',
      action: () => {
        console.log('Search Files');
        onClose();
      },
      keywords: ['files', 'search', 'find'],
    },
    {
      id: 'create-task',
      label: t('createTask'),
      action: () => {
        console.log('Create task');
        onClose();
      },
      keywords: ['new', 'task', 'create'],
    },
    {
      id: 'toggle-theme',
      label: t('toggleTheme'),
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
      action: () => {
        const { language } = useLanguageStore.getState();
        setLanguage(language === 'en' ? 'fa' : 'en');
        onClose();
      },
      keywords: ['language', 'فارسی', 'english'],
    },
    {
      id: 'open-settings',
      label: t('openSettings'),
      action: () => {
        // TODO: Navigate to settings
        console.log('Open settings');
        onClose();
      },
      keywords: ['settings', 'preferences', 'تنظیمات'],
    },
  ];

  const filteredCommands = commands.filter(command =>
    command.label.toLowerCase().includes(query.toLowerCase()) ||
    command.keywords?.some(keyword => keyword.toLowerCase().includes(query.toLowerCase()))
  );

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Command Palette */}
      <div className="relative w-full max-w-2xl mx-4">
        <div className="panel border rounded-lg shadow-2xl overflow-hidden">
          {/* Search Input */}
          <div className="p-4 border-b">
            <input
              type="text"
              placeholder={t('commandPalette')}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              className="w-full bg-transparent border-none outline-none text-foreground placeholder-muted-foreground"
              autoFocus
            />
          </div>
          
          {/* Commands List */}
          <div className="max-h-96 overflow-y-auto">
            {filteredCommands.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No commands found
              </div>
            ) : (
              <div className="py-2">
                {filteredCommands.map((command, index) => (
                  <button
                    key={command.id}
                    className={`w-full px-4 py-2 text-left hover:bg-accent transition-colors ${
                      index === selectedIndex ? 'bg-accent' : ''
                    }`}
                    onClick={() => command.action()}
                  >
                    <div className="font-medium">{command.label}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="p-2 border-t text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>↑↓ Navigate</span>
              <span>Enter Select</span>
              <span>Esc Close</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Global command palette hook
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    open,
    close,
    CommandPalette: () => <CommandPalette isOpen={isOpen} onClose={close} />,
  };
}
