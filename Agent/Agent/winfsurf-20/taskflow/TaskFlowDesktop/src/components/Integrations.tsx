import React, { useState } from 'react';
import { useTranslation } from '../i18n';

interface IntegrationsProps {
  className?: string;
}

interface Integration {
  id: string;
  name: string;
  description: string;
  category: 'communication' | 'project-management' | 'development' | 'cloud';
  status: 'connected' | 'available' | 'unavailable';
  icon: string;
}

export function Integrations({ className = '' }: IntegrationsProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const integrations: Integration[] = [
    {
      id: 'slack',
      name: 'Slack',
      description: 'Send task updates and notifications to Slack channels',
      category: 'communication',
      status: 'available',
      icon: '💬',
    },
    {
      id: 'teams',
      name: 'Microsoft Teams',
      description: 'Integrate with Teams for collaboration and notifications',
      category: 'communication',
      status: 'available',
      icon: '👥',
    },
    {
      id: 'linear',
      name: 'Linear',
      description: 'Sync tasks and issues with Linear workspace',
      category: 'project-management',
      status: 'available',
      icon: '📊',
    },
    {
      id: 'jira',
      name: 'Jira',
      description: 'Connect to Jira for issue tracking and project management',
      category: 'project-management',
      status: 'available',
      icon: '🎯',
    },
    {
      id: 'github',
      name: 'GitHub',
      description: 'Create pull requests, manage repositories, and track commits',
      category: 'development',
      status: 'connected',
      icon: '🐙',
    },
    {
      id: 'gitlab',
      name: 'GitLab',
      description: 'Integrate with GitLab for version control and CI/CD',
      category: 'development',
      status: 'available',
      icon: '🦊',
    },
    {
      id: 'vercel',
      name: 'Vercel',
      description: 'Deploy and manage projects directly from the workspace',
      category: 'cloud',
      status: 'available',
      icon: '▲',
    },
    {
      id: 'aws',
      name: 'AWS',
      description: 'Connect to AWS services for cloud infrastructure',
      category: 'cloud',
      status: 'unavailable',
      icon: '☁️',
    },
  ];

  const categories = [
    { id: 'all', label: t('all') },
    { id: 'communication', label: t('communication') },
    { id: 'project-management', label: t('projectManagement') },
    { id: 'development', label: t('development') },
    { id: 'cloud', label: t('cloud') },
  ];

  const filteredIntegrations = integrations.filter((integration) => {
    const matchesSearch =
      searchQuery === '' ||
      integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      integration.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || integration.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-success/12 text-success border-success/20';
      case 'available':
        return 'bg-primary/12 text-primary border-primary/20';
      case 'unavailable':
        return 'bg-secondary text-secondary-foreground border-border';
      default:
        return 'bg-secondary text-secondary-foreground border-border';
    }
  };

  return (
    <div className={`p-5 ${className}`}>
      <div className="mb-5">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-2.5">{t('connections')}</p>
        <h1 className="text-[22px] font-semibold text-foreground leading-tight">{t('integrations')}</h1>
        <p className="text-[13px] text-muted-foreground mt-2.5">
          {t('connectIntegrations')}
        </p>
      </div>

      <div className="surface-card p-4 mb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <input
            type="text"
            placeholder={`${t('search')} integrations`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input flex-1"
          />
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const active = categoryFilter === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => setCategoryFilter(category.id)}
                  className={`h-8 px-3 rounded-lg border text-[12px] font-medium transition-colors ${
                    active
                      ? 'border-primary/25 bg-primary/12 text-primary'
                      : 'border-border bg-secondary text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  {category.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {filteredIntegrations.length === 0 ? (
        <div className="surface-card p-10 text-center">
          <p className="text-[14px] font-medium text-foreground">{t('noIntegrationsFound')}</p>
          <p className="text-[13px] text-muted-foreground mt-2">{t('tryDifferentFilter')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredIntegrations.map((integration) => (
            <div
              key={integration.id}
              className="surface-card p-4 transition-colors hover:border-primary/20"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-[24px]">{integration.icon}</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[14px] font-semibold text-foreground leading-snug">{integration.name}</h3>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium mt-1 ${getStatusColor(integration.status)}`}>
                      {integration.status}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-[12px] text-muted-foreground leading-relaxed mb-3">{integration.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground capitalize">{integration.category.replace('-', ' ')}</span>
                {integration.status === 'connected' ? (
                  <button className="btn-secondary text-[11px] h-7 px-2.5">{t('manage')}</button>
                ) : integration.status === 'available' ? (
                  <button className="btn-primary text-[11px] h-7 px-2.5">{t('connect')}</button>
                ) : (
                  <button className="btn-secondary text-[11px] h-7 px-2.5 opacity-50 cursor-not-allowed" disabled>
                    {t('comingSoon')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
