import React, { useState } from 'react';
import { useTranslation } from '../i18n';
import { useThemeStore } from '../design-system/theme';
import { useLanguageStore } from '../i18n';

interface SettingsProps {
  className?: string;
}

export function Settings({ className = '' }: SettingsProps) {
  const { t } = useTranslation();
  const { theme, setTheme } = useThemeStore();
  const { language, setLanguage } = useLanguageStore();
  const [workspacePath, setWorkspacePath] = useState('./workspace');
  const [apiKey, setApiKey] = useState('');
  const [safetyMode, setSafetyMode] = useState('standard');

  const settingsSections = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'theme', label: 'Theme & Language', icon: '🎨' },
    { id: 'workspace', label: 'Workspace', icon: '📁' },
    { id: 'models', label: 'AI Models', icon: '🤖' },
    { id: 'safety', label: 'Safety', icon: '🔒' },
    { id: 'external', label: 'External Tools', icon: '🔗' },
  ];

  const [activeSection, setActiveSection] = useState('general');

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'general':
        return (
          <div className="space-y-5">
            <div>
              <h3 className="text-[16px] font-semibold mb-3.5">{t('generalSettings')}</h3>
              <div className="space-y-3.5">
                <div>
                  <label className="text-[12px] text-muted-foreground mb-1.5 block">{t('applicationName')}</label>
                  <input
                    type="text"
                    value="Agent Windsurf Amline"
                    readOnly
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="text-[12px] text-muted-foreground mb-1.5 block">{t('version')}</label>
                  <input
                    type="text"
                    value="1.0.0"
                    readOnly
                    className="input w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'theme':
        return (
          <div className="space-y-5">
            <div>
              <h3 className="text-[16px] font-semibold mb-3.5">{t('theme')}</h3>
              <div className="space-y-3.5">
                <div>
                  <label className="text-[12px] text-muted-foreground mb-1.5 block">Theme Mode</label>
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
              </div>
            </div>

            <div>
              <h3 className="text-[16px] font-semibold mb-3.5">{t('language')}</h3>
              <div className="space-y-3.5">
                <div>
                  <label className="text-[12px] text-muted-foreground mb-1.5 block">Interface Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as any)}
                    className="input w-full"
                  >
                    <option value="en">English</option>
                    <option value="fa">فارسی (Persian)</option>
                  </select>
                </div>
                <div className="text-[12px] text-muted-foreground">
                  Language change will take effect immediately. Restart may be required for full translation.
                </div>
              </div>
            </div>
          </div>
        );

      case 'workspace':
        return (
          <div className="space-y-5">
            <div>
              <h3 className="text-[16px] font-semibold mb-3.5">{t('workspace')}</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[12px] text-muted-foreground mb-1.5 block">{t('workspacePath')}</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={workspacePath}
                      onChange={(e) => setWorkspacePath(e.target.value)}
                      className="input flex-1"
                    />
                    <button className="btn-secondary text-[12px] h-9 px-3">
                      {t('browse')}
                    </button>
                  </div>
                  <p className="text-[12px] text-muted-foreground mt-2">
                    Directory where Agent Windsurf Amline will store project files and outputs.
                  </p>
                </div>
                <div>
                  <label className="text-[12px] text-muted-foreground mb-1.5 block">{t('autoCleanup')}</label>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="autocleanup" className="rounded" />
                    <label htmlFor="autocleanup" className="text-[13px] text-foreground">
                      Automatically clean up old files after 30 days
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'models':
        return (
          <div className="space-y-5">
            <div>
              <h3 className="text-[16px] font-semibold mb-3.5">{t('models')}</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[12px] text-muted-foreground mb-1.5 block">{t('defaultModel')}</label>
                  <select className="input w-full">
                    <option>GPT-4</option>
                    <option>GPT-3.5 Turbo</option>
                    <option>Claude 3</option>
                    <option>Local Model</option>
                  </select>
                </div>
                <div>
                  <label className="text-[12px] text-muted-foreground mb-1.5 block">{t('apiKey')}</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API key..."
                    className="input w-full"
                  />
                  <p className="text-[12px] text-muted-foreground mt-2">
                    Required for external AI services. Stored locally and encrypted.
                  </p>
                </div>
                <div>
                  <label className="text-[12px] text-muted-foreground mb-1.5 block">{t('maxTokens')}</label>
                  <input
                    type="number"
                    defaultValue="4096"
                    className="input w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'safety':
        return (
          <div className="space-y-5">
            <div>
              <h3 className="text-[16px] font-semibold mb-3.5">{t('safety')}</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[12px] text-muted-foreground mb-1.5 block">{t('safetyMode')}</label>
                  <select
                    value={safetyMode}
                    onChange={(e) => setSafetyMode(e.target.value)}
                    className="input w-full"
                  >
                    <option value="strict">Strict - Maximum safety, limited functionality</option>
                    <option value="standard">Standard - Balanced safety and functionality</option>
                    <option value="permissive">Permissive - Full functionality, user responsibility</option>
                  </select>
                </div>
                <div>
                  <label className="text-[12px] text-muted-foreground mb-1.5 block">{t('computerControl')}</label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="browser_control" className="rounded" />
                      <label htmlFor="browser_control" className="text-[13px] text-foreground">
                        Allow browser automation
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="file_access" className="rounded" />
                      <label htmlFor="file_access" className="text-[13px] text-foreground">
                        Allow file system access within workspace
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="terminal_access" className="rounded" />
                      <label htmlFor="terminal_access" className="text-[13px] text-foreground">
                        Allow terminal command execution
                      </label>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[12px] text-muted-foreground mb-1.5 block">{t('externalToolSupervision')}</label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="chatgpt_supervision" className="rounded" defaultChecked />
                      <label htmlFor="chatgpt_supervision" className="text-[13px] text-foreground">
                        ChatGPT browser supervision
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="ide_supervision" className="rounded" defaultChecked />
                      <label htmlFor="ide_supervision" className="text-[13px] text-foreground">
                        IDE integration (VS Code, Windsurf, Cursor)
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'external':
        return (
          <div className="space-y-5">
            <div>
              <h3 className="text-[16px] font-semibold mb-3.5">External Tools Status</h3>
              <div className="space-y-4">
                {[
                  { name: 'ChatGPT', status: 'available', type: 'browser' },
                  { name: 'VS Code', status: 'available', type: 'desktop' },
                  { name: 'Windsurf', status: 'available', type: 'desktop' },
                  { name: 'Cursor', status: 'available', type: 'desktop' },
                  { name: 'Codex', status: 'unavailable', type: 'api' },
                  { name: 'Generic Browser', status: 'available', type: 'browser' },
                ].map((tool) => (
                  <div key={tool.name} className="surface-elevated flex items-center justify-between p-3.5">
                    <div>
                      <h4 className="text-[13px] font-medium text-foreground">{tool.name}</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Type: {tool.type}</p>
                    </div>
                    <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full shrink-0 ${
                      tool.status === 'available' 
                        ? 'bg-success/12 text-success border-success/20 border' 
                        : 'bg-destructive/12 text-destructive border-destructive/20 border'
                    }`}>
                      {tool.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`p-5 ${className}`}>
      <div className="mb-5">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-2.5">{t('configuration')}</p>
        <h1 className="text-[22px] font-semibold text-foreground leading-tight">{t('settings')}</h1>
        <p className="text-[13px] text-muted-foreground mt-2.5">{t('configurePreferences')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <nav className="space-y-0.5">
            {settingsSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`nav-row w-full ${activeSection === section.id ? 'nav-row-active' : ''}`}
              >
                <span className="text-[14px]">{section.icon}</span>
                <span className="text-[13px] font-medium">{section.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-1">
          <div className="surface-card p-5">
            {renderSectionContent()}
            
            {/* Save Button */}
            <div className="mt-6 pt-5 border-t soft-divider">
              <div className="flex justify-end gap-2">
                <button className="btn-secondary text-[12px] h-8 px-3">
                  {t('resetToDefaults')}
                </button>
                <button className="btn-primary text-[12px] h-8 px-3">
                  {t('saveSettings')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
