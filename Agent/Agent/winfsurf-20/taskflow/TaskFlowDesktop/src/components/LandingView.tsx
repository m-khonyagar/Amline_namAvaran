import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n';
import { backend, initBackend } from '../api';

interface LandingViewProps {
  onSuggestionClick?: (text: string) => void;
  className?: string;
}

const suggestions = [
  'Create a new task to refactor the API module',
  'Summarize recent task logs and suggest improvements',
  'Check system health and agent status',
  'Explore memory and artifacts from completed tasks',
];

export function LandingView({ onSuggestionClick, className = '' }: LandingViewProps) {
  const { t } = useTranslation();
  const [stats, setStats] = useState<{ tasks: number; agents: number } | null>(null);

  useEffect(() => {
    initBackend().then(() => {
      Promise.all([backend.getTasks(), backend.getAgents()])
        .then(([tasks, agents]) => setStats({ tasks: tasks.length, agents: agents.length }))
        .catch(() => setStats(null));
    });
  }, []);

  return (
    <div className={`flex flex-col items-center flex-1 min-h-0 overflow-y-auto scrollbar-thin px-4 py-12 ${className}`}>
      {/* Hero - Devin.ai style */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-3xl md:text-4xl font-semibold text-foreground mb-3 tracking-tight">
          Agent Windsurf Amline
        </h1>
        <p className="text-lg text-muted-foreground">
          Your AI software engineering assistant. Create tasks, manage agents, and get things done.
        </p>
      </div>

      {/* Suggestion cards - ChatGPT pattern */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-3xl">
        {suggestions.map((text, i) => (
          <button
            key={i}
            onClick={() => onSuggestionClick?.(text)}
            className="devin-card p-4 text-left hover:border-primary/40 group transition-all"
          >
            <span className="text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2">
              {text}
            </span>
          </button>
        ))}
      </div>

      {/* Capabilities - Devin style */}
      <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl">
        {[
          { label: 'Code Migration', desc: 'Refactors & upgrades' },
          { label: 'Data Engineering', desc: 'ETL & analysis' },
          { label: 'Bug Fixes', desc: 'Backlog & CI/CD' },
          { label: 'App Development', desc: 'Frontend & testing' },
        ].map(({ label, desc }) => (
          <div key={label} className="devin-card p-4 text-center">
            <p className="text-sm font-medium text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
          </div>
        ))}
      </div>

      {/* Stats */}
      {stats && (
        <div className="mt-12 flex items-center justify-center gap-8 text-sm text-muted-foreground">
          <span>{stats.tasks} {t('tasks')}</span>
          <span>•</span>
          <span>{stats.agents} {t('activeAgents')}</span>
        </div>
      )}
    </div>
  );
}
