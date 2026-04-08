import { useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { EXPLICIT_FULL_DEV_PERMISSIONS, isDevBypassEnv } from '../../lib/permissions';
import { toast } from 'sonner';
import { setCookie } from '../../lib/cookies';
import { CookieNames } from '../../lib/cookies';
import { ThemeToggle } from '../../components/ThemeToggle';
import { AmlineLogo } from '../../components/AmlineLogo';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';

export default function LoginPage() {
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [loading, setLoading] = useState(false);
  const { login, sendOtp } = useAuth();
  const navigate = useNavigate();
  const isDevBypassEnabled = isDevBypassEnv();

  const handleDevLogin = () => {
    const mockUser = {
      id: 'dev-001',
      mobile: '09120000000',
      full_name: 'کاربر آزمایشی',
      role: 'admin',
      role_id: 'role-admin',
      permissions: [...EXPLICIT_FULL_DEV_PERMISSIONS],
    };
    setCookie(CookieNames.ACCESS_TOKEN, 'dev-token-12345', 1);
    setCookie(CookieNames.USER, JSON.stringify(mockUser), 1);
    toast.success('ورود آزمایشی موفق');
    navigate('/dashboard');
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile || mobile.length !== 11) {
      toast.error('لطفاً شماره موبایل ۱۱ رقمی و صحیح وارد کنید (مثلاً 09121234567)');
      return;
    }

    setLoading(true);
    const result = await sendOtp(mobile);
    setLoading(false);

    if (result.success) {
      setStep('otp');
      toast.success('کد تأیید به شماره شما ارسال شد');
    } else {
      toast.error(result.message || 'خطا در ارسال کد');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 4 || otp.length > 6) {
      toast.error('کد تأیید باید بین ۴ تا ۶ رقم باشد؛ دوباره بررسی کنید');
      return;
    }

    setLoading(true);
    const result = await login(mobile, otp);
    setLoading(false);

    if (result.success) {
      toast.success('خوش آمدید!');
      navigate('/dashboard');
    } else {
      toast.error(result.message || 'خطا در ورود');
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-[var(--amline-bg)] safe-pb lg:min-h-screen lg:flex-row">
      <div
        className="pointer-events-none absolute inset-0 bg-[var(--amline-bg-mesh)] opacity-90"
        aria-hidden
      />
      <section
        className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-gradient-to-br from-[var(--amline-primary)] via-[#1e40af] to-[var(--amline-accent)] px-12 py-14 text-white lg:flex xl:px-16"
        aria-hidden
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.06%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-40"
        />
        <div className="relative z-10 max-w-md">
          <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-2xl font-extrabold shadow-lg backdrop-blur-sm">
            ا
          </div>
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight">اَملاین</h2>
          <p className="mt-4 text-lg leading-relaxed text-blue-100/95">
            مدیریت قرارداد، CRM و عملیات املاک در یک پنل یکپارچه، امن و سریع.
          </p>
        </div>
        <ul className="relative z-10 space-y-4 text-sm text-blue-100/90">
          <li className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 shrink-0 text-teal-200" strokeWidth={2} />
            احراز هویت چندمرحله‌ای و کنترل دسترسی نقش‌محور
          </li>
          <li className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 shrink-0 text-teal-200" strokeWidth={2} />
            رابط فارسی و راست‌به‌چپ بهینه‌شده برای تیم شما
          </li>
        </ul>
      </section>

      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-12 lg:py-10">
        <div className="absolute end-4 top-[max(1rem,env(safe-area-inset-top,0px))] z-10 sm:end-6 lg:end-8">
          <ThemeToggle />
        </div>

        <div className="relative w-full max-w-md pb-[env(safe-area-inset-bottom,0px)]">
          <div className="mb-6 text-center lg:hidden">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-amline-lg bg-gradient-to-br from-[var(--amline-primary)] to-[var(--amline-accent)] text-lg font-extrabold text-white shadow-[var(--amline-shadow-md)]">
              ا
            </div>
            <p className="text-xl font-extrabold text-[var(--amline-primary)]">اَملاین</p>
            <p className="amline-caption mt-1">پنل مدیریت</p>
          </div>

          <Card className="overflow-hidden border-[var(--amline-border)] shadow-[var(--amline-shadow-lg)] ring-1 ring-black/[0.04] dark:border-slate-700 dark:ring-white/[0.06]">
            <CardHeader className="space-y-1 border-0 pb-2 text-center lg:text-right">
              <CardTitle className="amline-display text-[var(--amline-fg)] lg:text-2xl">ورود</CardTitle>
              <CardDescription className="text-base text-[var(--amline-fg-muted)]">
                ورود به پنل مدیریت با شماره موبایل
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
              {step === 'mobile' ? (
                <form onSubmit={handleSendOtp} className="space-y-5" noValidate>
                  <Input
                    label="شماره موبایل"
                    name="mobile"
                    type="tel"
                    value={mobile}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setMobile(e.target.value.replace(/\D/g, '').slice(0, 11))
                    }
                    placeholder="09121234567"
                    hint="۱۱ رقم با پیش‌شماره ۰۹ وارد کنید"
                    dir="ltr"
                    className="text-left"
                    autoComplete="tel"
                  />
                  <Button type="submit" className="w-full shadow-[var(--amline-shadow-sm)]" size="lg" loading={loading} disabled={loading}>
                    ارسال کد تأیید
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleLogin} className="space-y-5" noValidate>
                  <Input
                    label="کد تأیید"
                    name="otp"
                    type="text"
                    value={otp}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                    }
                    placeholder="••••••"
                    hint={`کد ارسال‌شده به ${mobile}`}
                    dir="ltr"
                    className="text-center text-2xl tracking-[0.4em]"
                    maxLength={6}
                    autoComplete="one-time-code"
                  />
                  <Button type="submit" className="w-full shadow-[var(--amline-shadow-sm)]" size="lg" loading={loading} disabled={loading}>
                    ورود
                  </Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={() => setStep('mobile')}>
                    تغییر شماره موبایل
                  </Button>
                </form>
              )}

              <p className="text-center text-xs text-[var(--amline-fg-subtle)]">
                © ۱۴۰۳ اَملاین — تمامی حقوق محفوظ است
              </p>

              {isDevBypassEnabled && (
                <div className="border-t border-dashed border-[var(--amline-border)] pt-4 dark:border-slate-600">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-amber-300 text-amber-800 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-950/50"
                    onClick={handleDevLogin}
                  >
                    ورود آزمایشی (فقط توسعه)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
