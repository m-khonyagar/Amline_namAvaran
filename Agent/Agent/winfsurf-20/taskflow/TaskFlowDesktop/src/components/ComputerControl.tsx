/**
 * Computer Control UI Component for Agent Windsurf Amline
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n';

interface ComputerControlProps {
  className?: string;
}

interface SessionStatus {
  active: boolean;
  session_id?: string;
  permission_mode?: string;
  duration?: number;
  total_actions?: number;
  active_window?: string;
  workspace_path?: string;
}

interface Action {
  action_type: string;
  parameters: any;
  timestamp: number;
  result?: any;
  error?: string;
  screenshot_before?: string;
  screenshot_after?: string;
}

interface IDEStatus {
  name: string;
  available: boolean;
  running: boolean;
  project_path?: string;
}

export function ComputerControl({ className = '' }: ComputerControlProps) {
  const { t } = useTranslation();
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>({ active: false });
  const [actionHistory, setActionHistory] = useState<Action[]>([]);
  const [ideStatus, setIdeStatus] = useState<Record<string, IDEStatus>>({});
  const [loading, setLoading] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState('safe');
  const [command, setCommand] = useState('');
  const [selectedIDE, setSelectedIDE] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);

  // Load initial status
  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const mockAPI = async (endpoint: string, data?: any): Promise<any> => {
    // Mock API responses for demonstration
    await new Promise(resolve => setTimeout(resolve, 100));
    
    switch (endpoint) {
      case '/computer/session/status':
        return sessionStatus;
      case '/computer/ide/status':
        return {
          vscode: { name: 'VSCode', available: true, running: false },
          windsurf: { name: 'Windsurf', available: true, running: false },
          cursor: { name: 'Cursor', available: true, running: false }
        };
      case '/computer/actions/history':
        return actionHistory;
      case '/computer/session/start':
        return {
          success: true,
          session_id: `session_${Date.now()}`,
          permission_mode: data?.permission_mode || 'safe',
          workspace_path: './workspace'
        };
      case '/computer/session/end':
        return { success: true };
      case '/computer/screenshot':
        return { screenshot_taken: true, path: '/workspace/screenshot.png' };
      case '/computer/terminal/command':
        return {
          success: true,
          return_code: 0,
          stdout: 'Command executed successfully',
          stderr: ''
        };
      case '/computer/ide/vscode/launch':
        return { launched: true, pid: 12345 };
      default:
        return { success: true };
    }
  };

  const loadStatus = async () => {
    try {
      const [sessionResponse, ideResponse, historyResponse] = await Promise.all([
        mockAPI('/computer/session/status'),
        mockAPI('/computer/ide/status'),
        mockAPI('/computer/actions/history?limit=10'),
      ]);
      setSessionStatus(sessionResponse as SessionStatus);
      setIdeStatus(ideResponse as Record<string, IDEStatus>);
      setActionHistory(historyResponse as Action[]);
    } catch (error) {
      console.error('Failed to load status:', error);
    }
  };

  const startSession = async () => {
    setLoading(true);
    try {
      const response = await mockAPI('/computer/session/start', {
        permission_mode: selectedPermission,
        workspace_path: './workspace'
      });
      
      if ((response as any).success) {
        setSessionStatus({
          active: true,
          session_id: (response as any).session_id,
          permission_mode: (response as any).permission_mode,
          workspace_path: (response as any).workspace_path,
          total_actions: 0,
          duration: 0
        });
      }
    } catch (error) {
      console.error('Failed to start session:', error);
    } finally {
      setLoading(false);
    }
  };

  const endSession = async () => {
    setLoading(true);
    try {
      await mockAPI('/computer/session/end');
      setSessionStatus({ active: false });
      setActionHistory([]);
    } catch (error) {
      console.error('Failed to end session:', error);
    } finally {
      setLoading(false);
    }
  };

  const takeScreenshot = async () => {
    setLoading(true);
    try {
      const response = await mockAPI('/computer/screenshot') as any;
      if (response.screenshot_taken) {
        setScreenshotUrl(response.path || '');
        // Add to action history
        const newAction: Action = {
          action_type: 'screenshot',
          parameters: { save: true },
          timestamp: Date.now(),
          result: response
        };
        setActionHistory(prev => [newAction, ...prev]);
      }
    } catch (error) {
      console.error('Failed to take screenshot:', error);
    } finally {
      setLoading(false);
    }
  };

  const runCommand = async () => {
    if (!command.trim()) return;
    
    setLoading(true);
    try {
      const response = await mockAPI('/computer/terminal/command', {
        command: command,
        timeout: 30
      });
      
      // Add to action history
      const newAction: Action = {
        action_type: 'terminal_command',
        parameters: { command, timeout: 30 },
        timestamp: Date.now(),
        result: response
      };
      setActionHistory(prev => [newAction, ...prev]);
      
      setCommand('');
    } catch (error) {
      console.error('Failed to run command:', error);
    } finally {
      setLoading(false);
    }
  };

  const launchIDE = async (ideName: string) => {
    setLoading(true);
    try {
      const response = await mockAPI(`/computer/ide/${ideName}/launch`);
      
      if ((response as any).launched) {
        // Update IDE status
        setIdeStatus(prev => ({
          ...prev,
          [ideName]: {
            ...prev[ideName],
            running: true
          }
        }));
        
        // Add to action history
        const newAction: Action = {
          action_type: 'ide_launch',
          parameters: { ide: ideName },
          timestamp: Date.now(),
          result: response
        };
        setActionHistory(prev => [newAction, ...prev]);
      }
    } catch (error) {
      console.error('Failed to launch IDE:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPermissionColor = (mode: string) => {
    switch (mode) {
      case 'safe': return 'bg-success text-success-foreground';
      case 'workspace': return 'bg-warning text-warning-foreground';
      case 'full_control': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'screenshot': return '📷';
      case 'terminal_command': return '💻';
      case 'ide_launch': return '🔧';
      case 'window_focus': return '🪟';
      case 'text_type': return '⌨️';
      case 'hotkey': return '⌨️';
      case 'click': return '🖱️';
      default: return '📝';
    }
  };

  return (
    <div className={`p-6 ${className}`}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">Computer Control</h1>
        <p className="text-muted-foreground">Controlled computer interaction with safety guardrails</p>
      </div>

      {/* Session Status */}
      <div className="card p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Session Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <span className="text-sm text-muted-foreground">Status:</span>
            <div className="mt-1">
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                sessionStatus.active 
                  ? 'bg-success text-success-foreground' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {sessionStatus.active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          
          {sessionStatus.active && (
            <>
              <div>
                <span className="text-sm text-muted-foreground">Permission Mode:</span>
                <div className="mt-1">
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${getPermissionColor(sessionStatus.permission_mode || '')}`}>
                    {sessionStatus.permission_mode?.toUpperCase() || 'UNKNOWN'}
                  </span>
                </div>
              </div>
              
              <div>
                <span className="text-sm text-muted-foreground">Actions:</span>
                <p className="font-medium">{sessionStatus.total_actions || 0}</p>
              </div>
              
              <div>
                <span className="text-sm text-muted-foreground">Duration:</span>
                <p className="font-medium">
                  {Math.floor((sessionStatus.duration || 0) / 60)}m {((sessionStatus.duration || 0) % 60)}s
                </p>
              </div>
            </>
          )}
        </div>
        
        <div className="flex gap-2 mt-4">
          {!sessionStatus.active ? (
            <>
              <select
                value={selectedPermission}
                onChange={(e) => setSelectedPermission(e.target.value)}
                className="input w-48"
              >
                <option value="safe">Safe Mode</option>
                <option value="workspace">Workspace Mode</option>
                <option value="full_control">Full Control</option>
              </select>
              <button 
                onClick={startSession}
                disabled={loading}
                className="btn-primary"
              >
                {loading ? 'Starting...' : 'Start Session'}
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={endSession}
                disabled={loading}
                className="btn-destructive"
              >
                {loading ? 'Ending...' : 'End Session'}
              </button>
              <button 
                onClick={takeScreenshot}
                disabled={loading}
                className="btn-secondary"
              >
                {loading ? 'Capturing...' : '📷 Screenshot'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Screenshot Preview */}
      {screenshotUrl && (
        <div className="card p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Latest Screenshot</h3>
          <div className="bg-panel p-4 rounded-md">
            <div className="text-center text-muted-foreground">
              📷 Screenshot: {screenshotUrl}
            </div>
          </div>
        </div>
      )}

      {/* IDE Control */}
      <div className="card p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">IDE Control</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(ideStatus).map(([ideKey, status]) => (
            <div key={ideKey} className="p-4 bg-panel rounded-md">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{status.name}</h4>
                <span className={`w-2 h-2 rounded-full ${
                  status.running ? 'bg-success' : 
                  status.available ? 'bg-warning' : 'bg-destructive'
                }`}></span>
              </div>
              <div className="text-sm text-muted-foreground mb-3">
                {status.running ? 'Running' : status.available ? 'Available' : 'Not Available'}
              </div>
              <button
                onClick={() => launchIDE(ideKey)}
                disabled={loading || status.running}
                className="btn-outline btn-sm w-full"
              >
                {status.running ? 'Running' : 'Launch'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Terminal Control */}
      {sessionStatus.active && sessionStatus.permission_mode !== 'safe' && (
        <div className="card p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Terminal Control</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Enter command..."
              className="input flex-1"
              onKeyPress={(e) => e.key === 'Enter' && runCommand()}
            />
            <button
              onClick={runCommand}
              disabled={loading || !command.trim()}
              className="btn-primary"
            >
              {loading ? 'Running...' : 'Run'}
            </button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Commands are executed with safety restrictions. Dangerous commands are blocked.
          </p>
        </div>
      )}

      {/* Action History */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Action History</h3>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {actionHistory.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No actions performed yet</p>
          ) : (
            actionHistory.map((action, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-panel rounded-md">
                <span className="text-lg">{getActionIcon(action.action_type)}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{action.action_type.replace('_', ' ')}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(action.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {action.error ? (
                    <p className="text-sm text-destructive">Error: {action.error}</p>
                  ) : (
                    <p className="text-sm text-success">Success</p>
                  )}
                  {action.parameters && Object.keys(action.parameters).length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {JSON.stringify(action.parameters, null, 2)}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
