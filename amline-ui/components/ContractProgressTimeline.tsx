'use client'

import clsx from 'clsx'
import type { ProgressRow } from '../lib/contractProgressTimeline'

function TimelineDot({ state }: { state: ProgressRow['state'] }) {
  return (
    <span
      className={clsx(
        'relative z-[1] mt-1.5 h-3 w-3 shrink-0 rounded-full border-2 border-[var(--amline-surface)] shadow-sm',
        state === 'done' && 'bg-[var(--amline-success)]',
        state === 'active' && 'bg-[var(--amline-primary)]',
        state === 'pending' && 'bg-[var(--amline-surface-muted)] ring-1 ring-inset ring-[var(--amline-border)]'
      )}
      aria-hidden
    />
  )
}

function TimelineStem({ prevDone }: { prevDone: boolean }) {
  return (
    <span
      className={clsx(
        'my-0.5 block w-0.5 min-h-10 shrink-0 rounded-full',
        prevDone ? 'bg-[var(--amline-success)]/45' : 'bg-[var(--amline-border)]'
      )}
      aria-hidden
    />
  )
}

export function ContractProgressTimeline({ rows }: { rows: ProgressRow[] }) {
  return (
    <section
      className="rounded-amline border border-[var(--amline-border)] bg-[var(--amline-surface)] p-4 shadow-[var(--amline-shadow-sm)] dark:border-slate-700 dark:bg-[var(--amline-surface-elevated)] sm:p-5"
      aria-label="پیشرفت قرارداد"
    >
      <h2 className="amline-title mb-4 text-base text-[var(--amline-fg)]">پیشرفت قرارداد</h2>
      <ol className="m-0 list-none p-0">
        {rows.map((row, i) => {
          const isLast = i === rows.length - 1
          return (
            <li key={row.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                <TimelineDot state={row.state} />
                {!isLast ? <TimelineStem prevDone={row.state === 'done'} /> : null}
              </div>
              <div className={clsx('min-w-0 flex-1', !isLast && 'pb-1')}>
                {row.dateLine ? (
                  <p className="amline-caption text-[var(--amline-fg-subtle)]">{row.dateLine}</p>
                ) : null}
                <p
                  className={clsx(
                    'text-sm font-medium leading-snug text-[var(--amline-fg)]',
                    row.state === 'pending' && 'text-[var(--amline-fg-muted)]'
                  )}
                >
                  {row.title}
                </p>
                {row.badge ? (
                  <span className="mt-1.5 inline-flex items-center rounded-full bg-[var(--amline-success-muted)] px-2.5 py-0.5 text-xs font-semibold text-[var(--amline-success)]">
                    {row.badge}
                  </span>
                ) : null}
                {row.hint ? (
                  <p className="mt-1.5 text-xs leading-relaxed text-[var(--amline-fg-muted)]">{row.hint}</p>
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
