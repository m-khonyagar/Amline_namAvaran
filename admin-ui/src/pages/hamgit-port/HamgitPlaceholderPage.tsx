type Props = {
  title: string
  description: string
  endpoints: string[]
  hamgitPaths?: string[]
}

export function HamgitPlaceholderPage({ title, description, endpoints, hamgitPaths = [] }: Props) {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--amline-fg)]">{title}</h1>
        <p className="mt-2 text-sm text-[var(--amline-fg-muted)]">{description}</p>
      </div>
      {hamgitPaths.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-medium text-[var(--amline-fg)]">مسیرهای UI قدیم (Hamgit)</h2>
          <ul className="list-inside list-disc space-y-1 font-mono text-xs text-slate-600 dark:text-slate-400">
            {hamgitPaths.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      ) : null}
      <section>
        <h2 className="mb-2 text-sm font-medium text-[var(--amline-fg)]">APIهای مرتبط (mock / backend)</h2>
        <ul className="space-y-1 font-mono text-xs text-slate-600 dark:text-slate-400">
          {endpoints.map((e) => (
            <li key={e} className="rounded bg-slate-100 px-2 py-1 dark:bg-slate-800">
              {e}
            </li>
          ))}
        </ul>
      </section>
      <p className="text-xs text-[var(--amline-fg-muted)]">
        جزئیات فیچر و وضعیت parity:{' '}
        <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">docs/HAMGIT_FEATURES_PARITY.md</code>
      </p>
    </div>
  )
}
