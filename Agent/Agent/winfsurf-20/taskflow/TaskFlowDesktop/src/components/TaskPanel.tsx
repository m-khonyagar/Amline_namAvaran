import React from 'react';
import { useThemeStore } from '../design-system/theme';

interface TaskStep {
  id: string;
  title: string;
  status: 'pending' | 'running' | 'completed';
}

interface TaskPanelProps {
  className?: string;
}

export function TaskPanel({ className = '' }: TaskPanelProps) {
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  const task = {
    title: 'Summarize Python 3.14 updates',
    goal: 'Summarize Python 3.14 updates',
    status: 'Running...',
    steps: [
      { id: '1', title: 'Web Search', status: 'completed' as const },
      { id: '2', title: 'Extract Information', status: 'completed' as const },
      { id: '3', title: 'Summarize Key Changes', status: 'running' as const }
    ]
  };

  const webResults = {
    title: 'Web Results',
    status: 'Searching for "Python 3.14 updates"...',
    progress: 65
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'running':
        return (
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        );
      default:
        return (
          <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Task Overview */}
      <div className={`p-4 border-b ${
        isDark ? 'border-slate-700' : 'border-slate-200'
      }`}>
        <div className="flex items-start justify-between mb-3">
          <h2 className="text-lg font-semibold">Task Overview</h2>
          <button className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        <div className="space-y-2">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Goal:</div>
            <div className="text-sm font-medium">{task.goal}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Steps:</div>
            <div className="space-y-2">
              {task.steps.map((step) => (
                <div key={step.id} className="flex items-center gap-2">
                  {getStepIcon(step.status)}
                  <span className="text-sm">{step.title}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Status:</div>
            <div className="text-sm font-medium text-blue-500">{task.status}</div>
          </div>
        </div>
      </div>

      {/* Web Results */}
      <div className={`p-4 border-b ${
        isDark ? 'border-slate-700' : 'border-slate-200'
      }`}>
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-base font-semibold">{webResults.title}</h3>
          <button className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">{webResults.status}</div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className={`h-2 rounded-full overflow-hidden ${
              isDark ? 'bg-slate-700' : 'bg-slate-200'
            }`}>
              <div 
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${webResults.progress}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground text-right">{webResults.progress}%</div>
          </div>

          {/* Mock Search Results */}
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`p-3 rounded-lg border ${
                  isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">Python 3.14 Release Notes</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {i === 1 ? 'Pattern matching enhancements...' : 
                       i === 2 ? 'New macros module...' : 
                       'Improved f-string formatting...'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Task Progress Section */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold mb-2">Task Progress</h3>
            <div className={`p-3 rounded-lg ${
              isDark ? 'bg-slate-800' : 'bg-slate-50'
            }`}>
              <div className="text-sm mb-2">
                <span className="font-medium">Goal:</span> {task.goal}
              </div>
              <div className="text-sm">
                <span className="font-medium">Status:</span>{' '}
                <span className="text-blue-500">{task.status}</span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
            Open Browser
          </button>
        </div>
      </div>
    </div>
  );
}
