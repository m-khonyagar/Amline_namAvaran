import React, { useState } from 'react';
import { useTranslation } from '../i18n';

interface AgentCollaborationProps {
  taskId?: string;
  className?: string;
}

export function AgentCollaboration({ taskId = '1', className = '' }: AgentCollaborationProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('agents');

  // Mock collaboration data - will be replaced with real backend data
  const collaborationData = {
    agents: [
      {
        name: 'PlannerAgent',
        status: 'completed',
        currentTask: 'Task planning completed',
        startTime: '2026-03-11T10:00:00Z',
        endTime: '2026-03-11T10:05:00Z',
        stepsCompleted: 1,
        totalSteps: 1,
      },
      {
        name: 'CoderAgent',
        status: 'running',
        currentTask: 'Implementing database models',
        startTime: '2026-03-11T10:05:00Z',
        endTime: null,
        stepsCompleted: 2,
        totalSteps: 3,
      },
      {
        name: 'BrowserAgent',
        status: 'idle',
        currentTask: 'Waiting for research task',
        startTime: null,
        endTime: null,
        stepsCompleted: 0,
        totalSteps: 2,
      },
      {
        name: 'ExternalWorkerAgent',
        status: 'idle',
        currentTask: 'Available for external delegation',
        startTime: null,
        endTime: null,
        stepsCompleted: 0,
        totalSteps: 0,
      },
    ],
    timeline: [
      {
        timestamp: '2026-03-11T10:00:00Z',
        agent: 'PlannerAgent',
        action: 'Started task planning',
        details: 'Analyzing requirements and creating execution plan',
        type: 'start',
      },
      {
        timestamp: '2026-03-11T10:05:00Z',
        agent: 'PlannerAgent',
        action: 'Completed planning',
        details: '5-step plan created, handing off to CoderAgent',
        type: 'complete',
      },
      {
        timestamp: '2026-03-11T10:05:30Z',
        agent: 'CoderAgent',
        action: 'Started implementation',
        details: 'Setting up Flask application structure',
        type: 'start',
      },
      {
        timestamp: '2026-03-11T10:20:00Z',
        agent: 'CoderAgent',
        action: 'Completed Flask setup',
        details: 'Basic routes and application structure ready',
        type: 'progress',
      },
      {
        timestamp: '2026-03-11T10:25:00Z',
        agent: 'CoderAgent',
        action: 'Started database implementation',
        details: 'Creating SQLAlchemy models for User and Post',
        type: 'progress',
      },
    ],
    messages: [
      {
        timestamp: '2026-03-11T10:05:00Z',
        from: 'PlannerAgent',
        to: 'CoderAgent',
        message: 'Requirements analyzed. Creating Flask web app with user authentication and blog functionality.',
        type: 'handoff',
      },
      {
        timestamp: '2026-03-11T10:20:00Z',
        from: 'CoderAgent',
        to: 'PlannerAgent',
        message: 'Flask app structure completed. Ready for database implementation.',
        type: 'status',
      },
      {
        timestamp: '2026-03-11T10:25:00Z',
        from: 'CoderAgent',
        to: 'ExternalWorkerAgent',
        message: 'Need research on best practices for database design with SQLAlchemy.',
        type: 'request',
      },
    ],
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-warning text-warning-foreground';
      case 'completed': return 'bg-success text-success-foreground';
      case 'failed': return 'bg-destructive text-destructive-foreground';
      case 'idle': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTimelineIcon = (type: string) => {
    switch (type) {
      case 'start': return '🚀';
      case 'complete': return '✅';
      case 'progress': return '⚡';
      case 'error': return '❌';
      case 'handoff': return '🔄';
      default: return '📝';
    }
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'handoff': return '🔄';
      case 'status': return '📊';
      case 'request': return '🤝';
      case 'response': return '💬';
      default: return '📝';
    }
  };

  const tabs = [
    { id: 'agents', label: 'Agent States' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'messages', label: 'Messages' },
  ];

  return (
    <div className={`p-6 ${className}`}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">{t('collaboration')}</h1>
        <p className="text-muted-foreground">Monitor multi-agent collaboration and communication</p>
      </div>

      {/* Task ID */}
      <div className="card p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-muted-foreground">Task ID:</span>
            <span className="ml-2 font-medium">{taskId}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-warning text-warning-foreground">
              {t('running')}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === 'agents' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {collaborationData.agents.map((agent) => (
              <div key={agent.name} className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">{agent.name}</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(agent.status)}`}>
                    {agent.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Current Task:</span>
                    <span className="text-foreground">{agent.currentTask}</span>
                  </div>
                  {agent.startTime && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Started:</span>
                      <span className="text-foreground">
                        {new Date(agent.startTime).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                  {agent.endTime && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Ended:</span>
                      <span className="text-foreground">
                        {new Date(agent.endTime).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Progress */}
                {agent.totalSteps > 0 && (
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="text-foreground font-medium">
                        {agent.stepsCompleted}/{agent.totalSteps}
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(agent.stepsCompleted / agent.totalSteps) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="space-y-4">
            {collaborationData.timeline.map((event, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm">
                  {getTimelineIcon(event.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground">{event.agent}</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <h4 className="font-medium text-foreground mb-1">{event.action}</h4>
                  <p className="text-sm text-muted-foreground">{event.details}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="space-y-4">
            {collaborationData.messages.map((message, index) => (
              <div key={index} className="card p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-secondary text-secondary-foreground rounded-full flex items-center justify-center text-sm">
                    {getMessageIcon(message.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-foreground">{message.from}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-medium text-foreground">{message.to}</span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-foreground">{message.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
