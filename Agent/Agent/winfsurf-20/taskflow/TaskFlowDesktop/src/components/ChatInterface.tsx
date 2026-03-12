import React, { useRef, useEffect } from 'react';
import { useThemeStore } from '../design-system/theme';
import { useTranslation } from '../i18n';

export interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
}

interface ChatInterfaceProps {
  messages?: Message[];
  hideInput?: boolean;
  className?: string;
}

const defaultMessages: Message[] = [
  {
    id: '1',
    role: 'user',
    content: 'Summarize the latest Python 3.14 updates for me.',
    timestamp: new Date(Date.now() - 120000),
    status: 'sent'
  },
  {
    id: '2',
    role: 'agent',
    content: 'Got it! Let me gather the latest changes in Python 3.14...',
    timestamp: new Date(Date.now() - 110000),
    status: 'sent'
  },
  {
    id: '3',
    role: 'agent',
    content: 'I have summarized the updates for Python 3.14:\n\n• New pattern matching enhancements\n• Built-in "macros" module\n• Improved f-string formatting\n• Faster memory management\n\nI\'ll add more details below.',
    timestamp: new Date(Date.now() - 60000),
    status: 'sent'
  }
];

export function ChatInterface({ messages = defaultMessages, hideInput = true, className = '' }: ChatInterfaceProps) {
  const { resolvedTheme } = useThemeStore();
  const { t } = useTranslation();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${className}`}>
      <div className="border-b soft-divider px-5 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 w-full">
          <div>
            <p className="text-[16px] font-semibold text-foreground">{t('liveAgentSession')}</p>
            <p className="text-[12px] text-muted-foreground mt-1">{t('streamingOutput')}</p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[12px] font-medium text-primary">{t('streaming')}</span>
            <span className="rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-[12px] font-medium text-muted-foreground">{t('observed')}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto shell-scroll px-5 py-6">
        <div className="max-w-4xl mx-auto space-y-5">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'agent' && (
                <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary/12 border border-primary/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 9a1 1 0 012 0v4a1 1 0 11-2 0V9zm1-4a1 1 0 100 2 1 1 0 000-2z" />
                  </svg>
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground shadow-[0_12px_30px_hsl(var(--primary)/0.22)]'
                    : 'surface-card text-foreground'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[12px] font-semibold ${message.role === 'user' ? 'text-primary-foreground/90' : 'text-foreground'}`}>
                    {message.role === 'user' ? t('you') : t('agentLabel')}
                  </span>
                  <span className={`text-[12px] ${message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {message.status ?? 'sent'}
                  </span>
                </div>
                <div className="text-[13px] whitespace-pre-wrap break-words leading-6">
                  {message.content}
                </div>
                <div className={`text-xs mt-1 ${
                  message.role === 'user'
                    ? 'text-primary-foreground/80'
                    : 'text-muted-foreground'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {message.role === 'user' && (
                <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-secondary border border-border flex items-center justify-center">
                  <svg className="w-4 h-4 text-muted-foreground" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}
