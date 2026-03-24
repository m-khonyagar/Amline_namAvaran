import React, { Suspense, lazy, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Dashboard } from './components/Dashboard';
import { WindowsDesktopLayout } from './components/WindowsDesktopLayout';
import { AgentsView } from './components/AgentsView';
import { TasksList } from './components/TasksList';
import { Settings } from './components/Settings';
import { ThemeProvider } from './providers/ThemeProvider';
import { useCommandPalette } from './components/CommandPalette';
import { ProgressOverlay } from './components/ProgressOverlay';
import { useProgressStore } from './stores/progressStore';
import './index.css';

const TaskDetail = lazy(() => import('./components/TaskDetail').then((module) => ({ default: module.TaskDetail })));
const MemoryExplorer = lazy(() => import('./components/MemoryExplorer').then((module) => ({ default: module.MemoryExplorer })));
const ArtifactsViewer = lazy(() => import('./components/ArtifactsViewer').then((module) => ({ default: module.ArtifactsViewer })));
const ComputerControl = lazy(() => import('./components/ComputerControl').then((module) => ({ default: module.ComputerControl })));
const WorkspaceChat = lazy(() => import('./components/WorkspaceChat').then((module) => ({ default: module.WorkspaceChat })));

type Page = 'dashboard' | 'agents' | 'tasks' | 'files' | 'history' | 'settings' | 'task-detail' | 'computer' | 'chat';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const progress = useProgressStore();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const useWindowsLayout = true;

  const openTaskDetail = (taskId: string | null) => {
    setSelectedTaskId(taskId);
    setCurrentPage(taskId ? 'task-detail' : 'tasks');
  };

  const navigate = (page: Page) => {
    setCurrentPage(page);
    if (page !== 'task-detail' && page !== 'tasks') {
      setSelectedTaskId(null);
    }
  };

  const { CommandPalette } = useCommandPalette({
    onNavigate: (page) => navigate(page),
    onOpenSelectedTask: () => {
      if (selectedTaskId) {
        setCurrentPage('task-detail');
      } else {
        setCurrentPage('tasks');
      }
    },
  });

  const lazySurface = (node: React.ReactNode) => (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }
    >
      {node}
    </Suspense>
  );

  const renderConversationContent = () => {
    const scrollable = (node: React.ReactNode) => (
      <div className="flex-1 overflow-auto min-h-0">{node}</div>
    );
    switch (currentPage) {
      case 'dashboard':
        return scrollable(
          <Dashboard
            onOpenAgents={() => navigate('agents')}
            onOpenTasks={() => navigate('tasks')}
            onOpenFiles={() => navigate('files')}
            onOpenSettings={() => navigate('settings')}
            onOpenTaskDetail={(id) => openTaskDetail(id)}
          />
        );
      case 'agents':
        return scrollable(<AgentsView />);
      case 'tasks':
        return scrollable(
          <TasksList
            onTaskSelect={(id) => openTaskDetail(id)}
            onOpenFiles={() => navigate('files')}
          />
        );
      case 'task-detail':
        return scrollable(lazySurface(<TaskDetail taskId={selectedTaskId || undefined} />));
      case 'files':
        return scrollable(lazySurface(<ArtifactsViewer />));
      case 'chat':
        return scrollable(lazySurface(<WorkspaceChat />));
      case 'history':
        return scrollable(lazySurface(<MemoryExplorer />));
      case 'settings':
        return scrollable(<Settings />);
      case 'computer':
        return scrollable(lazySurface(<ComputerControl />));
      default:
        return scrollable(
          <Dashboard
            onOpenAgents={() => navigate('agents')}
            onOpenTasks={() => navigate('tasks')}
            onOpenFiles={() => navigate('files')}
            onOpenSettings={() => navigate('settings')}
            onOpenTaskDetail={(id) => openTaskDetail(id)}
          />
        );
    }
  };

  const mainContent = (
    <div className="flex flex-col h-full bg-background text-foreground">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          currentPage={currentPage}
          onPageChange={(page) => {
            navigate(page as Page);
          }}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar */}
          <TopBar
            currentPage={currentPage}
          />

          {/* Page Content */}
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col min-w-0">
              {renderConversationContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <ThemeProvider>
      <div className="h-screen flex flex-col overflow-hidden">
        <ProgressOverlay
          visible={progress.visible}
          currentTask={progress.currentTask}
          progress={progress.progress}
          currentStep={progress.currentStep}
          totalSteps={progress.totalSteps}
          etaSeconds={progress.etaSeconds ?? undefined}
        />
        <CommandPalette />
        {useWindowsLayout ? (
          <WindowsDesktopLayout>
            {mainContent}
          </WindowsDesktopLayout>
        ) : (
          mainContent
        )}
      </div>
    </ThemeProvider>
  );
}

export default function App() {
  return <AppContent />;
}
