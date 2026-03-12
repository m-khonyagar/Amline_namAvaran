import React, { useState } from 'react';

type WorkspaceTab = 'browser' | 'terminal' | 'editor' | 'logs' | 'preview';

interface WorkspacePanelProps {
  className?: string;
}

const tabs: { id: WorkspaceTab; label: string }[] = [
  { id: 'browser', label: 'Browser' },
  { id: 'terminal', label: 'Terminal' },
  { id: 'editor', label: 'Editor' },
  { id: 'logs', label: 'Logs' },
  { id: 'preview', label: 'Preview' },
];

export function WorkspacePanel({ className = '' }: WorkspacePanelProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('browser');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'browser':
        return (
          <div className="p-3 h-full">
            <div className="surface-elevated h-full overflow-hidden">
              <div className="flex items-center gap-2 px-3 h-[34px] border-b soft-divider bg-secondary/35">
                <span className="w-2 h-2 rounded-full bg-destructive/80" />
                <span className="w-2 h-2 rounded-full bg-warning/80" />
                <span className="w-2 h-2 rounded-full bg-success/80" />
                <div className="ml-2 flex-1 rounded-md border border-border bg-background px-3 py-1 text-[12px] text-muted-foreground">
                  https://workspace.local/preview
                </div>
              </div>
              <div className="p-3 h-full">
                <div className="surface-card h-full p-4">
                  <p className="text-[14px] font-semibold text-foreground">Browser session</p>
                  <p className="text-[12px] text-muted-foreground mt-1">Automation-ready preview with live navigation context.</p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="surface-elevated p-3">
                      <p className="text-[12px] text-muted-foreground">Current URL</p>
                      <p className="mt-1 text-[12px] text-foreground">workspace.local/preview</p>
                    </div>
                    <div className="surface-elevated p-3">
                      <p className="text-[12px] text-muted-foreground">Automation</p>
                      <p className="mt-1 text-[12px] text-primary">Connected</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'terminal':
        return (
          <div className="p-3 font-mono text-[12px] h-full">
            <div className="space-y-2">
              <div className="text-muted-foreground">$ agent status</div>
              <div className="text-foreground">Agent ready. Waiting for tasks.</div>
              <div className="text-muted-foreground">$ npm run build</div>
              <div className="text-success">Build completed in 5.54s</div>
              <div className="text-muted-foreground">$ git status</div>
              <div className="text-foreground">working tree clean</div>
            </div>
          </div>
        );
      case 'editor':
        return (
          <div className="p-3 font-mono text-[12px]">
            <div className="surface-elevated overflow-hidden">
              <div className="px-3 h-[34px] flex items-center border-b soft-divider bg-secondary/35 text-[12px] text-muted-foreground">
                `src/App.tsx`
              </div>
              <div className="p-4 space-y-2">
                <div className="text-muted-foreground">1  import React from 'react';</div>
                <div className="text-muted-foreground">2  import {'{ Sidebar }'} from './components/Sidebar';</div>
                <div className="text-foreground">3  const workspace = 'Professional AI Workspace';</div>
                <div className="text-muted-foreground">4  // Select a file to edit</div>
              </div>
            </div>
          </div>
        );
      case 'logs':
        return (
          <div className="p-3 font-mono text-[12px] space-y-2">
            <div className="text-info">[INFO] System initialized</div>
            <div className="text-info">[INFO] Backend connected</div>
            <div className="text-warning">[WAIT] Agent is planning next step</div>
            <div className="text-success">[READY] Agent Windsurf Amline</div>
          </div>
        );
      case 'preview':
        return (
          <div className="p-3 h-full">
            <div className="surface-elevated h-full bg-gradient-to-br from-primary/12 to-transparent flex items-center justify-center">
              <div className="text-center">
                <p className="text-[14px] font-semibold text-foreground">Live Preview</p>
                <p className="text-[12px] text-muted-foreground mt-1">Rendered app output and visual verification.</p>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`surface-panel flex flex-col overflow-hidden ${className}`} style={{ minWidth: 420 }}>
      <div className="px-4 py-4 border-b soft-divider">
        <h3 className="text-[16px] font-semibold text-foreground">Workspace</h3>
        <p className="text-[12px] text-muted-foreground mt-1">Lightweight developer environment</p>
      </div>
      <div className="flex border-b soft-divider overflow-x-auto px-2 py-2 gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`h-[34px] px-3 rounded-lg text-[12px] font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'text-primary bg-primary/10 border border-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto min-h-0">{renderTabContent()}</div>
    </div>
  );
}
