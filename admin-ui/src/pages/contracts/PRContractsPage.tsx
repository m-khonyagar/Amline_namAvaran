import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, ListChecks, PenLine } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function PRContractsPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('contracts:write');
  return (
    <div dir="rtl" className="mx-auto max-w-3xl space-y-8 p-4 sm:p-6">
      <div>
        <p className="amline-page-eyebrow mb-2">قرارداد</p>
        <h1 className="amline-display text-2xl md:text-3xl">رهن و اجاره</h1>
        <p className="amline-body mt-3">
          قراردادهای نوع رهن و اجاره (PROPERTY_RENT) را از اینجا مدیریت کنید: ثبت جدید، لیست و صف
          بررسی حقوقی.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {canCreate ? (
          <Link
            to="/contracts/wizard"
            className="group flex flex-col rounded-[var(--amline-radius-lg)] border border-[var(--amline-border)] bg-[var(--amline-surface)] p-5 shadow-[var(--amline-shadow-sm)] transition-all hover:border-[var(--amline-primary)]/35 hover:shadow-[var(--amline-shadow-md)] dark:border-slate-700"
          >
            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-amline-md bg-[var(--amline-primary-muted)] text-[var(--amline-primary)]">
              <PenLine className="h-5 w-5" strokeWidth={2} aria-hidden />
            </span>
            <span className="font-semibold text-[var(--amline-fg)]">قرارداد جدید</span>
            <span className="amline-caption mt-1 flex-1">شروع ویزارد رهن و اجاره</span>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--amline-primary)]">
              ادامه
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden />
            </span>
          </Link>
        ) : (
          <div className="flex flex-col rounded-[var(--amline-radius-lg)] border border-dashed border-[var(--amline-border)] bg-[var(--amline-surface-muted)]/50 p-5 dark:border-slate-600">
            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-amline-md bg-slate-500/10 text-[var(--amline-fg-muted)]">
              <PenLine className="h-5 w-5" strokeWidth={2} aria-hidden />
            </span>
            <span className="font-semibold text-[var(--amline-fg-muted)]">قرارداد جدید</span>
            <span className="amline-caption mt-1">برای ثبت قرارداد به مجوز «contracts:write» نیاز دارید.</span>
          </div>
        )}

        <Link
          to="/contracts?type=PROPERTY_RENT"
          className="group flex flex-col rounded-[var(--amline-radius-lg)] border border-[var(--amline-border)] bg-[var(--amline-surface)] p-5 shadow-[var(--amline-shadow-sm)] transition-all hover:border-[var(--amline-primary)]/35 hover:shadow-[var(--amline-shadow-md)] dark:border-slate-700"
        >
          <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-amline-md bg-slate-500/10 text-slate-700 dark:text-slate-200">
            <ListChecks className="h-5 w-5" strokeWidth={2} aria-hidden />
          </span>
          <span className="font-semibold text-[var(--amline-fg)]">لیست قراردادها</span>
          <span className="amline-caption mt-1 flex-1">فقط قراردادهای رهن و اجاره</span>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--amline-primary)]">
            مشاهده لیست
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden />
          </span>
        </Link>

        <Link
          to="/contracts/legal-queue"
          className="group flex flex-col rounded-[var(--amline-radius-lg)] border border-[var(--amline-border)] bg-[var(--amline-surface)] p-5 shadow-[var(--amline-shadow-sm)] transition-all hover:border-[var(--amline-primary)]/35 hover:shadow-[var(--amline-shadow-md)] dark:border-slate-700 sm:col-span-2"
        >
          <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-amline-md bg-amber-500/10 text-amber-800 dark:text-amber-200">
            <FileText className="h-5 w-5" strokeWidth={2} aria-hidden />
          </span>
          <span className="font-semibold text-[var(--amline-fg)]">صف حقوقی</span>
          <span className="amline-caption mt-1">
            بررسی و تأیید قراردادها توسط تیم حقوقی (نیاز به مجوز جداگانه)
          </span>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--amline-primary)]">
            رفتن به صف
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden />
          </span>
        </Link>
      </div>

      <p className="amline-caption text-center">
        <Link to="/contracts" className="text-[var(--amline-primary)] underline-offset-2 hover:underline">
          همه انواع قرارداد
        </Link>
      </p>
    </div>
  );
}
