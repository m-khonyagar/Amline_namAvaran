import React, { useState } from 'react';
import { AdaptiveNav } from './AdaptiveNav';
import { ChatInterface } from './ChatInterface';
import { TaskPanel } from './TaskPanel';
import { useThemeStore } from '../design-system/theme';

interface MainLayoutProps {
  className?: string;
}

export function MainLayout({ className = '' }: MainLayoutProps) {
  const { resolvedTheme } = useThemeStore();
  const [currentPage, setCurrentPage] = useState('chats');
  const [showTaskPanel, setShowTaskPanel] = useState(true);
  const isDark = resolvedTheme === 'dark';

  return (
    <div className={`flex h-screen ${isDark ? 'bg-slate-900' : 'bg-white'} ${className}`}>
      {/* Adaptive Navigation */}
      <AdaptiveNav currentPage={currentPage} onPageChange={setCurrentPage} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Chat Interface - Main Panel */}
        <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
          {/* Header */}
          <header className={`flex items-center justify-between px-4 py-3 border-b ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold">Agent</h1>
              <span className={`text-sm ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>
                Summarizing Python 3.14...
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Toggle Task Panel Button (Desktop) */}
              <button
                onClick={() => setShowTaskPanel(!showTaskPanel)}
                className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                }`}
                title="Toggle task panel"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Settings */}
              <button
                className={`p-1.5 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                }`}
                title="Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </header>

          {/* Chat Content */}
          <ChatInterface className="flex-1" />
        </div>

        {/* Task Panel - Side Panel (Desktop) / Bottom Sheet (Mobile) */}
        {showTaskPanel && (
          <>
            {/* Desktop Side Panel */}
            <div className={`hidden md:block w-80 lg:w-96 border-l ${
              isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
            }`}>
              <TaskPanel />
            </div>

            {/* Mobile Bottom Sheet */}
            <div className={`md:hidden fixed inset-x-0 bottom-16 max-h-[60vh] border-t rounded-t-2xl shadow-2xl z-40 ${
              isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
            }`}>
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
                <h2 className="font-semibold">Task Overview</h2>
                <button
                  onClick={() => setShowTaskPanel(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Close panel"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="overflow-y-auto max-h-[calc(60vh-4rem)]">
                <TaskPanel />
              </div>
            </div>
          </>
        )}

        {/* Mobile: Floating Action Button to show Task Panel */}
        {!showTaskPanel && (
          <button
            onClick={() => setShowTaskPanel(true)}
            className="md:hidden fixed bottom-20 right-4 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center z-40"
            title="Show task panel"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
