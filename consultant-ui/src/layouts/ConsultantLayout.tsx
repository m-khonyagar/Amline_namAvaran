import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useConsultantAuth } from '../hooks/useConsultantAuth';
import { cn } from '../lib/cn';

const nav = [
  { to: '/dashboard', label: 'داشبورد' },
  { to: '/dossier', label: 'پرونده و تأیید' },
  { to: '/leads', label: 'لیدهای من' },
  { to: '/benefits', label: 'مزایا و اعتبار' },
];

export default function ConsultantLayout() {
  const { user, logout } = useConsultantAuth();
  const navigate = useNavigate();

  return (
    <div dir="rtl" className="min-h-screen bg-[var(--amline-bg)] text-[var(--amline-fg)]">
      <header className="border-b border-[var(--amline-border)] bg-[var(--amline-surface)] px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-bold text-[var(--amline-primary)]">اَملاین · مشاور</div>
            <div className="text-xs text-[var(--amline-fg-muted)]">
              {user?.full_name} — سطح {user?.verification_tier ?? '—'}
            </div>
          </div>
          <nav className="flex flex-wrap gap-1">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-teal-100 font-semibold text-teal-900 dark:bg-teal-950 dark:text-teal-100'
                      : 'text-[var(--amline-fg-muted)] hover:bg-slate-100 dark:hover:bg-slate-800'
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <button
            type="button"
            className="rounded-lg border border-[var(--amline-border)] px-3 py-1.5 text-sm"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            خروج
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4">
        <Outlet />
      </main>
    </div>
  );
}
