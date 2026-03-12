import { useState } from 'react';
import { useThemeStore } from '../design-system/theme';
import { ChatInterface } from './ChatInterface';

type PanelType = 'terminal' | 'editor' | 'browser' | 'files' | 'planner';

interface DevinLayoutProps {
  className?: string;
}

export function DevinLayout({ className = '' }: DevinLayoutProps) {
  const { resolvedTheme } = useThemeStore();
  const [activePanel, setActivePanel] = useState<PanelType>('terminal');
  const [showRightPanel, setShowRightPanel] = useState(true);
  const isDark = resolvedTheme === 'dark';

  const panels = [
    { id: 'terminal' as PanelType, label: 'Terminal', icon: '>' },
    { id: 'editor' as PanelType, label: 'Editor', icon: '</>' },
    { id: 'browser' as PanelType, label: 'Browser', icon: '🌐' },
    { id: 'files' as PanelType, label: 'Files', icon: '📁' },
    { id: 'planner' as PanelType, label: 'Planner', icon: '📋' }
  ];

  const renderPanel = () => {
    switch (activePanel) {
      case 'terminal':
        return <TerminalPanel />;
      case 'editor':
        return <EditorPanel />;
      case 'browser':
        return <BrowserPanel />;
      case 'files':
        return <FileTreePanel />;
      case 'planner':
        return <PlannerPanel />;
      default:
        return <TerminalPanel />;
    }
  };

  return (
    <div className={`flex h-screen ${isDark ? 'bg-slate-950' : 'bg-white'} ${className}`}>
      {/* Left Panel - Chat */}
      <div className={`w-full md:w-1/2 lg:w-2/5 flex flex-col border-r ${
        isDark ? 'border-slate-800' : 'border-slate-200'
      }`}>
        {/* Chat Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${
          isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">D</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold">Devin</h1>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                AI Software Engineer
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowRightPanel(!showRightPanel)}
            className={`md:hidden p-2 rounded-lg ${
              isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
            }`}
            title="Toggle workspace"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Chat Content */}
        <ChatInterface className="flex-1" />
      </div>

      {/* Right Panel - Workspace */}
      {showRightPanel && (
        <div className="hidden md:flex md:flex-1 flex-col">
          {/* Tab Bar */}
          <div className={`flex items-center gap-1 px-2 py-2 border-b ${
            isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'
          }`}>
            {panels.map((panel) => (
              <button
                key={panel.id}
                onClick={() => setActivePanel(panel.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activePanel === panel.id
                    ? isDark
                      ? 'bg-slate-800 text-white'
                      : 'bg-white text-slate-900 shadow-sm'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>{panel.icon}</span>
                <span>{panel.label}</span>
              </button>
            ))}
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-hidden">
            {renderPanel()}
          </div>
        </div>
      )}
    </div>
  );
}

// Terminal Panel Component
function TerminalPanel() {
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const [commands] = useState([
    { command: 'npm install', output: 'Installing dependencies...\n✓ Installed 245 packages' },
    { command: 'npm run dev', output: 'Starting development server...\n✓ Server running on http://localhost:1420' },
    { command: 'git status', output: 'On branch main\nYour branch is up to date with \'origin/main\'.' }
  ]);

  return (
    <div className={`h-full p-4 font-mono text-sm ${
      isDark ? 'bg-slate-950 text-green-400' : 'bg-slate-900 text-green-500'
    }`}>
      <div className="space-y-4">
        {commands.map((cmd, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-blue-400">$</span>
              <span className="text-white">{cmd.command}</span>
            </div>
            <div className="pl-4 whitespace-pre-wrap opacity-80">{cmd.output}</div>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <span className="text-blue-400">$</span>
          <span className="animate-pulse">_</span>
        </div>
      </div>
    </div>
  );
}

// Editor Panel Component
function EditorPanel() {
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  return (
    <div className={`h-full flex flex-col ${
      isDark ? 'bg-slate-950' : 'bg-white'
    }`}>
      {/* File Tab */}
      <div className={`flex items-center gap-2 px-4 py-2 border-b ${
        isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'
      }`}>
        <span className="text-sm font-medium">App.tsx</span>
        <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Modified</span>
      </div>

      {/* Code Content */}
      <div className={`flex-1 p-4 font-mono text-sm overflow-auto ${
        isDark ? 'bg-slate-950' : 'bg-white'
      }`}>
        <pre className={isDark ? 'text-slate-300' : 'text-slate-700'}>
{`import { MainLayout } from './components/MainLayout';
import { ThemeProvider } from './providers/ThemeProvider';
import './index.css';

export default function App() {
  return (
    <ThemeProvider>
      <MainLayout />
    </ThemeProvider>
  );
}`}
        </pre>
      </div>
    </div>
  );
}

// Browser Panel Component
function BrowserPanel() {
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  return (
    <div className={`h-full flex flex-col ${
      isDark ? 'bg-slate-950' : 'bg-white'
    }`}>
      {/* Browser Address Bar */}
      <div className={`flex items-center gap-2 px-4 py-3 border-b ${
        isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'
      }`}>
        <button className={`p-1 rounded ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <button className={`p-1 rounded ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
        <div className={`flex-1 px-3 py-1.5 rounded-lg text-sm ${
          isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
        }`}>
          http://localhost:1420
        </div>
        <button className={`p-1 rounded ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Browser Content */}
      <div className={`flex-1 flex items-center justify-center ${
        isDark ? 'bg-slate-900' : 'bg-slate-50'
      }`}>
        <div className="text-center">
          <div className={`text-6xl mb-4`}>🌐</div>
          <p className={`text-lg font-medium mb-2`}>Browser Preview</p>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Your app will appear here
          </p>
        </div>
      </div>
    </div>
  );
}

// File Tree Panel Component
function FileTreePanel() {
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  const files = [
    { name: 'src', type: 'folder', children: [
      { name: 'components', type: 'folder' },
      { name: 'App.tsx', type: 'file' },
      { name: 'index.css', type: 'file' }
    ]},
    { name: 'package.json', type: 'file' },
    { name: 'tsconfig.json', type: 'file' }
  ];

  return (
    <div className={`h-full p-4 ${
      isDark ? 'bg-slate-950' : 'bg-white'
    }`}>
      <div className="space-y-1">
        {files.map((file, i) => (
          <div key={i} className="space-y-1">
            <div className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer ${
              isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
            }`}>
              <span>{file.type === 'folder' ? '📁' : '📄'}</span>
              <span className="text-sm">{file.name}</span>
            </div>
            {file.children && (
              <div className="pl-6 space-y-1">
                {file.children.map((child, j) => (
                  <div key={j} className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer ${
                    isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                  }`}>
                    <span>{child.type === 'folder' ? '📁' : '📄'}</span>
                    <span className="text-sm">{child.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Planner Panel Component
function PlannerPanel() {
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  const steps = [
    { id: 1, title: 'Install dependencies', status: 'completed' },
    { id: 2, title: 'Start development server', status: 'completed' },
    { id: 3, title: 'Implement new feature', status: 'in-progress' },
    { id: 4, title: 'Write tests', status: 'pending' },
    { id: 5, title: 'Deploy to production', status: 'pending' }
  ];

  return (
    <div className={`h-full p-4 ${
      isDark ? 'bg-slate-950' : 'bg-white'
    }`}>
      <h3 className="text-lg font-semibold mb-4">Task Plan</h3>
      <div className="space-y-2">
        {steps.map((step) => (
          <div key={step.id} className={`flex items-start gap-3 p-3 rounded-lg ${
            isDark ? 'bg-slate-900' : 'bg-slate-50'
          }`}>
            <div className="flex-shrink-0 mt-0.5">
              {step.status === 'completed' && (
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              {step.status === 'in-progress' && (
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              )}
              {step.status === 'pending' && (
                <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{step.title}</p>
              <p className={`text-xs mt-1 ${
                step.status === 'completed' ? 'text-green-500' :
                step.status === 'in-progress' ? 'text-blue-500' :
                isDark ? 'text-slate-500' : 'text-slate-400'
              }`}>
                {step.status === 'completed' ? 'Completed' :
                 step.status === 'in-progress' ? 'In Progress' :
                 'Pending'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
