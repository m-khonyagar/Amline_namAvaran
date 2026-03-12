import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Dashboard } from './components/Dashboard';
import { AgentsView } from './components/AgentsView';
import { TasksList } from './components/TasksList';
import { TaskDetail } from './components/TaskDetail';
import { MemoryExplorer } from './components/MemoryExplorer';
import { ArtifactsViewer } from './components/ArtifactsViewer';
import { Settings } from './components/Settings';
import { Integrations } from './components/Integrations';
import { AgentCollaboration } from './components/AgentCollaboration';
import { ExternalSupervision } from './components/ExternalSupervision';
import { ComputerControl } from './components/ComputerControl';
import { ChatInterface } from './components/ChatInterface';
import { BottomInput } from './components/BottomInput';
import { ConversationPanel } from './components/ConversationPanel';
import { AgentBrainPanel } from './components/AgentBrainPanel';
import { WorkspacePanel } from './components/WorkspacePanel';
import { ThemeProvider } from './providers/ThemeProvider';
import { useCommandPalette } from './components/CommandPalette';
import { ProgressOverlay } from './components/ProgressOverlay';
import { useProgressStore } from './stores/progressStore';
import './index.css';

type Page = 'dashboard' | 'agents' | 'tasks' | 'files' | 'history' | 'integrations' | 'settings' | 'task-detail' | 'collaboration' | 'supervision' | 'computer-control';

