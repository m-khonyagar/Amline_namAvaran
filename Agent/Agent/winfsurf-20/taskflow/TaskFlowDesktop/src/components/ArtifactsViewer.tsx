import React, { useEffect, useState } from 'react';
import { useTranslation } from '../i18n';
import { backend } from '../api';
import { API_BASE } from '../api/config';
import { MarkdownContent } from './MarkdownContent';

interface ArtifactsViewerProps {
  className?: string;
}

export function ArtifactsViewer({ className = '' }: ArtifactsViewerProps) {
  const { t } = useTranslation();
  const [selectedArtifact, setSelectedArtifact] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadArtifacts = async () => {
    try {
      setErrorMessage('');
      const data = await backend.getArtifacts();
      setArtifacts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load artifacts right now.');
      setArtifacts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadArtifacts();
  }, []);

  const filteredArtifacts = artifacts.filter((artifact: any) => {
    const matchesSearch =
      searchQuery === '' ||
      (artifact.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (artifact.path || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || artifact.type === filterType;
    return matchesSearch && matchesType;
  });

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'code':
        return 'CODE';
      case 'text':
        return 'TEXT';
      case 'image':
        return 'IMAGE';
      case 'binary':
        return 'BIN';
      default:
        return 'FILE';
    }
  };

  const getLanguageLabel = (language: string) => {
    switch (language) {
      case 'python':
        return 'PY';
      case 'javascript':
        return 'JS';
      case 'html':
        return 'HTML';
      case 'css':
        return 'CSS';
      case 'markdown':
        return 'MD';
      default:
        return 'TXT';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const selectedArtifactData = artifacts.find((a: any) => a.id === selectedArtifact);
  const artifactCounts = {
    total: artifacts.length,
    code: artifacts.filter((artifact) => artifact.type === 'code').length,
    text: artifacts.filter((artifact) => artifact.type === 'text').length,
    binary: artifacts.filter((artifact) => artifact.type === 'binary').length,
  };

  useEffect(() => {
    if (!selectedArtifactData || selectedArtifactData.content) return;
    const controller = new AbortController();

    const loadPreview = async () => {
      try {
        setPreviewLoading(true);
        const res = await fetch(`${API_BASE}/artifacts/${selectedArtifactData.id}`, { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        setArtifacts((prev) =>
          prev.map((artifact) =>
            artifact.id === selectedArtifactData.id
              ? { ...artifact, content: data.content || '', size: data.size || artifact.size }
              : artifact
          )
        );
      } catch {
        // Keep metadata visible even when preview loading fails.
      } finally {
        setPreviewLoading(false);
      }
    };

    void loadPreview();
    return () => controller.abort();
  }, [selectedArtifactData]);

  if (loading && artifacts.length === 0) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  const handleOpenArtifact = (artifact: any) => {
    window.open(artifact.downloadUrl || `${API_BASE}/artifacts/${artifact.id}/download`, '_blank', 'noopener,noreferrer');
  };

  const handleCopyPath = async (path: string) => {
    try {
      await navigator.clipboard.writeText(path);
    } catch (error) {
      console.error(error);
    }
  };

  const renderPreview = (artifact: any) => {
    const content = previewLoading ? 'Loading preview...' : artifact.content || artifact.path;
    const language = (artifact.language || '').toLowerCase();
    const isMarkdown = language === 'markdown' || artifact.name?.toLowerCase().endsWith('.md');
    if (isMarkdown) {
      return <MarkdownContent content={content} className="text-[12px]" />;
    }
    return (
      <pre className="text-[11px] text-foreground font-mono whitespace-pre-wrap leading-relaxed">
        {content}
      </pre>
    );
  };

  return (
    <div className={`p-5 ${className}`}>
      <div className="mb-5">
        <p className="shell-section-label mb-2.5">{t('outputs')}</p>
        <div className="hero-chip mb-3 text-[11px] font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          <span>Output browser</span>
        </div>
        <h1 className="text-[22px] font-semibold text-foreground leading-tight">{t('artifacts')}</h1>
        <p className="text-[13px] text-muted-foreground mt-2.5">{t('viewManageFiles')}</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'All files', value: artifactCounts.total, caption: 'Every generated output in the local workspace' },
          { label: 'Code', value: artifactCounts.code, caption: 'Scripts, snippets, and source files' },
          { label: 'Text', value: artifactCounts.text, caption: 'Summaries, notes, and markdown deliverables' },
          { label: 'Binary', value: artifactCounts.binary, caption: 'Downloads and non-text assets' },
        ].map((item) => (
          <div key={item.label} className="surface-card p-4">
            <p className="shell-section-label">{item.label}</p>
            <p className="mt-2 text-[22px] font-semibold tracking-[-0.03em] text-foreground">{item.value}</p>
            <p className="mt-1.5 text-[11px] text-muted-foreground">{item.caption}</p>
          </div>
        ))}
      </div>

      <div className="surface-card glass-frame p-4 mb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <input
            type="text"
            placeholder={`${t('search')} artifacts`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input flex-1"
          />
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="input w-full md:w-40">
            <option value="all">{t('allTypes')}</option>
            <option value="code">{t('code')}</option>
            <option value="text">{t('text')}</option>
            <option value="image">{t('images')}</option>
            <option value="binary">{t('binary')}</option>
          </select>
          <button className="btn-secondary text-[12px] h-10 px-3" onClick={() => void loadArtifacts()}>
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
          {filteredArtifacts.length === 0 ? (
            <div className="surface-card p-10 text-center">
              <p className="text-[14px] font-medium text-foreground">{t('noArtifactsFound')}</p>
              <p className="text-[13px] text-muted-foreground mt-2">{t('tryDifferentFilter')}</p>
            </div>
          ) : (
            filteredArtifacts.map((artifact) => (
              <button
                key={artifact.id}
                className={`surface-card p-4 w-full text-left transition-colors ${
                  selectedArtifact === artifact.id ? 'border-primary/30 shadow-[0_12px_28px_hsl(var(--primary)/0.14)]' : 'hover:border-primary/20'
                }`}
                onClick={() => setSelectedArtifact(artifact.id)}
              >
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-border bg-secondary px-2 text-[10px] font-semibold text-foreground">
                      {getTypeLabel(artifact.type)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[14px] font-semibold text-foreground leading-snug truncate">{artifact.name}</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{artifact.path}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-1.5 py-0.5 text-[10px] bg-secondary text-secondary-foreground rounded border border-border">
                      {getLanguageLabel(artifact.language)}
                    </span>
                    <span className="px-1.5 py-0.5 text-[10px] bg-secondary text-secondary-foreground rounded border border-border">
                      {artifact.type}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-2.5">
                  <span>{formatFileSize(artifact.size)}</span>
                  <span>{new Date(artifact.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="mb-2.5">
                  <p className="text-[11px] text-muted-foreground line-clamp-2 font-mono bg-secondary/40 p-2 rounded-xl leading-relaxed">
                    {(artifact.content || artifact.path).split('\n').slice(0, 2).join('\n')}
                    {(artifact.content || artifact.path).split('\n').length > 2 && '\n...'}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="lg:col-span-1">
          {selectedArtifactData ? (
            <div className="surface-card glass-frame p-4 sticky top-4">
              <div className="flex items-center gap-2.5 mb-3.5">
                <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-border bg-secondary px-2 text-[10px] font-semibold text-foreground">
                  {getTypeLabel(selectedArtifactData.type)}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[14px] font-semibold text-foreground leading-snug truncate">{selectedArtifactData.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] bg-secondary text-secondary-foreground rounded px-1.5 py-0.5 border border-border">
                      {getLanguageLabel(selectedArtifactData.language)}
                    </span>
                    <span className="text-[10px] bg-secondary text-secondary-foreground rounded px-1.5 py-0.5 border border-border">
                      {selectedArtifactData.type}
                    </span>
                  </div>
                </div>
              </div>

              <div className="surface-elevated p-3 mb-3.5">
                <p className="shell-section-label mb-2">Delivery view</p>
                <p className="text-[12px] text-foreground leading-6">
                  Inspect the output, open it directly, or copy the path to hand it off to another tool or teammate.
                </p>
              </div>

              <div className="surface-elevated p-3 mb-3.5">
                <p className="text-[11px] text-muted-foreground truncate mb-2">{selectedArtifactData.path}</p>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <p className="text-[11px] text-muted-foreground">{t('size')}</p>
                    <p className="text-[13px] font-semibold text-foreground mt-0.5">{formatFileSize(selectedArtifactData.size)}</p>
                  </div>
                  {selectedArtifactData.taskId && (
                    <div>
                      <p className="text-[11px] text-muted-foreground">{t('task')}</p>
                      <p className="text-[13px] font-semibold text-foreground mt-0.5">#{selectedArtifactData.taskId}</p>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-2.5">{new Date(selectedArtifactData.createdAt).toLocaleString()}</p>
              </div>

              <div className="mb-3.5">
                <h4 className="text-[12px] font-medium text-foreground mb-2">{t('contentPreview')}</h4>
                <div className="surface-elevated rounded-2xl p-3 max-h-96 overflow-y-auto shell-scroll">
                  {renderPreview(selectedArtifactData)}
                </div>
              </div>

              <div className="flex gap-2">
                <button className="btn-secondary text-[11px] h-7 px-2.5 flex-1" onClick={() => handleOpenArtifact(selectedArtifactData)}>
                  {t('open')}
                </button>
                <button className="btn-secondary text-[11px] h-7 px-2.5 flex-1" onClick={() => void handleCopyPath(selectedArtifactData.path)}>
                  {t('copyPath')}
                </button>
              </div>
            </div>
          ) : (
            <div className="surface-card p-6 text-center">
              <p className="text-[13px] text-muted-foreground">{t('selectArtifactToPreview')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
