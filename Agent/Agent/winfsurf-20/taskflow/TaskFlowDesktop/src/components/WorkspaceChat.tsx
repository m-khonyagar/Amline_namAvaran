import React, { useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE } from '../api/config';
import { MarkdownContent } from './MarkdownContent';

interface WorkspaceChatProps {
  className?: string;
}

interface Session {
  id: string;
  title: string;
  mode: 'chat' | 'agent';
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  actions?: any[];
  attachments?: Array<{ id: string; name: string }>;
}

interface Connector {
  id: string;
  type: string;
  enabled: boolean;
  config: Record<string, string>;
}

interface ToolDefinition {
  id: string;
  label: string;
  description: string;
  connector_required: boolean;
}

interface UploadedFile {
  id: string;
  name: string;
  path?: string;
  size?: number;
}

interface ImprovementStatus {
  enabled: boolean;
  auto_review_interval_minutes: number;
  last_review_at: string | null;
  review_count: number;
  task_count: number;
  profile: {
    strategy_summary: string;
    prompt_prefix: string;
    preferred_tools: string[];
    guidance: string[];
  };
}

interface ImprovementLesson {
  id: string;
  created_at: string;
  lessons: string[];
  preferred_tools: string[];
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, options);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed with ${response.status}`);
  }
  return response.json();
}

const TOOL_DEFAULTS: Record<string, Record<string, string>> = {
  gmail: { to: '', subject: '', body: '', scheduled_for: '' },
  workflow_task: { goal: '', autorun: 'true' },
  file_share: { target_folder: '' },
  powershell: { command: '', timeout: '30', admin: 'false' },
  notification: { title: '', message: '' },
  telegram: { chat_id: '', text: '' },
  bale: { chat_id: '', text: '' },
};

export function WorkspaceChat({ className = '' }: WorkspaceChatProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [selectedTool, setSelectedTool] = useState('workflow_task');
  const [assignedTools, setAssignedTools] = useState<Array<{ tool_id: string; parameters: Record<string, string> }>>([]);
  const [uploads, setUploads] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [connectorForm, setConnectorForm] = useState({
    host: 'smtp.gmail.com',
    port: '465',
    username: '',
    password: '',
    from_email: '',
  });
  const [telegramForm, setTelegramForm] = useState({
    bot_token: '',
    default_chat_id: '',
    allowed_chat_ids: '',
  });
  const [baleForm, setBaleForm] = useState({
    bot_token: '',
    default_chat_id: '',
    allowed_chat_ids: '',
  });
  const [notificationStatus, setNotificationStatus] = useState<{ enabled: boolean; history_count: number } | null>(null);
  const [improvementStatus, setImprovementStatus] = useState<ImprovementStatus | null>(null);
  const [improvementLessons, setImprovementLessons] = useState<ImprovementLesson[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentSession = sessions.find((session) => session.id === currentSessionId) || null;
  const activeConnectorCount = connectors.filter((connector) => connector.enabled).length;
  const configuredToolCount = assignedTools.length;
  const sessionModeLabel = currentSession?.mode === 'agent' ? 'Agent mode' : 'Interactive chat';
  const sessionModeDescription =
    currentSession?.mode === 'agent'
      ? 'Turn a goal into a guided local workflow with attached tools, files, and follow-through.'
      : 'Use the workspace like a live operator console for messages, uploads, and tool-driven actions.';

  const currentConnectorStatus = useMemo(
    () => connectors.find((connector) => connector.type === 'gmail'),
    [connectors]
  );
  const telegramConnectorStatus = useMemo(
    () => connectors.find((connector) => connector.type === 'telegram'),
    [connectors]
  );
  const baleConnectorStatus = useMemo(
    () => connectors.find((connector) => connector.type === 'bale'),
    [connectors]
  );

  const refreshSessions = async () => {
    const list = await apiFetch<Session[]>('/assistant/sessions');
    setSessions(list);
    if (!currentSessionId && list[0]) {
      setCurrentSessionId(list[0].id);
    }
  };

  const loadSession = async (sessionId: string) => {
    const session = await apiFetch<Session>(`/assistant/sessions/${sessionId}`);
    setSessions((prev) => {
      const others = prev.filter((item) => item.id !== session.id);
      return [session, ...others].sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
    });
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [toolList, connectorList, sessionList] = await Promise.all([
        apiFetch<ToolDefinition[]>('/assistant/tools'),
        apiFetch<Connector[]>('/assistant/connectors'),
        apiFetch<Session[]>('/assistant/sessions'),
      ]);
      setTools(toolList);
      setConnectors(connectorList);
      const gmailConnector = connectorList.find((connector) => connector.type === 'gmail');
      if (gmailConnector?.config) {
        setConnectorForm((prev) => ({
          ...prev,
          host: gmailConnector.config.host || prev.host,
          port: gmailConnector.config.port || prev.port,
          username: gmailConnector.config.username || '',
          password: gmailConnector.config.password || '',
          from_email: gmailConnector.config.from_email || '',
        }));
      }
      const telegramConnector = connectorList.find((connector) => connector.type === 'telegram');
      if (telegramConnector?.config) {
        setTelegramForm({
          bot_token: telegramConnector.config.bot_token || '',
          default_chat_id: telegramConnector.config.default_chat_id || '',
          allowed_chat_ids: telegramConnector.config.allowed_chat_ids || '',
        });
      }
      const baleConnector = connectorList.find((connector) => connector.type === 'bale');
      if (baleConnector?.config) {
        setBaleForm({
          bot_token: baleConnector.config.bot_token || '',
          default_chat_id: baleConnector.config.default_chat_id || '',
          allowed_chat_ids: baleConnector.config.allowed_chat_ids || '',
        });
      }
      if (sessionList.length === 0) {
        const created = await apiFetch<Session>('/assistant/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Primary assistant', mode: 'chat' }),
        });
        setSessions([created]);
        setCurrentSessionId(created.id);
      } else {
        setSessions(sessionList);
        setCurrentSessionId(sessionList[0].id);
      }
      const notification = await apiFetch<{ enabled: boolean; history_count: number }>('/notifications/status');
      setNotificationStatus(notification);
      const [improvement, lessons] = await Promise.all([
        apiFetch<ImprovementStatus>('/improvement/status'),
        apiFetch<ImprovementLesson[]>('/improvement/lessons'),
      ]);
      setImprovementStatus(improvement);
      setImprovementLessons(lessons);
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load assistant workspace.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadInitialData();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages?.length]);

  const createSession = async (mode: 'chat' | 'agent') => {
    try {
      const created = await apiFetch<Session>('/assistant/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: mode === 'agent' ? 'Agent workspace' : 'Interactive chat',
          mode,
        }),
      });
      setSessions((prev) => [created, ...prev]);
      setCurrentSessionId(created.id);
      setAssignedTools([]);
      setUploads([]);
      setSuccessMessage(mode === 'agent' ? 'Agent mode session created.' : 'Chat session created.');
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create a new session.');
    }
  };

  const saveGmailConnector = async () => {
    try {
      setErrorMessage('');
      await apiFetch(`/assistant/connectors/gmail`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: true,
          config: connectorForm,
        }),
      });
      setSuccessMessage('Gmail connector saved.');
      const connectorList = await apiFetch<Connector[]>('/assistant/connectors');
      setConnectors(connectorList);
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save the Gmail connector.');
    }
  };

  const saveTelegramConnector = async () => {
    try {
      setErrorMessage('');
      await apiFetch(`/assistant/connectors/telegram`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: true,
          config: telegramForm,
        }),
      });
      setSuccessMessage('Telegram connector saved.');
      const connectorList = await apiFetch<Connector[]>('/assistant/connectors');
      setConnectors(connectorList);
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save the Telegram connector.');
    }
  };

  const saveBaleConnector = async () => {
    try {
      setErrorMessage('');
      await apiFetch(`/assistant/connectors/bale`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: true,
          config: baleForm,
        }),
      });
      setSuccessMessage('Bale connector saved.');
      const connectorList = await apiFetch<Connector[]>('/assistant/connectors');
      setConnectors(connectorList);
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save the Bale connector.');
    }
  };

  const sendTestNotification = async () => {
    try {
      setErrorMessage('');
      await apiFetch('/notifications/test', {
        method: 'POST',
      });
      const notification = await apiFetch<{ enabled: boolean; history_count: number }>('/notifications/status');
      setNotificationStatus(notification);
      setSuccessMessage('Test notification sent.');
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to send a desktop notification.');
    }
  };

  const runImprovementReview = async () => {
    try {
      setErrorMessage('');
      await apiFetch('/improvement/run', {
        method: 'POST',
      });
      const [improvement, lessons] = await Promise.all([
        apiFetch<ImprovementStatus>('/improvement/status'),
        apiFetch<ImprovementLesson[]>('/improvement/lessons'),
      ]);
      setImprovementStatus(improvement);
      setImprovementLessons(lessons);
      setSuccessMessage('Self-improvement review completed.');
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to run the self-improvement review.');
    }
  };

  const toggleImprovement = async (enabled: boolean) => {
    try {
      setErrorMessage('');
      const updated = await apiFetch<ImprovementStatus>('/improvement/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      setImprovementStatus(updated);
      setSuccessMessage(enabled ? 'Continuous improvement enabled.' : 'Continuous improvement paused.');
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update the self-improvement setting.');
    }
  };

  const addTool = () => {
    setAssignedTools((prev) => [
      ...prev,
      { tool_id: selectedTool, parameters: { ...(TOOL_DEFAULTS[selectedTool] || {}) } },
    ]);
  };

  const updateToolParam = (index: number, key: string, value: string) => {
    setAssignedTools((prev) =>
      prev.map((tool, toolIndex) =>
        toolIndex === index
          ? { ...tool, parameters: { ...tool.parameters, [key]: value } }
          : tool
      )
    );
  };

  const removeTool = (index: number) => {
    setAssignedTools((prev) => prev.filter((_, toolIndex) => toolIndex !== index));
  };

  const uploadSelectedFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append('files', file));
      const response = await fetch(`${API_BASE}/assistant/uploads`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const uploaded = (await response.json()) as UploadedFile[];
      setUploads((prev) => [...prev, ...uploaded]);
      setSuccessMessage(`${uploaded.length} file(s) uploaded.`);
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to upload file(s).');
    }
  };

  const sendMessage = async () => {
    if (!currentSessionId || (!messageInput.trim() && uploads.length === 0 && assignedTools.length === 0)) return;
    try {
      setSending(true);
      setErrorMessage('');
      await apiFetch(`/assistant/sessions/${currentSessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: messageInput,
          attachments: uploads.map((upload) => ({ id: upload.id, name: upload.name })),
          assigned_tools: assignedTools,
        }),
      });
      setMessageInput('');
      setUploads([]);
      setAssignedTools([]);
      await loadSession(currentSessionId);
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to send the message.');
    } finally {
      setSending(false);
    }
  };

  const toolFields = (toolId: string) => {
    switch (toolId) {
      case 'gmail':
        return ['to', 'subject', 'body', 'scheduled_for'];
      case 'workflow_task':
        return ['goal', 'autorun'];
      case 'file_share':
        return ['target_folder'];
      case 'powershell':
        return ['command', 'timeout', 'admin'];
      case 'notification':
        return ['title', 'message'];
      case 'telegram':
        return ['chat_id', 'text'];
      case 'bale':
        return ['chat_id', 'text'];
      default:
        return [];
    }
  };

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 h-full min-h-0 flex flex-col gap-4 ${className}`}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="shell-section-label mb-3">Assistant workspace</p>
          <div className="hero-chip mb-3 text-[11px] font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span>Interactive chat plus agent mode</span>
          </div>
          <h1 className="text-[22px] font-semibold text-foreground">Chat and Agent Mode</h1>
          <p className="text-[13px] text-muted-foreground mt-3 max-w-3xl">
            Use chat mode for interactive requests and tool execution, or switch to agent mode to convert a request directly into a local workflow.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary text-[13px]" onClick={() => void createSession('chat')}>
            New chat
          </button>
          <button className="btn-primary text-[13px]" onClick={() => void createSession('agent')}>
            New agent session
          </button>
        </div>
      </div>

      {(errorMessage || successMessage) && (
        <div className={`rounded-xl border px-4 py-3 text-[13px] ${errorMessage ? 'border-destructive/20 bg-destructive/10 text-destructive' : 'border-success/20 bg-success/10 text-success'}`}>
          {errorMessage || successMessage}
        </div>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label: 'Open sessions', value: sessions.length, caption: 'Reusable conversations and agent runs' },
          { label: 'Current mode', value: currentSession?.mode === 'agent' ? 'Agent' : 'Chat', caption: 'Switch posture based on the outcome you need' },
          {
            label: 'Assigned tools',
            value: configuredToolCount,
            caption: configuredToolCount > 0 ? 'Ready to run with the next message' : 'Attach tools to automate the next step',
          },
          { label: 'Active connectors', value: activeConnectorCount, caption: 'Gmail, Telegram, Bale, and alerts' },
        ].map((item) => (
          <div key={item.label} className="surface-card p-4">
            <p className="shell-section-label mb-2">{item.label}</p>
            <p className="text-[24px] font-semibold tracking-[-0.03em] text-foreground">{item.value}</p>
            <p className="text-[11px] text-muted-foreground mt-1.5">{item.caption}</p>
          </div>
        ))}
      </div>

      <div className="grid flex-1 min-h-0 gap-4 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
        <div className="surface-card p-4 min-h-0 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="shell-section-label mb-2">Sessions</p>
              <h2 className="text-[14px] font-semibold text-foreground">Conversation rail</h2>
            </div>
            <span className="shell-meta-chip">{sessions.length} total</span>
          </div>
          <div className="space-y-2 overflow-y-auto shell-scroll">
            {sessions.map((session) => (
              <button
                key={session.id}
                className={`w-full text-left rounded-2xl border px-4 py-3 transition-colors ${
                  session.id === currentSessionId ? 'border-primary/25 bg-primary/12' : 'border-border bg-secondary/40 hover:bg-accent'
                }`}
                onClick={() => setCurrentSessionId(session.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-semibold text-foreground truncate">{session.title}</p>
                  <span className="text-[10px] rounded-full border border-border bg-secondary/70 px-2 py-1 text-muted-foreground">
                    {session.mode}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2 truncate">
                  {session.messages[session.messages.length - 1]?.content || 'No messages yet'}
                </p>
              </button>
            ))}
          </div>
          <div className="surface-elevated p-4 mt-4">
            <p className="shell-section-label mb-2">Operator posture</p>
            <p className="text-[13px] text-foreground leading-6">
              Keep chat mode for iterative work and switch to agent mode when you want the platform to plan, execute, and attach deliverables for you.
            </p>
          </div>
        </div>

        <div className="surface-card glass-frame min-h-0 flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b soft-divider">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="shell-section-label mb-2">Conversation</p>
                <h2 className="text-[18px] font-semibold text-foreground">{sessionModeLabel}</h2>
                <p className="text-[12px] text-muted-foreground mt-2 max-w-2xl">{sessionModeDescription}</p>
              </div>
              <span className="shell-meta-chip">{currentSession?.mode || 'chat'}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto shell-scroll px-5 py-5 space-y-4">
            {(currentSession?.messages || []).length === 0 ? (
              <div className="surface-elevated p-8 text-center">
                <p className="text-[14px] font-medium text-foreground">No messages yet.</p>
                <p className="text-[12px] text-muted-foreground mt-2">
                  Add a tool, upload files, or ask the assistant to help. Agent mode will start a workflow automatically.
                </p>
              </div>
            ) : (
              currentSession?.messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[88%] rounded-2xl px-4 py-3 ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'surface-elevated text-foreground'}`}>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="text-[12px] font-semibold">{message.role === 'user' ? 'You' : 'Assistant'}</span>
                      <span className={`text-[11px] ${message.role === 'user' ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                        {new Date(message.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <MarkdownContent content={message.content} className="text-[13px] leading-6" />
                    {message.actions && message.actions.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {message.actions.map((action, index) => (
                          <div key={index} className="rounded-xl border border-border bg-secondary/40 px-3 py-2 text-[12px]">
                            <span className="font-semibold text-foreground">{action.type}</span>
                            <span className="text-muted-foreground"> · {action.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t soft-divider p-4 space-y-3">
            <div className="surface-elevated p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="shell-section-label mb-2">Next action</p>
                  <p className="text-[13px] text-foreground">
                    {currentSession?.mode === 'agent'
                      ? 'Describe the outcome, assign the right tools, and let the agent produce a runnable workflow.'
                      : 'Write the next message, attach files, and assign a tool when you want the assistant to take action.'}
                  </p>
                </div>
                {assignedTools.length > 0 && (
                  <span className="shell-meta-chip">{assignedTools.length} tool{assignedTools.length === 1 ? '' : 's'} attached</span>
                )}
              </div>
            </div>

            <textarea
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              className="input w-full min-h-[110px]"
              placeholder={currentSession?.mode === 'agent' ? 'Describe the result you want the agent to produce...' : 'Write a message, ask for an action, or describe what you want to do...'}
            />

            {uploads.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {uploads.map((upload) => (
                  <span key={upload.id} className="rounded-full border border-border bg-secondary/70 px-3 py-1 text-[11px] text-muted-foreground">
                    {upload.name}
                  </span>
                ))}
              </div>
            )}

            {assignedTools.length > 0 && (
              <div className="space-y-3">
                <p className="shell-section-label">Assigned tools</p>
                {assignedTools.map((tool, index) => (
                  <div key={`${tool.tool_id}-${index}`} className="surface-elevated p-3">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div>
                        <p className="text-[13px] font-semibold text-foreground">{tools.find((item) => item.id === tool.tool_id)?.label || tool.tool_id}</p>
                        <p className="text-[11px] text-muted-foreground">{tools.find((item) => item.id === tool.tool_id)?.description}</p>
                      </div>
                      <button className="btn-secondary text-[11px] h-8 px-3" onClick={() => removeTool(index)}>
                        Remove
                      </button>
                    </div>
                    <div className="grid gap-2">
                      {toolFields(tool.tool_id).map((field) => (
                        <input
                          key={field}
                          value={tool.parameters[field] || ''}
                          onChange={(e) => updateToolParam(index, field, e.target.value)}
                          className="input"
                          placeholder={field}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary text-[13px]" onClick={() => fileInputRef.current?.click()}>
                Upload files
              </button>
              <select value={selectedTool} onChange={(e) => setSelectedTool(e.target.value)} className="input w-[220px]">
                {tools.map((tool) => (
                  <option key={tool.id} value={tool.id}>
                    {tool.label}
                  </option>
                ))}
              </select>
              <button className="btn-secondary text-[13px]" onClick={addTool}>
                Assign tool
              </button>
              <button className="btn-primary text-[13px]" disabled={sending} onClick={() => void sendMessage()}>
                {sending ? 'Sending...' : currentSession?.mode === 'agent' ? 'Run agent' : 'Send message'}
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              accept="image/*,.pdf,.txt,.md,.doc,.docx,.csv,.xlsx,.png,.jpg,.jpeg"
              onChange={(e) => void uploadSelectedFiles(e.target.files)}
            />
          </div>
        </div>

        <div className="surface-card p-4 min-h-0 flex flex-col gap-4 overflow-y-auto shell-scroll">
          <div className="surface-elevated p-4">
            <p className="shell-section-label mb-2">Workspace orchestration</p>
            <p className="text-[13px] text-foreground leading-6">
              Connect delivery channels, keep notifications on, and use the learning loop so each new session starts with more context than the last one.
            </p>
          </div>

          <div className="surface-elevated p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="shell-section-label mb-2">Connector</p>
                <h2 className="text-[15px] font-semibold text-foreground">Gmail</h2>
              </div>
              <span className={`rounded-full border px-3 py-1 text-[11px] ${currentConnectorStatus ? 'border-success/20 bg-success/10 text-success' : 'border-border bg-secondary/70 text-muted-foreground'}`}>
                {currentConnectorStatus ? 'Connected' : 'Not connected'}
              </span>
            </div>
            <div className="grid gap-2">
              <input value={connectorForm.from_email} onChange={(e) => setConnectorForm((prev) => ({ ...prev, from_email: e.target.value }))} className="input" placeholder="From email" />
              <input value={connectorForm.username} onChange={(e) => setConnectorForm((prev) => ({ ...prev, username: e.target.value }))} className="input" placeholder="Gmail username" />
              <input value={connectorForm.password} onChange={(e) => setConnectorForm((prev) => ({ ...prev, password: e.target.value }))} className="input" placeholder="App password" type="password" />
              <div className="grid grid-cols-2 gap-2">
                <input value={connectorForm.host} onChange={(e) => setConnectorForm((prev) => ({ ...prev, host: e.target.value }))} className="input" placeholder="SMTP host" />
                <input value={connectorForm.port} onChange={(e) => setConnectorForm((prev) => ({ ...prev, port: e.target.value }))} className="input" placeholder="Port" />
              </div>
              <button className="btn-primary text-[13px]" onClick={() => void saveGmailConnector()}>
                Save Gmail connector
              </button>
            </div>
            <p className="text-[12px] text-muted-foreground mt-3">
              Use a Gmail app password. Once saved, the Gmail tool can send immediately or schedule emails from the chat surface.
            </p>
          </div>

          <div className="surface-elevated p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="shell-section-label mb-2">Learning loop</p>
                <h2 className="text-[15px] font-semibold text-foreground">Continuous self-improvement</h2>
              </div>
              <span className={`rounded-full border px-3 py-1 text-[11px] ${improvementStatus?.enabled ? 'border-success/20 bg-success/10 text-success' : 'border-border bg-secondary/70 text-muted-foreground'}`}>
                {improvementStatus?.enabled ? 'Active' : 'Paused'}
              </span>
            </div>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              Agent mode reviews recent runs, extracts reusable lessons, and attaches a fresh playbook to each new workflow.
            </p>
            {improvementStatus && (
              <div className="mt-3 space-y-3">
                <div className="rounded-xl border border-border bg-secondary/40 px-3 py-3">
                  <p className="text-[12px] font-semibold text-foreground">{improvementStatus.profile.strategy_summary}</p>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    Reviews: {improvementStatus.review_count} | Tasks observed: {improvementStatus.task_count}
                  </p>
                  {improvementStatus.last_review_at && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Last review: {new Date(improvementStatus.last_review_at).toLocaleString()}
                    </p>
                  )}
                </div>
                {improvementStatus.profile.guidance.length > 0 && (
                  <div className="space-y-2">
                    {improvementStatus.profile.guidance.slice(0, 3).map((item, index) => (
                      <div key={index} className="rounded-xl border border-border bg-secondary/40 px-3 py-2 text-[12px] text-foreground">
                        {item}
                      </div>
                    ))}
                  </div>
                )}
                {improvementLessons[0] && (
                  <p className="text-[11px] text-muted-foreground">
                    Latest preferred tools: {improvementLessons[0].preferred_tools.join(', ') || 'No strong preference yet'}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <button className="btn-secondary text-[13px]" onClick={() => void runImprovementReview()}>
                    Run review now
                  </button>
                  <button
                    className="btn-secondary text-[13px]"
                    onClick={() => void toggleImprovement(!(improvementStatus?.enabled ?? true))}
                  >
                    {improvementStatus?.enabled ? 'Pause loop' : 'Resume loop'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="surface-elevated p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="shell-section-label mb-2">Notification</p>
                <h2 className="text-[15px] font-semibold text-foreground">Desktop alerts</h2>
              </div>
              <span className={`rounded-full border px-3 py-1 text-[11px] ${notificationStatus?.enabled ? 'border-success/20 bg-success/10 text-success' : 'border-border bg-secondary/70 text-muted-foreground'}`}>
                {notificationStatus?.enabled ? 'Enabled' : 'Unavailable'}
              </span>
            </div>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              Local Windows notifications can be triggered directly from chat tools, Telegram commands, or Bale commands.
            </p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-[12px] text-muted-foreground">
                Delivered so far: {notificationStatus?.history_count ?? 0}
              </span>
              <button className="btn-secondary text-[13px]" onClick={() => void sendTestNotification()}>
                Send test notification
              </button>
            </div>
          </div>

          <div className="surface-elevated p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="shell-section-label mb-2">Connector</p>
                <h2 className="text-[15px] font-semibold text-foreground">Telegram</h2>
              </div>
              <span className={`rounded-full border px-3 py-1 text-[11px] ${telegramConnectorStatus ? 'border-success/20 bg-success/10 text-success' : 'border-border bg-secondary/70 text-muted-foreground'}`}>
                {telegramConnectorStatus ? 'Connected' : 'Not connected'}
              </span>
            </div>
            <div className="grid gap-2">
              <input value={telegramForm.bot_token} onChange={(e) => setTelegramForm((prev) => ({ ...prev, bot_token: e.target.value }))} className="input" placeholder="Bot token" />
              <input value={telegramForm.default_chat_id} onChange={(e) => setTelegramForm((prev) => ({ ...prev, default_chat_id: e.target.value }))} className="input" placeholder="Default chat id" />
              <input value={telegramForm.allowed_chat_ids} onChange={(e) => setTelegramForm((prev) => ({ ...prev, allowed_chat_ids: e.target.value }))} className="input" placeholder="Allowed chat ids (comma separated)" />
              <button className="btn-primary text-[13px]" onClick={() => void saveTelegramConnector()}>
                Save Telegram connector
              </button>
            </div>
            <p className="text-[12px] text-muted-foreground mt-3">
              Once connected, the bot can receive `/status`, `/agent`, `/run`, and `/notify` commands and can also send Telegram messages from assigned tools in chat.
            </p>
          </div>

          <div className="surface-elevated p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="shell-section-label mb-2">Connector</p>
                <h2 className="text-[15px] font-semibold text-foreground">Bale</h2>
              </div>
              <span className={`rounded-full border px-3 py-1 text-[11px] ${baleConnectorStatus ? 'border-success/20 bg-success/10 text-success' : 'border-border bg-secondary/70 text-muted-foreground'}`}>
                {baleConnectorStatus ? 'Connected' : 'Not connected'}
              </span>
            </div>
            <div className="grid gap-2">
              <input value={baleForm.bot_token} onChange={(e) => setBaleForm((prev) => ({ ...prev, bot_token: e.target.value }))} className="input" placeholder="Bot token" />
              <input value={baleForm.default_chat_id} onChange={(e) => setBaleForm((prev) => ({ ...prev, default_chat_id: e.target.value }))} className="input" placeholder="Default chat id" />
              <input value={baleForm.allowed_chat_ids} onChange={(e) => setBaleForm((prev) => ({ ...prev, allowed_chat_ids: e.target.value }))} className="input" placeholder="Allowed chat ids (comma separated)" />
              <button className="btn-primary text-[13px]" onClick={() => void saveBaleConnector()}>
                Save Bale connector
              </button>
            </div>
            <p className="text-[12px] text-muted-foreground mt-3">
              Bale remote control mirrors the Telegram command surface so you can run `/status`, `/agent`, `/run`, and `/notify` from a connected Bale bot as well.
            </p>
          </div>

          <div className="surface-elevated p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="shell-section-label mb-2">Available tools</p>
                <h2 className="text-[15px] font-semibold text-foreground">Assignable actions</h2>
              </div>
              <span className="shell-meta-chip">{tools.length} tools</span>
            </div>
            <div className="space-y-3">
              {tools.map((tool) => (
                <div key={tool.id} className="rounded-xl border border-border bg-secondary/40 px-3 py-3">
                  <p className="text-[13px] font-semibold text-foreground">{tool.label}</p>
                  <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">{tool.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