function AppContent() {
  const { CommandPalette } = useCommandPalette();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const progress = useProgressStore();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [agentStatus, setAgentStatus] = useState<'running' | 'completed' | 'waiting' | 'error' | 'paused' | 'idle'>('idle');
  const [agentBrain, setAgentBrain] = useState({ goal: 'No active goal', steps: [] as string[], currentStep: 0, totalSteps: 0 });
  const [recentActions, setRecentActions] = useState<string[]>(['Workspace ready']);

  const [chatMessages, setChatMessages] = useState<import('./components/ChatInterface').Message[]>([]);

  const pushRecentAction = (action: string) => {
    setRecentActions((prev) => [action, ...prev].slice(0, 6));
  };

  const addChatMessage = (role: 'user' | 'agent', content: string) => {
    const msg: import('./components/ChatInterface').Message = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date(),
      status: 'sent',
    };
    setChatMessages((prev) => [...prev, msg]);
  };

  const handleChatSubmit = () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatInput('');
    setShowChat(true);
    addChatMessage('user', text);
    pushRecentAction('User submitted a new task prompt');
    setAgentBrain({ goal: text, steps: ['Analyzing request', 'Planning', 'Executing'], currentStep: 1, totalSteps: 3 });
    setAgentStatus('running');
    setTimeout(() => {
      addChatMessage('agent', 'Processing your request. This will connect to the agent backend when available.');
      pushRecentAction('Agent started orchestration plan');
    }, 600);
  };

  const handleSuggestionClick = (text: string) => {
    setShowChat(true);
    addChatMessage('user', text);
    pushRecentAction('Quick action launched from suggestions');
    setAgentBrain({ goal: text, steps: ['Analyzing', 'Planning', 'Executing'], currentStep: 1, totalSteps: 3 });
    setAgentStatus('running');
    setTimeout(() => {
      addChatMessage('agent', 'Processing your request. This will connect to the agent backend when available.');
      pushRecentAction('Agent acknowledged request');
    }, 600);
  };

  const showBottomInput = currentPage === 'dashboard';
  const showRightPanels = !['settings', 'integrations'].includes(currentPage);

  const renderConversationContent = () => {
    const scrollable = (node: React.ReactNode) => (
      <div className="flex-1 overflow-auto min-h-0">{node}</div>
    );
    switch (currentPage) {
      case 'dashboard':
        if (showChat) return <ChatInterface messages={chatMessages} hideInput />;
        return scrollable(<Dashboard />);
      case 'agents':
        return scrollable(<AgentsView />);
      case 'tasks':
        return scrollable(<TasksList onTaskSelect={(id) => { setSelectedTaskId(id); setCurrentPage('task-detail'); }} />);
      case 'task-detail':
        return scrollable(<TaskDetail taskId={selectedTaskId || undefined} />);
      case 'files':
        return scrollable(<ArtifactsViewer />);
      case 'history':
        return scrollable(<MemoryExplorer />);
      case 'integrations':
        return scrollable(<Integrations />);
      case 'settings':
        return scrollable(<Settings />);
      case 'collaboration':
        return scrollable(<AgentCollaboration taskId={selectedTaskId || undefined} />);
      case 'supervision':
        return scrollable(<ExternalSupervision taskId={selectedTaskId || undefined} />);
      case 'computer-control':
        return scrollable(<ComputerControl />);
      default:
        return scrollable(<Dashboard />);
    }
  };

  return (
    <ThemeProvider>
      <div className="h-screen flex bg-background p-3 gap-3 overflow-hidden">
        <Sidebar
          currentPage={currentPage}
          onPageChange={(page) => {
            setCurrentPage(page as Page);
            if (page === 'dashboard') {
              setShowChat(false);
              setChatMessages([]);
              pushRecentAction('Returned to dashboard');
            }
          }}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <div className="surface-panel flex-1 flex flex-col min-w-0 overflow-hidden">
          <TopBar currentPage={currentPage} />
          <div className="flex-1 min-h-0 overflow-hidden p-3">
            <div className={`grid h-full min-h-0 gap-3 ${showRightPanels ? 'grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_320px_420px]' : 'grid-cols-1'}`}>
              <ConversationPanel
                showCommandCenter={showChat || currentPage === 'task-detail'}
                showTimeline={showChat || currentPage === 'task-detail'}
                agentStatus={agentStatus}
                onStart={() => {
                  setAgentStatus('running');
                  pushRecentAction('Execution started');
                }}
                onPause={() => {
                  setAgentStatus('paused');
                  pushRecentAction('Execution paused');
                }}
                onResume={() => {
                  setAgentStatus('running');
                  pushRecentAction('Execution resumed');
                }}
                onStop={() => {
                  setAgentStatus('idle');
                  pushRecentAction('Execution stopped');
                }}
                onApprove={() => {
                  setAgentStatus('completed');
                  pushRecentAction('Waiting step approved');
                }}
                onEdit={() => {
                  setAgentStatus('waiting');
                  pushRecentAction('Execution moved to edit/review');
                }}
                onCancel={() => {
                  setAgentStatus('idle');
                  setAgentBrain({ goal: 'No active goal', steps: [], currentStep: 0, totalSteps: 0 });
                  setShowChat(false);
                  pushRecentAction('Task cancelled');
                }}
              >
                {renderConversationContent()}
              </ConversationPanel>
              {showRightPanels && (
                <>
                  <AgentBrainPanel
                    className="hidden lg:flex"
                    goal={agentBrain.goal}
                    steps={agentBrain.steps}
                    currentStep={agentBrain.currentStep}
                    totalSteps={agentBrain.totalSteps}
                    status={agentStatus}
                    recentActions={recentActions}
                  />
                  <WorkspacePanel className="hidden xl:flex" />
                </>
              )}
            </div>
          </div>
          {showBottomInput && (
            <BottomInput
              value={chatInput}
              onChange={setChatInput}
              onSubmit={handleChatSubmit}
            />
          )}
        </div>
      </div>
      <CommandPalette />
      <ProgressOverlay
        visible={progress.visible}
        currentTask={progress.currentTask}
        progress={progress.progress}
        currentStep={progress.currentStep}
        totalSteps={progress.totalSteps}
        etaSeconds={progress.etaSeconds ?? undefined}
      />
    </ThemeProvider>
  );
}

export default function App() {
  return <AppContent />;
}
