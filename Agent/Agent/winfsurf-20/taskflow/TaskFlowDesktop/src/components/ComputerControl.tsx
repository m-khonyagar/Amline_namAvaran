import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '../i18n';
import { API_BASE } from '../api/config';

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
  admin_available?: boolean;
  last_error?: string | null;
}

interface Action {
  action_type: string;
  parameters: any;
  timestamp: number;
  result?: any;
  error?: string;
}

interface IDEStatus {
  name: string;
  available: boolean;
  running: boolean;
  project_path?: string;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed with ${response.status}`);
  }
  return response.json();
}

export function ComputerControl({ className = '' }: ComputerControlProps) {
  const { t } = useTranslation();
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>({ active: false });
  const [actionHistory, setActionHistory] = useState<Action[]>([]);
  const [ideStatus, setIdeStatus] = useState<Record<string, IDEStatus>>({});
  const [loading, setLoading] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState('safe');
  const [command, setCommand] = useState('');
  const [commandMode, setCommandMode] = useState<'standard' | 'admin'>('standard');
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [typeText, setTypeText] = useState('');
  const [hotkeyText, setHotkeyText] = useState('ctrl,shift,esc');
  const [clickX, setClickX] = useState('400');
  const [clickY, setClickY] = useState('300');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const canRunCommand = sessionStatus.active && selectedPermission !== 'safe';
  const canControlInput = sessionStatus.active && sessionStatus.permission_mode === 'full_control';

  const loadStatus = async () => {
    try {
      const [sessionResponse, ideResponse, historyResponse] = await Promise.all([
        apiFetch<SessionStatus>('/computer/session/status'),
        apiFetch<Record<string, IDEStatus>>('/computer/ide/status'),
        apiFetch<Action[]>('/computer/actions/history?limit=20'),
      ]);
      setSessionStatus(sessionResponse);
      setIdeStatus(ideResponse);
      setActionHistory(historyResponse);
      if (sessionResponse.last_error) {
        setErrorMessage(sessionResponse.last_error);
      }
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load computer-control status.');
    }
  };

  useEffect(() => {
    void loadStatus();
    const interval = window.setInterval(() => void loadStatus(), 4000);
    return () => window.clearInterval(interval);
  }, []);

  const clearMessages = () => {
    setErrorMessage('');
    setSuccessMessage('');
  };

  const startSession = async () => {
    clearMessages();
    setLoading(true);
    try {
      const response = await apiFetch<SessionStatus>('/computer/session/start', {
        method: 'POST',
        body: JSON.stringify({
          permission_mode: selectedPermission,
        }),
      });
      setSessionStatus(response);
      setSuccessMessage(`Session started in ${selectedPermission} mode.`);
      await loadStatus();
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to start the control session.');
    } finally {
      setLoading(false);
    }
  };

  const endSession = async () => {
    clearMessages();
    setLoading(true);
    try {
      await apiFetch('/computer/session/end', { method: 'POST' });
      setSessionStatus({ active: false });
      setActionHistory([]);
      setSuccessMessage('Session ended.');
      await loadStatus();
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to end the control session.');
    } finally {
      setLoading(false);
    }
  };

  const takeScreenshot = async () => {
    clearMessages();
    setLoading(true);
    try {
      const response = await apiFetch<{ path: string }>('/computer/screenshot', { method: 'POST' });
      setScreenshotUrl(response.path);
      setSuccessMessage('Screenshot captured successfully.');
      await loadStatus();
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to capture the screen.');
    } finally {
      setLoading(false);
    }
  };

  const runCommand = async () => {
    if (!command.trim()) return;
    clearMessages();
    setLoading(true);
    try {
      const response = await apiFetch<{ stdout: string; stderr: string; success: boolean }>('/computer/terminal/command', {
        method: 'POST',
        body: JSON.stringify({
          command,
          timeout: 60,
          admin: commandMode === 'admin',
        }),
      });
      if (response.success) {
        setSuccessMessage(commandMode === 'admin' ? 'Admin command completed.' : 'PowerShell command completed.');
      } else {
        setErrorMessage(response.stderr || 'The command did not complete successfully.');
      }
      setCommand('');
      await loadStatus();
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to run the command.');
    } finally {
      setLoading(false);
    }
  };

  const launchIDE = async (ideName: string) => {
    clearMessages();
    setLoading(true);
    try {
      await apiFetch(`/computer/ide/${ideName}/launch`, { method: 'POST' });
      setSuccessMessage(`${ideStatus[ideName]?.name || ideName} launch requested.`);
      await loadStatus();
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to launch the IDE.');
    } finally {
      setLoading(false);
    }
  };

  const sendTypeText = async () => {
    if (!typeText.trim()) return;
    clearMessages();
    setLoading(true);
    try {
      await apiFetch('/computer/keyboard/type', {
        method: 'POST',
        body: JSON.stringify({ text: typeText }),
      });
      setSuccessMessage('Text sent to the active window.');
      setTypeText('');
      await loadStatus();
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to type text.');
    } finally {
      setLoading(false);
    }
  };

  const sendHotkey = async () => {
    const keys = hotkeyText
      .split(',')
      .map((key) => key.trim())
      .filter(Boolean);
    if (keys.length === 0) return;
    clearMessages();
    setLoading(true);
    try {
      await apiFetch('/computer/keyboard/hotkey', {
        method: 'POST',
        body: JSON.stringify({ keys }),
      });
      setSuccessMessage(`Hotkey ${keys.join(' + ')} sent.`);
      await loadStatus();
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to send the hotkey.');
    } finally {
      setLoading(false);
    }
  };

  const sendClick = async () => {
    clearMessages();
    setLoading(true);
    try {
      await apiFetch('/computer/mouse/click', {
        method: 'POST',
        body: JSON.stringify({ x: Number(clickX), y: Number(clickY), button: 'left', clicks: 1 }),
      });
      setSuccessMessage(`Clicked at ${clickX}, ${clickY}.`);
      await loadStatus();
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to click on the screen.');
    } finally {
      setLoading(false);
    }
  };

  const permissionTone = useMemo(() => {
    switch (sessionStatus.permission_mode) {
      case 'full_control':
        return 'bg-destructive/12 text-destructive border-destructive/20';
      case 'workspace':
        return 'bg-warning/12 text-warning border-warning/20';
      default:
        return 'bg-success/12 text-success border-success/20';
    }
  }, [sessionStatus.permission_mode]);

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="shell-section-label mb-3">{t('computerControl')}</p>
          <div className="hero-chip mb-3 text-[11px] font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span>Desktop operator</span>
          </div>
          <h1 className="text-[22px] font-semibold text-foreground">Computer Control</h1>
          <p className="text-[13px] text-muted-foreground mt-3 max-w-3xl">
            Start a control session, run PowerShell, capture the screen, launch IDEs, and send keyboard or mouse input from one local desktop surface.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            { label: 'Session', value: sessionStatus.active ? 'Active' : 'Inactive', caption: 'Live desktop operator state' },
            { label: 'Mode', value: sessionStatus.permission_mode || 'safe', caption: 'Current permission boundary' },
            { label: 'Actions', value: String(sessionStatus.total_actions || 0), caption: 'Recorded operator actions' },
            { label: 'Admin shell', value: sessionStatus.admin_available ? 'Available' : 'Unavailable', caption: 'Elevation readiness on this machine' },
          ].map((item) => (
            <div key={item.label} className="surface-card p-4">
              <p className="shell-section-label">{item.label}</p>
              <p className="mt-2 text-[14px] font-semibold text-foreground break-all">{item.value}</p>
              <p className="mt-1.5 text-[11px] text-muted-foreground">{item.caption}</p>
            </div>
          ))}
        </div>
      </div>

      {(errorMessage || successMessage) && (
        <div className={`rounded-xl border px-4 py-3 text-[13px] ${errorMessage ? 'border-destructive/20 bg-destructive/10 text-destructive' : 'border-success/20 bg-success/10 text-success'}`}>
          {errorMessage || successMessage}
        </div>
      )}

      <div className="surface-card glass-frame p-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
          <div>
            <p className="shell-section-label mb-3">Session control</p>
            <h2 className="text-[18px] font-semibold text-foreground">Permissioned desktop access</h2>
            <p className="text-[13px] text-muted-foreground mt-2 leading-relaxed">
              Safe mode allows inspection and screenshots. Workspace mode unlocks shell and IDE launching. Full control also enables mouse, keyboard, and elevated PowerShell.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              {!sessionStatus.active ? (
                <>
                  <select value={selectedPermission} onChange={(e) => setSelectedPermission(e.target.value)} className="input w-[220px]">
                    <option value="safe">Safe mode</option>
                    <option value="workspace">Workspace mode</option>
                    <option value="full_control">Full control</option>
                  </select>
                  <button className="btn-primary text-[13px]" disabled={loading} onClick={() => void startSession()}>
                    {loading ? t('loading') : 'Start session'}
                  </button>
                </>
              ) : (
                <>
                  <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[12px] font-medium ${permissionTone}`}>
                    {sessionStatus.permission_mode}
                  </span>
                  <button className="btn-secondary text-[13px]" disabled={loading} onClick={() => void takeScreenshot()}>
                    {loading ? t('loading') : 'Capture screen'}
                  </button>
                  <button className="btn-secondary text-[13px] text-destructive hover:bg-destructive/10" disabled={loading} onClick={() => void endSession()}>
                    End session
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="surface-elevated p-4">
            <p className="shell-section-label mb-3">Live status</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] text-foreground">Active window</span>
                <span className="text-[12px] text-muted-foreground truncate max-w-[180px]">{sessionStatus.active_window || 'Unavailable'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] text-foreground">Workspace</span>
                <span className="text-[12px] text-muted-foreground truncate max-w-[180px]">{sessionStatus.workspace_path || 'Not set'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] text-foreground">Duration</span>
                <span className="text-[12px] text-muted-foreground">{sessionStatus.duration || 0}s</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] text-foreground">Action count</span>
                <span className="text-[12px] text-muted-foreground">{sessionStatus.total_actions || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="surface-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-semibold text-foreground">PowerShell access</h3>
            <span className="text-[11px] text-muted-foreground">Standard and elevated</span>
          </div>
          <div className="flex flex-col gap-3">
            <textarea
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Enter a PowerShell command"
              className="input min-h-[120px]"
            />
            <div className="flex flex-wrap gap-2">
              <button
                className={`btn-secondary text-[13px] ${commandMode === 'standard' ? 'border-primary/25 bg-primary/12 text-primary' : ''}`}
                onClick={() => setCommandMode('standard')}
              >
                Standard PowerShell
              </button>
              <button
                className={`btn-secondary text-[13px] ${commandMode === 'admin' ? 'border-primary/25 bg-primary/12 text-primary' : ''}`}
                onClick={() => setCommandMode('admin')}
              >
                Admin PowerShell
              </button>
              <button className="btn-primary text-[13px]" disabled={loading || !canRunCommand || !command.trim()} onClick={() => void runCommand()}>
                {loading ? t('loading') : 'Run command'}
              </button>
            </div>
            <p className="text-[12px] text-muted-foreground">
              Workspace mode enables standard commands. Full control is required for admin elevation and for keyboard or mouse automation.
            </p>
          </div>
        </div>

        <div className="surface-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-semibold text-foreground">Screenshot</h3>
            <span className="text-[11px] text-muted-foreground">Saved to workspace</span>
          </div>
          {screenshotUrl ? (
            <div className="surface-elevated p-4">
              <p className="text-[12px] text-muted-foreground break-all">{screenshotUrl}</p>
              <button className="btn-secondary text-[13px] mt-4" onClick={() => window.open(`file:///${screenshotUrl.replace(/\\/g, '/')}`)}>
                Open screenshot
              </button>
            </div>
          ) : (
            <div className="surface-elevated p-4">
              <p className="text-[13px] text-muted-foreground">No screenshot captured yet.</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="surface-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-semibold text-foreground">Desktop input</h3>
            <span className="text-[11px] text-muted-foreground">Requires full control</span>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-[12px] text-muted-foreground mb-2 block">Type text into the active window</label>
              <div className="flex gap-2">
                <input value={typeText} onChange={(e) => setTypeText(e.target.value)} className="input flex-1" placeholder="Type this into the active window" />
                <button className="btn-primary text-[13px]" disabled={loading || !canControlInput || !typeText.trim()} onClick={() => void sendTypeText()}>
                  Type
                </button>
              </div>
            </div>

            <div>
              <label className="text-[12px] text-muted-foreground mb-2 block">Hotkey sequence</label>
              <div className="flex gap-2">
                <input value={hotkeyText} onChange={(e) => setHotkeyText(e.target.value)} className="input flex-1" placeholder="ctrl,shift,esc" />
                <button className="btn-secondary text-[13px]" disabled={loading || !canControlInput} onClick={() => void sendHotkey()}>
                  Send hotkey
                </button>
              </div>
            </div>

            <div>
              <label className="text-[12px] text-muted-foreground mb-2 block">Click screen coordinates</label>
              <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <input value={clickX} onChange={(e) => setClickX(e.target.value)} className="input" placeholder="X" />
                <input value={clickY} onChange={(e) => setClickY(e.target.value)} className="input" placeholder="Y" />
                <button className="btn-secondary text-[13px]" disabled={loading || !canControlInput} onClick={() => void sendClick()}>
                  Click
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="surface-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-semibold text-foreground">IDE launch</h3>
            <span className="text-[11px] text-muted-foreground">Detected locally</span>
          </div>
          <div className="space-y-3">
            {Object.entries(ideStatus).map(([ideKey, status]) => (
              <div key={ideKey} className="surface-elevated p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-foreground">{status.name}</p>
                  <p className="text-[12px] text-muted-foreground mt-1">
                    {status.running ? 'Running' : status.available ? 'Installed' : 'Not detected'}
                  </p>
                </div>
                <button className="btn-secondary text-[13px]" disabled={loading || !sessionStatus.active || !status.available} onClick={() => void launchIDE(ideKey)}>
                  {status.running ? 'Reopen' : 'Launch'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="surface-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-semibold text-foreground">Action history</h3>
          <span className="text-[11px] text-muted-foreground">Most recent first</span>
        </div>
        <div className="space-y-3 max-h-[480px] overflow-y-auto shell-scroll">
          {actionHistory.length === 0 ? (
            <div className="surface-elevated p-8 text-center">
              <p className="text-[13px] text-muted-foreground">No actions recorded yet.</p>
            </div>
          ) : (
            actionHistory.map((action, index) => (
              <div key={`${action.timestamp}-${index}`} className="surface-elevated p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[13px] font-semibold text-foreground">{action.action_type.replace(/_/g, ' ')}</p>
                  <span className="text-[11px] text-muted-foreground">{new Date(action.timestamp * 1000).toLocaleTimeString()}</span>
                </div>
                <pre className="mt-3 text-[11px] text-muted-foreground whitespace-pre-wrap break-words font-mono">
                  {JSON.stringify(action.parameters, null, 2)}
                </pre>
                {action.result && (
                  <pre className="mt-3 text-[11px] text-foreground whitespace-pre-wrap break-words font-mono bg-secondary/50 rounded-xl p-3">
                    {JSON.stringify(action.result, null, 2)}
                  </pre>
                )}
                {action.error && <p className="mt-3 text-[12px] text-destructive">{action.error}</p>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
