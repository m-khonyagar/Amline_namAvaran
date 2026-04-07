import { useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'sonner';
import { setCookie } from '../../lib/cookies';
import { CookieNames } from '../../lib/cookies';
import { ThemeToggle } from '../../components/ThemeToggle';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import {
  DEV_FIXED_TEST_MOBILE,
  DEV_FIXED_TEST_OTP,
  isAdminDevBypassEnabled,
} from '../../lib/devLocalAuth';

export default function LoginPage() {
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [loading, setLoading] = useState(false);
  const { login, sendOtp } = useAuth();
  const navigate = useNavigate();
  const isDevBypassEnabled = isAdminDevBypassEnabled();

  const handleDevLogin = () => {
    const mockUser = {
      id: 'dev-001',
      mobile: DEV_FIXED_TEST_MOBILE,
      full_name: 'کاربر آزمایشی',
      role: 'admin',
      role_id: 'role-admin',
      permissions: [
        'users:read',
        'users:write',
        'contracts:read',
        'contracts:write',
        'ads:read',
        'ads:write',
        'wallets:read',
        'wallets:write',
        'settings:read',
        'settings:write',
        'audit:read',
        'roles:read',
        'roles:write',
        'reports:read',
        'notifications:read',
        'crm:read',
        'crm:write',
      ],
    };
    setCookie(CookieNames.ACCESS_TOKEN, 'dev-token-12345', 1);
    setCookie(CookieNames.USER, JSON.stringify(mockUser), 1);
    toast.success('ورود آزمایشی موفق');
    navigate('/dashboard');
  };

  const handleDevTrialSendOtp = async () => {
    setLoading(true);
    setMobile(DEV_FIXED_TEST_MOBILE);
    const result = await sendOtp(DEV_FIXED_TEST_MOBILE);
    setLoading(false);
    if (result.success) {
      setStep('otp');
      setOtp('');
      toast.success('کد برای شماره تست ارسال شد؛ با ۱۱۱۱۱ یا دکمهٔ تأیید آزمایشی وارد شوید.');
    } else {
      toast.error(result.message || 'خطا در ارسال کد', result.hint ? { description: result.hint } : undefined);
    }
  };

  const handleDevTrialVerifyOtp = async () => {
    setLoading(true);
    const result = await login(DEV_FIXED_TEST_MOBILE, DEV_FIXED_TEST_OTP);
    setLoading(false);
    if (result.success) {
      toast.success('ورود آزمایشی با OTP انجام شد.');
      navigate('/dashboard');
    } else {
      toast.error(result.message || 'خطا در ورود', result.hint ? { description: result.hint } : undefined);
    }
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
      toast.error(result.message || 'خطا در ارسال کد', result.hint ? { description: result.hint } : undefined);
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
      toast.error(result.message || 'خطا در ورود', result.hint ? { description: result.hint } : undefined);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-[var(--amline-bg)] to-[var(--amline-primary-muted)] px-4 py-10 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="relative w-full max-w-md">
        <div className="absolute left-0 top-0 z-10 sm:left-2 sm:top-2">
          <ThemeToggle />
        </div>

        <Card className="overflow-hidden shadow-amline-lg ring-1 ring-black/5 dark:ring-white/10">
          <CardHeader className="space-y-1 border-0 pb-2 text-center">
            <CardTitle className="amline-display text-[var(--amline-primary)]">اَملاین</CardTitle>
            <CardDescription className="text-base">ورود به پنل مدیریت</CardDescription>
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
                <Button type="submit" className="w-full" size="lg" loading={loading} disabled={loading}>
                  ارسال کد تأیید
                </Button>
                {isDevBypassEnabled ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-amber-300 text-amber-800 dark:border-amber-700 dark:text-amber-300"
                    loading={loading}
                    disabled={loading}
                    onClick={() => void handleDevTrialSendOtp()}
                  >
                    ارسال کد آزمایشی (۰۹۱۰۰۰۰۰۰۰۰۰)
                  </Button>
                ) : null}
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
                <Button type="submit" className="w-full" size="lg" loading={loading} disabled={loading}>
                  ورود
                </Button>
                {isDevBypassEnabled ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-amber-300 text-amber-800 dark:border-amber-700 dark:text-amber-300"
                    loading={loading}
                    disabled={loading}
                    onClick={() => void handleDevTrialVerifyOtp()}
                  >
                    تأیید آزمایشی توسعه ({DEV_FIXED_TEST_OTP})
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setStep('mobile')}
                >
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
                  ورود آزمایشی بدون OTP (فقط توسعه)
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
