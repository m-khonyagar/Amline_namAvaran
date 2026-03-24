import React, { useEffect, useState } from 'react';
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
  const [errorMessage, setErrorMessage] = useState('');

  const loadMemories = async () => {
    try {
      setErrorMessage('');
      const data = await backend.getMemory();
      setMemories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load memory right now.');
      setMemories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMemories();
  }, []);

  const filteredMemories = memories.filter((memory: any) => {
    const matchesSearch =
      searchQuery === '' ||
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

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'task_summary':
        return 'TASK';
      case 'reflection':
        return 'NOTE';
      case 'pattern':
        return 'RULE';
      default:
        return 'ITEM';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'task_summary':
        return 'bg-info text-info-foreground';
      case 'reflection':
        return 'bg-warning text-warning-foreground';
      case 'pattern':
        return 'bg-success text-success-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const selectedMemoryData = filteredMemories.find((memory) => memory.id === selectedMemory);

  return (
    <div className={`p-5 ${className}`}>
      <div className="mb-5">
        <p className="shell-section-label mb-2.5">{t('knowledge')}</p>
        <h1 className="text-[22px] font-semibold text-foreground leading-tight">{t('memory')}</h1>
        <p className="text-[13px] text-muted-foreground mt-2.5">{t('exploreSearchMemory')}</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        {[
          { label: t('stored'), value: memories.length, caption: 'All saved memory items in this workspace' },
          { label: t('visible'), value: filteredMemories.length, caption: 'Items matching the current filter' },
          { label: t('patterns'), value: memories.filter((memory: any) => memory.type === 'pattern').length, caption: 'Reusable workflow rules' },
          { label: t('reflections'), value: memories.filter((memory: any) => memory.type === 'reflection').length, caption: 'Operational notes and learnings' },
        ].map((stat) => (
          <div key={stat.label} className="surface-card p-4">
            <p className="shell-section-label">{stat.label}</p>
            <p className="mt-2 text-[22px] font-semibold tracking-[-0.03em] text-foreground leading-none">{stat.value}</p>
            <p className="mt-1.5 text-[11px] text-muted-foreground">{stat.caption}</p>
          </div>
        ))}
      </div>

      <div className="surface-card p-4 mb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <input
            type="text"
            placeholder={`${t('search')} memories`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input w-full"
          />
          <button className="btn-secondary text-[12px] h-10 px-3" onClick={() => void loadMemories()}>
            {t('refresh')}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4">
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
                    <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-border bg-secondary px-2 text-[10px] font-semibold text-foreground">
                      {getTypeLabel(memory.type)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[14px] font-semibold text-foreground leading-snug truncate">{memory.title}</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{new Date(memory.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full shrink-0 border ${getTypeColor(memory.type)}`}>
                    {memory.type.replace('_', ' ')}
                  </span>
                </div>

                <p className="text-[12px] text-muted-foreground mb-2.5 line-clamp-2 leading-relaxed">{memory.content}</p>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1">
                    {memory.tags.slice(0, 3).map((tag: string) => (
                      <span key={tag} className="px-1.5 py-0.5 text-[10px] bg-secondary text-secondary-foreground rounded">
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">{Math.round(memory.relevance * 100)}% relevant</span>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="lg:col-span-1">
          {selectedMemoryData ? (
            <div className="surface-card glass-frame p-4 sticky top-4">
              <div className="flex items-center gap-2.5 mb-3.5">
                <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-border bg-secondary px-2 text-[10px] font-semibold text-foreground">
                  {getTypeLabel(selectedMemoryData.type)}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[14px] font-semibold text-foreground leading-snug">{selectedMemoryData.title}</h3>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium mt-1 ${getTypeColor(selectedMemoryData.type)}`}>
                    {selectedMemoryData.type.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="surface-elevated p-3 mb-3.5">
                <p className="shell-section-label mb-2">Knowledge view</p>
                <p className="text-[12px] text-foreground leading-6">
                  Review what the workspace has learned, why it is relevant, and which task or pattern it should influence next.
                </p>
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
                <p className="text-[11px] text-muted-foreground mt-2.5">{new Date(selectedMemoryData.createdAt).toLocaleString()}</p>
              </div>

              <div className="mb-3.5">
                <h4 className="text-[12px] font-medium text-foreground mb-2">{t('content')}</h4>
                <p className="text-[12px] text-foreground leading-relaxed">{selectedMemoryData.content}</p>
              </div>

              <div className="mb-3.5">
                <h4 className="text-[12px] font-medium text-foreground mb-2">{t('tags')}</h4>
                <div className="flex flex-wrap gap-1">
                  {selectedMemoryData.tags.map((tag: string) => (
                    <span key={tag} className="px-1.5 py-0.5 text-[10px] bg-secondary text-secondary-foreground rounded">
                      #{tag}
                    </span>
                  ))}
                </div>
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
