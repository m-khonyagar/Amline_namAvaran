import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowLeft,
  Bell,
  ExternalLink,
  FilePenLine,
  FileStack,
  Scale,
  ScrollText,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../../hooks/useAuth';
import { apiClient } from '../../lib/api';
import { apiV1 } from '../../lib/apiPaths';
import { loadLeads } from '../../features/crm/crmService';
import { cn } from '../../lib/cn';

interface MetricsSummary {
  contracts_total: number;
  users_total: number;
  active_leads: number;
  contracts_today: number;
  audit_events_total: number;
}

interface OperationsPulse {
  unread_notifications: number;
  open_crm_leads: number;
  crm_by_status: Record<string, number>;
  contracts_flagged_legal: number;
  audit_events_last_24h: number;
}

interface AuditItem {
  id: string;
  user_id: string;
  action: string;
  entity: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

const CRM_STATUS_FA: Record<string, string> = {
  NEW: 'جدید',
  CONTACTED: 'تماس گرفته',
  QUALIFIED: 'واجد شرایط',
  NEGOTIATING: 'مذاکره',
  NEGOTIATION: 'مذاکره',
  PROPOSAL: 'پیشنهاد',
  LOST: 'از دست‌رفته',
  CONTRACTED: 'قرارداد بسته',
};

type StatKey =
  | 'contracts_today'
  | 'contracts_total'
  | 'users_total'
  | 'audit_events_total'
  | 'active_leads';

type StatConfig = {
  key: StatKey;
  label: string;
  Icon: typeof FileStack;
  accent: string;
};

const STAT_CONFIG: StatConfig[] = [
  {
    key: 'contracts_today',
    label: 'قراردادهای امروز',
    Icon: Sparkles,
    accent: 'from-blue-500/15 to-sky-500/5 text-blue-600 dark:from-blue-500/20 dark:to-transparent dark:text-blue-300',
  },
  {
    key: 'contracts_total',
    label: 'کل قراردادها',
    Icon: FileStack,
    accent: 'from-slate-500/12 to-slate-400/5 text-slate-700 dark:from-slate-400/15 dark:to-transparent dark:text-slate-200',
  },
  {
    key: 'users_total',
    label: 'کاربران',
    Icon: Users,
    accent: 'from-emerald-500/15 to-teal-500/5 text-emerald-700 dark:from-emerald-500/20 dark:to-transparent dark:text-emerald-300',
  },
  {
    key: 'active_leads',
    label: 'سرنخ‌های فعال',
    Icon: Target,
    accent: 'from-violet-500/15 to-purple-500/5 text-violet-700 dark:from-violet-500/20 dark:to-transparent dark:text-violet-300',
  },
  {
    key: 'audit_events_total',
    label: 'رویدادهای ممیزی',
    Icon: Activity,
    accent: 'from-amber-500/15 to-orange-500/5 text-amber-800 dark:from-amber-500/20 dark:to-transparent dark:text-amber-200',
  },
];

function OpsCard({
  title,
  value,
  hint,
  to,
  Icon,
}: {
  title: string;
  value: number | string;
  hint: string;
  to: string;
  Icon: typeof Bell;
}) {
  return (
    <Link
      to={to}
      className="group relative flex min-h-[120px] flex-col rounded-[var(--amline-radius-lg)] border border-[var(--amline-border)] bg-[var(--amline-surface)] p-4 shadow-[var(--amline-shadow-sm)] transition-all hover:border-[var(--amline-primary)]/25 hover:shadow-[var(--amline-shadow-md)] active:scale-[0.99] dark:border-slate-700 dark:bg-slate-900/40 sm:min-h-0"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-amline-md bg-[var(--amline-primary-muted)] text-[var(--amline-primary)] dark:bg-blue-950/50">
          <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
        </span>
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[var(--amline-fg-subtle)] opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
      </div>
      <p className="text-2xl font-extrabold tabular-nums text-[var(--amline-fg)]">{value}</p>
      <p className="mt-0.5 text-sm font-medium text-[var(--amline-fg)]">{title}</p>
      <p className="amline-caption mt-1">{hint}</p>
    </Link>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();

  const { data: metrics, isError: metricsError } = useQuery({
    queryKey: ['admin-metrics-summary'],
    queryFn: async () => {
      const res = await apiClient.get<MetricsSummary>(apiV1('admin/metrics/summary'));
      return res.data;
    },
  });

  const { data: pulse, isError: pulseError } = useQuery({
    queryKey: ['admin-metrics-operations'],
    queryFn: async () => {
      const res = await apiClient.get<OperationsPulse>(apiV1('admin/metrics/operations'));
      return res.data;
    },
  });

  const { data: recentAudit, isError: auditError } = useQuery({
    queryKey: ['admin-audit-recent-dashboard'],
    queryFn: async () => {
      const res = await apiClient.get<{ items: AuditItem[] }>(apiV1('admin/audit'), {
        params: { skip: 0, limit: 6 },
      });
      return res.data.items;
    },
    enabled: hasPermission('audit:read'),
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['crm-leads-dashboard'],
    queryFn: loadLeads,
  });
  const activeLeadsLocal = leads.filter((l) => l.status !== 'LOST' && l.status !== 'CONTRACTED').length;
  const activeLeads = metrics && !metricsError ? metrics.active_leads : activeLeadsLocal;

  function statValue(key: StatKey): string | number {
    if (!metrics || metricsError) return key === 'active_leads' ? activeLeads : '—';
    if (key === 'active_leads') return activeLeads;
    return metrics[key];
  }

  const funnelData = useMemo(() => {
    if (!pulse || pulseError || !pulse.crm_by_status) return [];
    return Object.entries(pulse.crm_by_status).map(([k, count]) => ({
      name: CRM_STATUS_FA[k] ?? k,
      count,
    }));
  }, [pulse, pulseError]);

  const showOps = pulse && !pulseError;
  const showFunnel = hasPermission('crm:read') && funnelData.length > 0;

  return (
    <div dir="rtl" className="space-y-10 p-1 sm:p-2">
      <header className="flex flex-col gap-4 border-b border-[var(--amline-border)] bg-gradient-to-l from-transparent via-[var(--amline-primary-muted)]/25 to-transparent pb-8 dark:border-slate-700 dark:via-blue-950/20 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="amline-page-eyebrow mb-2">داشبورد اجرایی</p>
          <h1 className="amline-display">خوش آمدید{user?.full_name ? `، ${user.full_name}` : ''}</h1>
          <p className="amline-body mt-2 max-w-2xl">
            نمای محصول، عملیات و بازاریابی در یک نگاه — شاخص‌های زیر از API مدیریت خوانده می‌شوند؛ برای جزئیات روی کارت‌های «تپش عملیات» بروید.
          </p>
          <p className="amline-caption mt-2">
            {new Date().toLocaleDateString('fa-IR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </header>

      <section aria-labelledby="metrics-heading">
        <h2 id="metrics-heading" className="amline-title mb-4">
          نمای کلی KPI
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {STAT_CONFIG.map(({ key, label, Icon, accent }) => (
            <div key={key} className="amline-stat-card group">
              <div
                className={cn(
                  'mb-4 flex h-11 w-11 items-center justify-center rounded-amline-md bg-gradient-to-br shadow-[var(--amline-shadow-sm)]',
                  accent
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
              </div>
              <p className="text-sm font-medium text-[var(--amline-fg-muted)]">{label}</p>
              <p className="mt-1 text-3xl font-extrabold tabular-nums tracking-tight text-[var(--amline-fg)]">
                {statValue(key)}
              </p>
              <div
                className="pointer-events-none absolute -left-8 -top-8 h-24 w-24 rounded-full bg-[var(--amline-primary)]/5 blur-2xl transition-opacity group-hover:opacity-100 dark:bg-blue-500/10"
                aria-hidden
              />
            </div>
          ))}
        </div>
      </section>

      {showOps ? (
        <section aria-labelledby="pulse-heading">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <h2 id="pulse-heading" className="amline-title">
              تپش عملیات
            </h2>
            <p className="max-w-md text-sm text-[var(--amline-fg-muted)] max-sm:text-xs">
              اولویت‌های امروز تیم: اعلان‌ها، سرنخ‌ها، قراردادهای پرچم‌خورده حقوقی، و فعالیت ممیزی ۲۴ ساعت اخیر.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {hasPermission('notifications:read') ? (
              <OpsCard
                title="اعلان خوانده‌نشده"
                value={pulse.unread_notifications}
                hint="مرکز اعلان‌ها"
                to="/notifications"
                Icon={Bell}
              />
            ) : null}
            {hasPermission('crm:read') ? (
              <OpsCard
                title="سرنخ باز CRM"
                value={pulse.open_crm_leads}
                hint="قیف فروش و پیگیری"
                to="/crm"
                Icon={Target}
              />
            ) : null}
            {hasPermission('legal:read') ? (
              <OpsCard
                title="قرارداد با پرچم حقوقی (mock)"
                value={pulse.contracts_flagged_legal}
                hint="صف تأیید حقوقی — DB ممکن است جدا باشد"
                to="/contracts/legal-queue"
                Icon={Scale}
              />
            ) : null}
            {hasPermission('audit:read') ? (
              <OpsCard
                title="رویداد ممیزی ۲۴ ساعت"
                value={pulse.audit_events_last_24h}
                hint="لاگ کامل ممیزی"
                to="/admin/audit"
                Icon={ScrollText}
              />
            ) : null}
          </div>
        </section>
      ) : null}

      {showFunnel ? (
        <section aria-labelledby="funnel-heading">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="funnel-heading" className="amline-title">
              قیف سرنخ (مرحله)
            </h2>
            <Link
              to="/crm"
              className="inline-flex items-center gap-1 text-sm font-medium text-[var(--amline-primary)] hover:underline"
            >
              باز کردن CRM
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
          <div className="rounded-[var(--amline-radius-lg)] border border-[var(--amline-border)] bg-[var(--amline-surface)] p-2 shadow-[var(--amline-shadow-sm)] dark:border-slate-700 dark:bg-slate-900/40 sm:p-4">
            <div className="overflow-x-auto overscroll-x-contain" dir="ltr">
              <div className="h-56 w-full min-w-[280px] sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-[var(--amline-border)] opacity-40" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} height={40} className="fill-[var(--amline-fg-muted)]" />
                  <YAxis allowDecimals={false} width={32} tick={{ fontSize: 10 }} className="fill-[var(--amline-fg-muted)]" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 'var(--amline-radius-md)',
                      border: '1px solid var(--amline-border)',
                    }}
                    labelStyle={{ direction: 'rtl' }}
                  />
                  <Bar dataKey="count" fill="var(--amline-primary)" radius={[6, 6, 0, 0]} name="تعداد" />
                </BarChart>
              </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {hasPermission('audit:read') && recentAudit && !auditError ? (
        <section aria-labelledby="audit-recent-heading">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="audit-recent-heading" className="amline-title">
              آخرین رویدادهای ممیزی
            </h2>
            <Link
              to="/admin/audit"
              className="text-sm font-medium text-[var(--amline-primary)] hover:underline"
            >
              مشاهده همه
            </Link>
          </div>
          <div className="overflow-x-auto overscroll-x-contain rounded-[var(--amline-radius-lg)] border border-[var(--amline-border)] bg-[var(--amline-surface)] shadow-[var(--amline-shadow-sm)] dark:border-slate-700 dark:bg-slate-900/40">
            <table className="min-w-[520px] w-full text-right text-sm sm:min-w-full">
              <thead className="border-b border-[var(--amline-border)] bg-[var(--amline-surface-muted)]/50 dark:border-slate-700 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 font-medium text-[var(--amline-fg-muted)]">زمان</th>
                  <th className="px-4 py-3 font-medium text-[var(--amline-fg-muted)]">عمل</th>
                  <th className="px-4 py-3 font-medium text-[var(--amline-fg-muted)]">موجودیت</th>
                </tr>
              </thead>
              <tbody>
                {recentAudit.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--amline-border)] last:border-0 dark:border-slate-800">
                    <td className="whitespace-nowrap px-4 py-2.5 text-[var(--amline-fg-muted)]">
                      {new Date(row.created_at).toLocaleString('fa-IR')}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-[var(--amline-fg)]">{row.action}</td>
                    <td className="px-4 py-2.5 text-[var(--amline-fg-muted)]">{row.entity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="quick-heading">
        <h2 id="quick-heading" className="amline-title mb-4">
          دسترسی سریع
        </h2>
        {hasPermission('contracts:write') ||
        hasPermission('crm:read') ||
        hasPermission('users:read') ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {hasPermission('contracts:write') ? (
              <button
                type="button"
                onClick={() => navigate('/contracts/wizard')}
                className="group amline-quick-tile text-center"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--amline-primary-muted)] text-[var(--amline-primary)] transition-transform duration-200 group-hover:scale-105">
                  <FilePenLine className="h-6 w-6" strokeWidth={2} />
                </span>
                <span className="text-sm font-semibold text-[var(--amline-fg)]">قرارداد جدید</span>
                <span className="amline-caption flex items-center gap-1">
                  شروع ویزارد
                  <ArrowLeft className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                </span>
              </button>
            ) : null}
            {hasPermission('crm:read') ? (
              <button type="button" onClick={() => navigate('/crm')} className="group amline-quick-tile text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/10 text-violet-600 transition-transform duration-200 group-hover:scale-105 dark:text-violet-300">
                  <Target className="h-6 w-6" strokeWidth={2} />
                </span>
                <span className="text-sm font-semibold text-[var(--amline-fg)]">مدیریت CRM</span>
                <span className="amline-caption">سرنخ و فرصت‌ها</span>
              </button>
            ) : null}
            {hasPermission('users:read') ? (
              <button type="button" onClick={() => navigate('/users')} className="group amline-quick-tile text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 transition-transform duration-200 group-hover:scale-105 dark:text-emerald-300">
                  <Users className="h-6 w-6" strokeWidth={2} />
                </span>
                <span className="text-sm font-semibold text-[var(--amline-fg)]">کاربران</span>
                <span className="amline-caption">اعضا و نقش‌ها</span>
              </button>
            ) : null}
          </div>
        ) : (
          <p className="amline-body rounded-[var(--amline-radius-lg)] border border-dashed border-[var(--amline-border)] bg-[var(--amline-surface-muted)]/40 px-4 py-6 text-center dark:border-slate-600">
            برای میانبرهای این بخش، یکی از مجوزهای قرارداد، CRM یا کاربران لازم است. از منوی کناری یا{' '}
            <kbd className="rounded border border-[var(--amline-border)] bg-[var(--amline-surface)] px-1 font-mono text-xs">
              Ctrl+K
            </kbd>{' '}
            استفاده کنید.
          </p>
        )}
      </section>
    </div>
  );
}
