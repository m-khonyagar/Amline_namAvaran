import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '../i18n';
import { useThemeStore } from '../design-system/theme';
import { useLanguageStore } from '../i18n';
import { backend } from '../api';

interface SettingsProps {
  className?: string;
}

type SettingsSection = 'general' | 'theme' | 'workspace' | 'execution' | 'safety';

const DEFAULT_SETTINGS = {
  workspacePath: './workspace',
  safetyMode: 'standard',
  preferredModel: 'Local executor',
};

const SECTION_META: Record<SettingsSection, { title: string; eyebrow: string; description: string; badge: string }> = {
  general: {
    title: 'Product baseline',
    eyebrow: 'System profile',
    description: 'See the current product scope, installed build, and what this local release is designed to do well.',
    badge: 'Core',
  },
  theme: {
    title: 'Interface tone',
    eyebrow: 'Display system',
    description: 'Switch the visual atmosphere and language instantly so the workspace stays comfortable for daily use.',
    badge: 'Visual',
  },
  workspace: {
    title: 'Workspace root',
    eyebrow: 'Storage path',
    description: 'Choose where new tasks create their local folders and where generated output should appear by default.',
    badge: 'Files',
  },
  execution: {
    title: 'Execution defaults',
    eyebrow: 'Run profile',
    description: 'Control the default operating mode used when new tasks are created from the queue.',
    badge: 'Runtime',
  },
  safety: {
    title: 'Operating posture',
    eyebrow: 'Guardrails',
    description: 'Keep the local workflow aligned with the amount of caution you want by default.',
    badge: 'Policy',
  },
};

