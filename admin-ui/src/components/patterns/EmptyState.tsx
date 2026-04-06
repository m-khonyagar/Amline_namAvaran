import type { ReactNode } from 'react'

type Props = {
  title: string
  description?: string
  icon?: string
  action?: ReactNode
}

export function EmptyState({ title, description, icon = '📭', action }: Props) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--amline-border)] bg-[var(--amline-surface-muted)]/40 px-6 py-12 text-center dark:border-slate-600"
      role="status"
    >
      <span className="text-3xl opacity-80" aria-hidden>
        {icon}
      </span>
      <p className="mt-3 text-base font-medium text-[var(--amline-fg)]">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-[var(--amline-fg-muted)]">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
