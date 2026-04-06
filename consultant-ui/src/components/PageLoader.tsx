export function PageLoader({ message = 'در حال بارگذاری…' }: { message?: string }) {
  return (
    <div className="flex min-h-[30vh] flex-col items-center justify-center gap-4 py-16" role="status" aria-live="polite">
      <div
        className="h-10 w-10 animate-spin rounded-full border-[3px] border-[var(--amline-border)] border-t-[var(--amline-primary)]"
        aria-hidden
      />
      <p className="amline-body text-center">{message}</p>
    </div>
  );
}
