import type { ReactNode } from 'react';

type EmptyStateProps = {
  title: string;
  description: string;
  /** دکمه یا لینک اقدام بعدی */
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-[var(--amline-radius-lg)] border border-dashed border-[var(--amline-border)] bg-[var(--amline-surface-muted)]/50 px-6 py-12 text-center dark:bg-slate-900/20"
      role="status"
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--amline-primary-muted)] text-[var(--amline-primary)]" aria-hidden>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6M9 13h6M9 17h4" />
        </svg>
      </div>
      <h2 className="amline-title mb-2">{title}</h2>
      <p className="amline-body max-w-md">{description}</p>
      {action ? <div className="mt-6 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}
