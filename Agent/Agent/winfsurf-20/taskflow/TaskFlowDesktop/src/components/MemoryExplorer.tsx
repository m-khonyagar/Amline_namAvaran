import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n';
import { backend } from '../api';

interface MemoryExplorerProps {
  className?: string;
}

export function MemoryExplorer({ className = '' }: MemoryExplorerProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMemory, setSelectedMemory] = useState<string | null>(null);
  const [memories, setMemories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    backend.getMemory().then((data) => {
      setMemories(Array.isArray(data) ? data : []);
    }).catch(() => setMemories([])).finally(() => setLoading(false));
  }, []);

  const defaultMemories = [
    {
      id: '1',
      type: 'task_summary',
      title: 'Flask Web Application Development',
      content: 'Successfully created a Flask web application with SQLAlchemy models, REST API endpoints, and Jinja2 templates. The application includes user authentication and CRUD operations for blog posts.',
      tags: ['flask', 'web', 'python', 'sqlalchemy'],
      createdAt: '2026-03-11T10:30:00Z',
      taskId: '1',
      relevance: 0.95,
    },
    {
      id: '2',
      type: 'reflection',
      title: 'Best Practices for Web Development',
      content: 'Key insights from web development research: 1) Use ORM for database operations, 2) Implement proper error handling, 3) Add input validation, 4) Use environment variables for configuration, 5) Implement logging.',
      tags: ['best-practices', 'web', 'development'],
      createdAt: '2026-03-11T11:00:00Z',
      taskId: '2',
      relevance: 0.87,
    },
    {
      id: '3',
      type: 'pattern',
      title: 'Multi-Agent Collaboration Pattern',
      content: 'Effective pattern for complex tasks: 1) PlannerAgent breaks down requirements, 2) Specialist agents handle specific domains, 3) ReviewerAgent ensures quality, 4) Coordinator manages handoffs.',
      tags: ['multi-agent', 'collaboration', 'pattern'],
      createdAt: '2026-03-11T09:45:00Z',
      taskId: null,
      relevance: 0.92,
    },
    {
      id: '4',
      type: 'task_summary',
      title: 'React Dashboard Implementation',
      content: 'Built a responsive dashboard with React, TypeScript, and Tailwind CSS. Features include real-time data updates, dark mode support, and internationalization.',
      tags: ['react', 'typescript', 'dashboard', 'ui'],
      createdAt: '2026-03-10T16:20:00Z',
      taskId: '4',
      relevance: 0.78,
    },
  ];

  const memoriesToUse = memories.length > 0 ? memories : defaultMemories;

  const filteredMemories = memoriesToUse.filter((memory: any) => {
    const matchesSearch = searchQuery === '' || 
      (memory.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (memory.content || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (memory.tags || []).some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  if (loading && memories.length === 0) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'task_summary': return '📋';
      case 'reflection': return '💭';
      case 'pattern': return '🔗';
      default: return '📝';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'task_summary': return 'bg-info text-info-foreground';
      case 'reflection': return 'bg-warning text-warning-foreground';
      case 'pattern': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const selectedMemoryData = filteredMemories.find(m => m.id === selectedMemory);

  return (
    <div className={`p-5 ${className}`}>
      <div className="mb-5">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-2.5">{t('knowledge')}</p>
        <h1 className="text-[22px] font-semibold text-foreground leading-tight">{t('memory')}</h1>
        <p className="text-[13px] text-muted-foreground mt-2.5">{t('exploreSearchMemory')}</p>
      </div>

      {/* Search and Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        {[
          { label: t('stored'), value: memoriesToUse.length },
          { label: t('visible'), value: filteredMemories.length },
          { label: t('patterns'), value: memoriesToUse.filter((m: any) => m.type === 'pattern').length },
          { label: t('reflections'), value: memoriesToUse.filter((m: any) => m.type === 'reflection').length },
        ].map((stat) => (
          <div key={stat.label} className="surface-elevated px-3.5 py-2.5">
            <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            <p className="mt-1.5 text-[18px] font-semibold text-foreground leading-none">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="surface-card p-4 mb-4">
        <input
          type="text"
          placeholder={`${t('search')} memories`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input w-full"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4">
        {/* Memory List */}
        <div className="space-y-2.5">
          {filteredMemories.length === 0 ? (
            <div className="surface-card p-10 text-center">
              <p className="text-[14px] font-medium text-foreground">{t('noMemoriesFound')}</p>
              <p className="text-[13px] text-muted-foreground mt-2">{t('tryDifferentFilter')}</p>
            </div>
          ) : (
            filteredMemories.map((memory) => (
              <button
                key={memory.id}
                className={`surface-card p-4 w-full text-left transition-colors ${
                  selectedMemory === memory.id ? 'border-primary/30' : 'hover:border-primary/20'
                }`}
                onClick={() => setSelectedMemory(memory.id)}
              >
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="text-[18px] shrink-0">{getTypeIcon(memory.type)}</span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[14px] font-semibold text-foreground leading-snug truncate">{memory.title}</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {new Date(memory.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full shrink-0 border ${getTypeColor(memory.type)}`}>
                    {memory.type.replace('_', ' ')}
                  </span>
                </div>

                <p className="text-[12px] text-muted-foreground mb-2.5 line-clamp-2 leading-relaxed">
                  {memory.content}
                </p>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1">
                    {memory.tags.slice(0, 3).map((tag: string) => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 text-[10px] bg-secondary text-secondary-foreground rounded"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {Math.round(memory.relevance * 100)}% relevant
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Memory Detail Panel */}
        <div className="lg:col-span-1">
          {selectedMemoryData ? (
            <div className="surface-card p-4 sticky top-4">
              <div className="flex items-center gap-2.5 mb-3.5">
                <span className="text-[20px]">{getTypeIcon(selectedMemoryData.type)}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[14px] font-semibold text-foreground leading-snug">{selectedMemoryData.title}</h3>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium mt-1 ${getTypeColor(selectedMemoryData.type)}`}>
                    {selectedMemoryData.type.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="surface-elevated p-3 mb-3.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <p className="text-[11px] text-muted-foreground">{t('relevanceScore')}</p>
                    <p className="text-[14px] font-semibold text-foreground mt-1">{Math.round(selectedMemoryData.relevance * 100)}%</p>
                  </div>
                  {selectedMemoryData.taskId && (
                    <div>
                      <p className="text-[11px] text-muted-foreground">{t('task')}</p>
                      <p className="text-[14px] font-semibold text-foreground mt-1">#{selectedMemoryData.taskId}</p>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-2.5">
                  {new Date(selectedMemoryData.createdAt).toLocaleString()}
                </p>
              </div>

              <div className="mb-3.5">
                <h4 className="text-[12px] font-medium text-foreground mb-2">{t('content')}</h4>
                <p className="text-[12px] text-foreground leading-relaxed">
                  {selectedMemoryData.content}
                </p>
              </div>

              <div className="mb-3.5">
                <h4 className="text-[12px] font-medium text-foreground mb-2">{t('tags')}</h4>
                <div className="flex flex-wrap gap-1">
                  {selectedMemoryData.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.5 text-[10px] bg-secondary text-secondary-foreground rounded"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button className="btn-secondary text-[11px] h-7 px-2.5 flex-1">
                  {t('export')}
                </button>
                <button className="btn-secondary text-[11px] h-7 px-2.5 flex-1">
                  {t('edit')}
                </button>
              </div>
            </div>
          ) : (
            <div className="surface-card p-6 text-center">
              <p className="text-[13px] text-muted-foreground">{t('selectMemoryToView')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
