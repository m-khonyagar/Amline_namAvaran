import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '../lib/api';
import { useConsultantAuth, type ConsultantUser } from '../hooks/useConsultantAuth';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setSession } = useConsultantAuth();
  const [form, setForm] = useState({
    full_name: '',
    mobile: '',
    national_code: '',
    license_no: '',
    city: '',
    agency_name: '',
  });

  const m = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<{ access_token: string; user: ConsultantUser }>('/consultant/auth/register', form);
      return res.data;
    },
    onSuccess: (data) => {
      setSession(data.access_token, data.user);
      toast.success('ثبت‌نام انجام شد؛ پرونده برای بررسی کارشناس ارسال شد');
      navigate('/dossier');
    },
    onError: () => toast.error('اطلاعات ناقص است'),
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div dir="rtl" className="min-h-screen bg-[var(--amline-bg)] p-4 py-10">
      <div className="mx-auto max-w-lg rounded-2xl border border-[var(--amline-border)] bg-[var(--amline-surface)] p-8 shadow-lg">
        <h1 className="amline-display mb-1 text-[var(--amline-primary)]">ثبت‌نام مشاور املاین</h1>
        <p className="amline-body mb-6">
          پس از ارسال، کارشناسان املاین پروندهٔ نظام‌مهندسی و هویت را بررسی می‌کنند (همگام با پنل ادمین).
        </p>
        <div className="space-y-3">
          {(
            [
              ['full_name', 'نام و نام خانوادگی'],
              ['mobile', 'موبایل'],
              ['national_code', 'کد ملی'],
              ['license_no', 'شماره پروانه / نظام کسب'],
              ['city', 'شهر فعالیت'],
              ['agency_name', 'نام آژانس (اختیاری)'],
            ] as const
          ).map(([k, label]) => (
            <div key={k}>
              <label className="mb-1 block text-sm font-medium">{label}</label>
              <input
                className="w-full min-h-11 rounded-[var(--amline-radius-md)] border border-[var(--amline-border)] bg-[var(--amline-surface)] px-3.5 py-2 text-sm text-[var(--amline-fg)] outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--amline-ring)] dark:border-slate-700 dark:bg-slate-900/40"
                value={form[k]}
                onChange={set(k)}
                dir={k === 'mobile' ? 'ltr' : 'rtl'}
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          disabled={m.isPending}
          onClick={() => m.mutate()}
          className="mt-6 w-full min-h-11 rounded-[var(--amline-radius-md)] bg-[var(--amline-primary)] py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--amline-primary-hover)] disabled:opacity-50"
        >
          ارسال برای بررسی
        </button>
        <p className="mt-4 text-center text-sm">
          <Link to="/login" className="text-[var(--amline-primary)]">
            بازگشت به ورود
          </Link>
        </p>
      </div>
    </div>
  );
}