export function Settings({ className = '' }: SettingsProps) {
  const { t } = useTranslation();
  const { theme, setTheme } = useThemeStore();
  const { language, setLanguage } = useLanguageStore();
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  const [workspacePath, setWorkspacePath] = useState(DEFAULT_SETTINGS.workspacePath);
  const [preferredModel, setPreferredModel] = useState(DEFAULT_SETTINGS.preferredModel);
  const [safetyMode, setSafetyMode] = useState(DEFAULT_SETTINGS.safetyMode);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await backend.getSettings();
        if (data) {
          setWorkspacePath(data.workspacePath || DEFAULT_SETTINGS.workspacePath);
          setPreferredModel(data.preferredModel || DEFAULT_SETTINGS.preferredModel);
          setSafetyMode(data.safetyMode || DEFAULT_SETTINGS.safetyMode);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
        setMessage('Unable to load settings because the backend is not available yet.');
      } finally {
        setLoading(false);
      }
    };
    void loadSettings();
  }, []);

  const sections = useMemo(
    () => [
      { id: 'general' as const, label: 'General', icon: 'Control' },
      { id: 'theme' as const, label: 'Theme & Language', icon: 'Display' },
      { id: 'workspace' as const, label: 'Workspace', icon: 'Folder' },
      { id: 'execution' as const, label: 'Execution', icon: 'Engine' },
      { id: 'safety' as const, label: 'Safety', icon: 'Guardrails' },
    ],
    []
  );

  const saveSettings = async () => {
    try {
      setSaving(true);
      setMessage('');
      await backend.updateSettings({
        workspacePath,
        preferredModel,
        safetyMode,
      });
      setMessage('Settings saved successfully.');
    } catch (error) {
      console.error('Failed to save settings:', error);
      setMessage('Saving failed because the backend did not accept the update.');
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = async () => {
    setWorkspacePath(DEFAULT_SETTINGS.workspacePath);
    setPreferredModel(DEFAULT_SETTINGS.preferredModel);
    setSafetyMode(DEFAULT_SETTINGS.safetyMode);
    setMessage('Defaults restored locally. Save to persist them.');
  };

  const content = () => {
    switch (activeSection) {
      case 'general':
        return (
          <div className="space-y-5">
            <div className="surface-elevated p-4">
              <p className="text-[12px] text-muted-foreground">{t('applicationName')}</p>
              <p className="mt-2 text-[14px] font-semibold text-foreground">Agent Windsurf</p>
            </div>
            <div className="surface-elevated p-4">
              <p className="text-[12px] text-muted-foreground">{t('version')}</p>
              <p className="mt-2 text-[14px] font-semibold text-foreground">0.2.0 baseline</p>
            </div>
            <div className="surface-elevated p-4">
              <p className="text-[12px] text-muted-foreground">Current scope</p>
              <p className="mt-2 text-[13px] leading-6 text-foreground">
                This build focuses on a reliable local task flow: create tasks, plan them, run them, inspect events,
                and download generated artifacts.
              </p>
            </div>
          </div>
        );
      case 'theme':
        return (
          <div className="space-y-5">
            <div>
              <label className="text-[12px] text-muted-foreground mb-1.5 block">Theme mode</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="input w-full"
              >
                <option value="system">{t('system')}</option>
                <option value="dark">{t('darkMode')}</option>
                <option value="light">{t('lightMode')}</option>
              </select>
            </div>
            <div>
              <label className="text-[12px] text-muted-foreground mb-1.5 block">Interface language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="input w-full"
              >
                <option value="en">English</option>
                <option value="fa">Persian</option>
              </select>
              <p className="text-[12px] text-muted-foreground mt-2">
                Language changes apply immediately across the current product flow.
              </p>
            </div>
          </div>
        );
      case 'workspace':
        return (
          <div className="space-y-5">
            <div>
              <label className="text-[12px] text-muted-foreground mb-1.5 block">{t('workspacePath')}</label>
              <input
                type="text"
                value={workspacePath}
                onChange={(e) => setWorkspacePath(e.target.value)}
                className="input w-full"
              />
              <p className="text-[12px] text-muted-foreground mt-2">
                New tasks are created under this folder. Relative paths are resolved from the project root.
              </p>
            </div>
          </div>
        );
      case 'execution':
        return (
          <div className="space-y-5">
            <div>
              <label className="text-[12px] text-muted-foreground mb-1.5 block">{t('defaultModel')}</label>
              <select
                value={preferredModel}
                onChange={(e) => setPreferredModel(e.target.value)}
                className="input w-full"
              >
                <option>Local executor</option>
                <option>Guided planner</option>
                <option>Fast iteration mode</option>
              </select>
              <p className="text-[12px] text-muted-foreground mt-2">
                This setting chooses the default execution profile used when new tasks are created in this local build.
              </p>
            </div>
          </div>
        );
      case 'safety':
        return (
          <div className="space-y-5">
            <div>
              <label className="text-[12px] text-muted-foreground mb-1.5 block">{t('safetyMode')}</label>
              <select
                value={safetyMode}
                onChange={(e) => setSafetyMode(e.target.value)}
                className="input w-full"
              >
                <option value="strict">Strict</option>
                <option value="standard">Standard</option>
                <option value="permissive">Permissive</option>
              </select>
              <p className="text-[12px] text-muted-foreground mt-2">
                Safety mode is saved with your preferences and applied as the default operating posture for new tasks.
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className={`p-5 ${className}`}>
      <div className="mb-5">
        <p className="shell-section-label mb-2.5">{t('configuration')}</p>
        <div className="hero-chip mb-3 text-[11px] font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          <span>Control center</span>
        </div>
        <h1 className="text-[22px] font-semibold text-foreground leading-tight">{t('settings')}</h1>
        <p className="text-[13px] text-muted-foreground mt-2.5">
          Configure the real local settings that the current build already uses.
        </p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Workspace', value: workspacePath, caption: 'Default root for new local task folders' },
          { label: 'Theme', value: theme, caption: 'Visual atmosphere for the desktop shell' },
          { label: 'Language', value: language.toUpperCase(), caption: 'Current interface language' },
          { label: 'Safety', value: safetyMode, caption: 'Default operating posture for new runs' },
        ].map((item) => (
          <div key={item.label} className="surface-card p-4">
            <p className="shell-section-label">{item.label}</p>
            <p className="mt-2 text-[14px] font-semibold text-foreground break-all">{item.value}</p>
            <p className="mt-1.5 text-[11px] text-muted-foreground">{item.caption}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
        <div>
          <nav className="space-y-0.5">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`nav-row w-full ${activeSection === section.id ? 'nav-row-active' : ''}`}
              >
                <span className="text-[13px]">{section.icon}</span>
                <span className="text-[13px] font-medium">{section.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div>
          <div className="surface-card glass-frame p-5">
            <div className="surface-elevated p-4 mb-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
                    {SECTION_META[activeSection].eyebrow}
                  </p>
                  <h2 className="text-[18px] font-semibold tracking-[-0.03em] text-foreground">
                    {SECTION_META[activeSection].title}
                  </h2>
                  <p className="text-[13px] text-muted-foreground mt-2 leading-relaxed">
                    {SECTION_META[activeSection].description}
                  </p>
                </div>
                <span className="shell-meta-chip">
                  {SECTION_META[activeSection].badge}
                </span>
              </div>
            </div>

            {content()}

            {message && (
              <div className="mt-5 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-[12px] text-muted-foreground">
                {message}
              </div>
            )}

            <div className="mt-6 pt-5 border-t soft-divider">
              <div className="flex justify-end gap-2">
                <button className="btn-secondary text-[12px] h-8 px-3" onClick={resetSettings}>
                  {t('resetToDefaults')}
                </button>
                <button className="btn-primary text-[12px] h-8 px-3" onClick={saveSettings} disabled={saving}>
                  {saving ? t('loading') : t('saveSettings')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
