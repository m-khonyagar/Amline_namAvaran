import React, { useState } from 'react';
import { useTranslation } from '../i18n';

interface ExternalSupervisionProps {
  taskId?: string;
  className?: string;
}

export function ExternalSupervision({ taskId = '1', className = '' }: ExternalSupervisionProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');

  // Mock supervision data - will be replaced with real backend data
  const supervisionData = {
    session: {
      id: 'ext_session_001',
      tool: 'ChatGPT',
      status: 'active',
      startTime: '2026-03-11T10:30:00Z',
      endTime: null,
      revisionCount: 2,
      acceptanceStatus: 'pending',
    },
    prompt: {
      original: 'Create a Python web application with Flask that includes user authentication and blog functionality. Use SQLAlchemy for database operations and implement proper error handling.',
      current: 'Create a Python web application with Flask that includes user authentication and blog functionality. Use SQLAlchemy for database operations and implement proper error handling.',
      iterations: [
        {
          version: 1,
          prompt: 'Create a Flask web app',
          timestamp: '2026-03-11T10:30:00Z',
          reason: 'Initial request',
        },
        {
          version: 2,
          prompt: 'Create a Python web application with Flask that includes user authentication and blog functionality.',
          timestamp: '2026-03-11T10:32:00Z',
          reason: 'Added specific requirements',
        },
        {
          version: 3,
          prompt: 'Create a Python web application with Flask that includes user authentication and blog functionality. Use SQLAlchemy for database operations and implement proper error handling.',
          timestamp: '2026-03-11T10:35:00Z',
          reason: 'Added technical specifications',
        },
      ],
    },
    evaluation: {
      score: 85,
      criteria: {
        completeness: 90,
        quality: 80,
        best_practices: 85,
        security: 75,
      },
      feedback: 'Good implementation with proper structure. Could improve security measures and add more comprehensive error handling.',
      suggestions: [
        'Add input validation for all user inputs',
        'Implement CSRF protection',
        'Add rate limiting for API endpoints',
        'Use environment variables for sensitive configuration',
      ],
    },
    artifacts: [
      {
        id: '1',
        name: 'chatgpt_response.md',
        type: 'text',
        content: '# Flask Web Application Implementation\n\nI\'ll create a comprehensive Flask web application with the following features:\n\n## 1. Project Structure\n```\nflask_app/\n├── app.py\n├── requirements.txt\n├── models.py\n├── templates/\n│   ├── index.html\n│   ├── login.html\n│   └── register.html\n└── static/\n    ├── css/\n    └── js/\n```\n\n## 2. Implementation Details\n\n### Database Models\n- User model with authentication fields\n- Post model for blog functionality\n- Proper relationships between models\n\n### Authentication System\n- User registration and login\n- Session management\n- Password hashing\n\n### API Endpoints\n- RESTful API for CRUD operations\n- Proper HTTP status codes\n- Input validation\n\n### Security Features\n- SQL injection prevention\n- XSS protection\n- CSRF protection\n\nLet me implement this step by step...',
        timestamp: '2026-03-11T10:35:00Z',
      },
      {
        id: '2',
        name: 'screenshot_001.png',
        type: 'image',
        path: '/workspace/screenshots/chatgpt_session.png',
        timestamp: '2026-03-11T10:40:00Z',
      },
    ],
    screenshots: [
      {
        id: '1',
        timestamp: '2026-03-11T10:30:00Z',
        description: 'Initial prompt sent to ChatGPT',
        path: '/workspace/screenshots/initial_prompt.png',
      },
      {
        id: '2',
        timestamp: '2026-03-11T10:35:00Z',
        description: 'ChatGPT response with implementation plan',
        path: '/workspace/screenshots/response.png',
      },
      {
        id: '3',
        timestamp: '2026-03-11T10:40:00Z',
        description: 'Code generation in progress',
        path: '/workspace/screenshots/code_generation.png',
      },
    ],
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-warning text-warning-foreground';
      case 'completed': return 'bg-success text-success-foreground';
      case 'failed': return 'bg-destructive text-destructive-foreground';
      case 'pending': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'prompt', label: 'Prompt History' },
    { id: 'evaluation', label: 'Evaluation' },
    { id: 'artifacts', label: 'Artifacts' },
    { id: 'screenshots', label: 'Screenshots' },
  ];

  return (
    <div className={`p-6 ${className}`}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">{t('supervision')}</h1>
        <p className="text-muted-foreground">External tool supervision and evaluation</p>
      </div>

      {/* Session Info */}
      <div className="card p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <span className="text-sm text-muted-foreground">Session ID:</span>
            <p className="font-medium">{supervisionData.session.id}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Selected Tool:</span>
            <p className="font-medium">{supervisionData.session.tool}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Status:</span>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(supervisionData.session.status)}`}>
              {supervisionData.session.status}
            </span>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Started:</span>
            <p className="font-medium">{new Date(supervisionData.session.startTime).toLocaleString()}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Revisions:</span>
            <p className="font-medium">{supervisionData.session.revisionCount}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Acceptance:</span>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(supervisionData.session.acceptanceStatus)}`}>
              {supervisionData.session.acceptanceStatus}
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
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4">Current Prompt</h3>
              <div className="bg-panel p-4 rounded-md">
                <p className="text-foreground">{supervisionData.prompt.current}</p>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4">Session Progress</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Evaluation Score:</span>
                  <span className={`font-bold text-lg ${getScoreColor(supervisionData.evaluation.score)}`}>
                    {supervisionData.evaluation.score}/100
                  </span>
                </div>
                <div className="space-y-2">
                  {Object.entries(supervisionData.evaluation.criteria).map(([criterion, score]) => (
                    <div key={criterion} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground capitalize">{criterion}:</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-secondary rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              score >= 80 ? 'bg-success' : score >= 60 ? 'bg-warning' : 'bg-destructive'
                            }`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{score}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4">Actions</h3>
              <div className="flex gap-2">
                <button className="btn-primary">
                  Accept Result
                </button>
                <button className="btn-secondary">
                  Request Revision
                </button>
                <button className="btn-outline">
                  Modify Prompt
                </button>
                <button className="btn-destructive">
                  Cancel Session
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'prompt' && (
          <div className="space-y-4">
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4">Prompt Evolution</h3>
              <div className="space-y-6">
                {supervisionData.prompt.iterations.map((iteration) => (
                  <div key={iteration.version} className="border-l-2 border-primary pl-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-foreground">Version {iteration.version}</h4>
                      <span className="text-sm text-muted-foreground">
                        {new Date(iteration.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-panel p-4 rounded-md mb-2">
                      <p className="text-foreground">{iteration.prompt}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <strong>Reason:</strong> {iteration.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'evaluation' && (
          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4">Evaluation Results</h3>
              <div className="mb-6">
                <div className="text-center mb-4">
                  <div className={`text-4xl font-bold ${getScoreColor(supervisionData.evaluation.score)}`}>
                    {supervisionData.evaluation.score}/100
                  </div>
                  <p className="text-muted-foreground">Overall Score</p>
                </div>
              </div>
              
              <div className="mb-6">
                <h4 className="font-medium mb-3">Detailed Breakdown</h4>
                <div className="space-y-3">
                  {Object.entries(supervisionData.evaluation.criteria).map(([criterion, score]) => (
                    <div key={criterion} className="flex items-center justify-between p-3 bg-panel rounded-md">
                      <span className="font-medium capitalize">{criterion}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-secondary rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all duration-300 ${
                              score >= 80 ? 'bg-success' : score >= 60 ? 'bg-warning' : 'bg-destructive'
                            }`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                        <span className="font-bold w-12 text-right">{score}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Feedback</h4>
                <div className="bg-panel p-4 rounded-md">
                  <p className="text-foreground">{supervisionData.evaluation.feedback}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Suggestions for Improvement</h4>
                <ul className="space-y-2">
                  {supervisionData.evaluation.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-success">•</span>
                      <span className="text-foreground">{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'artifacts' && (
          <div className="space-y-4">
            {supervisionData.artifacts.map((artifact) => (
              <div key={artifact.id} className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">{artifact.name}</h3>
                  <span className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded">
                    {artifact.type}
                  </span>
                </div>
                <div className="bg-panel p-4 rounded-md max-h-96 overflow-y-auto">
                  <pre className="text-sm text-foreground whitespace-pre-wrap">
                    {artifact.content}
                  </pre>
                </div>
                <div className="mt-4 text-sm text-muted-foreground">
                  {new Date(artifact.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'screenshots' && (
          <div className="space-y-4">
            {supervisionData.screenshots.map((screenshot) => (
              <div key={screenshot.id} className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">Screenshot {screenshot.id}</h3>
                  <span className="text-sm text-muted-foreground">
                    {new Date(screenshot.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-muted-foreground mb-4">{screenshot.description}</p>
                <div className="bg-panel p-8 rounded-md text-center">
                  <div className="text-muted-foreground">
                    📷 Screenshot placeholder
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {screenshot.path}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
