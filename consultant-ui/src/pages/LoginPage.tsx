import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '../lib/api';
import { useConsultantAuth, type ConsultantUser } from '../hooks/useConsultantAuth';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setSession } = useConsultantAuth();
  const [mobile, setMobile] = useState('09121112233');

  const m = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<{ access_token: string; user: ConsultantUser }>('/consultant/auth/login', {
        mobile,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setSession(data.access_token, data.user);
      toast.success('خوش آمدید');
      navigate('/dashboard');
    },
    onError: () => toast.error('موبایل ثبت نشده یا خطای سرور'),
  });

  return (
    <div dir="rtl" className="flex min-h-screen flex-col items-center justify-center bg-[var(--amline-bg)] p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--amline-border)] bg-[var(--amline-surface)] p-8 shadow-lg">
        <h1 className="amline-display mb-1 text-[var(--amline-primary)]">ورود مشاور املاک</h1>
        <p className="amline-body mb-6">
          همان شماره‌ای که با آن ثبت‌نام کرده‌اید. در حالت MSW نمونه: 09121112233
        </p>
        <label className="mb-2 block text-sm font-medium">موبایل</label>
        <input
          className="mb-4 w-full min-h-11 rounded-[var(--amline-radius-md)] border border-[var(--amline-border)] bg-[var(--amline-surface)] px-3.5 py-2 text-sm text-[var(--amline-fg)] outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--amline-ring)] dark:border-slate-700 dark:bg-slate-900/40"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          dir="ltr"
        />
        <button
          type="button"
          disabled={m.isPending}
          onClick={() => m.mutate()}
          className="w-full min-h-11 rounded-[var(--amline-radius-md)] bg-[var(--amline-primary)] py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--amline-primary-hover)] disabled:opacity-50"
        >
          {m.isPending ? '…' : 'ورود'}
        </button>
        <p className="mt-4 text-center text-sm text-[var(--amline-fg-muted)]">
          حساب ندارید؟{' '}
          <Link to="/register" className="font-medium text-[var(--amline-primary)]">
            ثبت‌نام
          </Link>
        </p>
      </div>
    </div>
  );
}
