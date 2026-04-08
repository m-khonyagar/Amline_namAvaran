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
      <header className="border-b border-[var(--amline-border)] bg-[var(--amline-surface)] px-4 py-3 shadow-[var(--amline-shadow-sm)] dark:border-slate-700">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-bold text-[var(--amline-primary)]">اَملاین · مشاور</div>
            <p className="amline-caption mt-0.5">
              {user?.full_name} — سطح {user?.verification_tier ?? '—'}
            </p>
          </div>
          <nav className="flex flex-wrap gap-1" aria-label="ناوبری اصلی">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  cn(
                    'min-h-10 rounded-[var(--amline-radius-md)] px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--amline-ring)]',
                    isActive
                      ? 'bg-[var(--amline-primary-muted)] font-semibold text-[var(--amline-primary)]'
                      : 'text-[var(--amline-fg-muted)] hover:bg-[var(--amline-surface-muted)] dark:hover:bg-slate-800/60'
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <button
            type="button"
            className="min-h-10 rounded-[var(--amline-radius-md)] border border-[var(--amline-border)] bg-[var(--amline-surface)] px-3 py-1.5 text-sm font-medium text-[var(--amline-fg-muted)] transition hover:bg-[var(--amline-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--amline-ring)] dark:border-slate-700"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            خروج
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}
