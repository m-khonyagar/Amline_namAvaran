type Props = { rows?: number; columns?: number }

export function TableSkeleton({ rows = 6, columns = 5 }: Props) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="animate-pulse">
        <div className="grid gap-0 border-b border-gray-100 bg-gray-50 dark:border-slate-800 dark:bg-slate-800/80" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className="h-10 px-4 py-3">
              <div className="h-3 rounded bg-gray-200 dark:bg-slate-600" />
            </div>
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="grid gap-0 border-b border-gray-50 dark:border-slate-800"
            style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
          >
            {Array.from({ length: columns }).map((_, c) => (
              <div key={c} className="h-12 px-4 py-3">
                <div className="h-3 rounded bg-gray-100 dark:bg-slate-700" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
