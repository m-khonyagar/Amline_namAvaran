import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../i18n';
import { useThemeStore } from '../stores/themeStore';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  attachments?: Array<{
    type: 'file' | 'image' | 'code';
    name: string;
    url: string;
  }>;
}

interface AIAgentInterfaceProps {
  className?: string;
}

export function AIAgentInterface({ className = '' }: AIAgentInterfaceProps) {
  const { t } = useTranslation();
  const { isDark } = useThemeStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('general');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const agents = [
    { id: 'general', name: 'General Assistant', icon: '🤖', description: 'General purpose AI assistant' },
    { id: 'coder', name: 'Code Assistant', icon: '💻', description: 'Specialized in programming and development' },
    { id: 'analyst', name: 'Data Analyst', icon: '📊', description: 'Data analysis and insights' },
    { id: 'researcher', name: 'Research Assistant', icon: '🔍', description: 'Research and information gathering' },
    { id: 'creative', name: 'Creative Writer', icon: '✍️', description: 'Content creation and writing' },
  ];

  const suggestions = [
    'Help me analyze my recent tasks and suggest improvements',
    'Create a comprehensive report of my productivity metrics',
    'Set up automated workflows for my daily tasks',
    'Review and optimize my current project structure',
    'Generate insights from my activity patterns',
  ];

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
      status: 'sent',
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setShowSuggestions(false);
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I understand you want to: "${input}". Let me help you with that. I'll analyze your request and provide the best solution based on your current context and preferences.`,
        timestamp: new Date(),
        status: 'delivered',
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const currentAgent = agents.find(a => a.id === selectedAgent);

  return (
    <div className={`flex flex-col h-full bg-background ${className}`}>
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="text-xl">{currentAgent?.icon}</span>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">{currentAgent?.name}</h2>
              <p className="text-sm text-muted-foreground">{currentAgent?.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-accent rounded-lg transition-colors">
              <span>⚙️</span>
            </button>
            <button className="p-2 hover:bg-accent rounded-lg transition-colors">
              <span>📌</span>
            </button>
          </div>
        </div>

        {/* Agent Selector */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => setSelectedAgent(agent.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-colors ${
                selectedAgent === agent.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent hover:bg-accent/80'
              }`}
            >
              <span>{agent.icon}</span>
              <span className="text-sm font-medium">{agent.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <span className="text-2xl">{currentAgent?.icon}</span>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Welcome to {currentAgent?.name}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              I'm here to help you with your tasks. Ask me anything or choose from the suggestions below.
            </p>
            
            {/* Suggestions */}
            {showSuggestions && (
              <div className="w-full max-w-2xl space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Suggested questions:</h4>
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full text-left p-3 bg-accent rounded-lg hover:bg-accent/80 transition-colors text-sm"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span>{currentAgent?.icon}</span>
                  </div>
                )}
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-accent'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs opacity-70">
                    <span>{formatTimestamp(message.timestamp)}</span>
                    {message.status && (
                      <span>
                        {message.status === 'sending' && '⏳'}
                        {message.status === 'sent' && '✓'}
                        {message.status === 'delivered' && '✓✓'}
                        {message.status === 'read' && '👁'}
                      </span>
                    )}
                  </div>
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <span>👤</span>
                  </div>
                )}
              </div>
            ))}
            
            {isTyping && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span>{currentAgent?.icon}</span>
                </div>
                <div className="bg-accent rounded-lg p-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-border p-4">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Message ${currentAgent?.name}...`}
              className="w-full px-4 py-3 bg-accent rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px] max-h-32"
              rows={1}
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="p-3 hover:bg-accent rounded-lg transition-colors">
              <span>📎</span>
            </button>
            <button className="p-3 hover:bg-accent rounded-lg transition-colors">
              <span>🎤</span>
            </button>
            <button
              onClick={handleSendMessage}
              disabled={!input.trim()}
              className="p-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>➤</span>
            </button>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span>•</span>
          <span>Attach files with 📎</span>
          <span>•</span>
          <span>Voice input with 🎤</span>
        </div>
      </div>
    </div>
  );
}
