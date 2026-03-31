import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { toast } from 'sonner'
import { setCookie } from '../../lib/cookies'
import { CookieNames } from '../../lib/cookies'

export default function LoginPage() {
  const [mobile, setMobile] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile')
  const [loading, setLoading] = useState(false)
  const { login, sendOtp } = useAuth()
  const navigate = useNavigate()

  // ورود آزمایشی بدون نیاز به backend
  const handleDevLogin = () => {
    const mockUser = {
      id: 'dev-001',
      mobile: '09120000000',
      full_name: 'کاربر آزمایشی',
      role: 'admin',
      permissions: [
        'users:read', 'users:write',
        'contracts:read', 'contracts:write',
        'ads:read', 'ads:write',
        'wallets:read', 'wallets:write',
        'settings:read', 'settings:write',
      ],
    }
    setCookie(CookieNames.ACCESS_TOKEN, 'dev-token-12345', 1)
    setCookie(CookieNames.USER, JSON.stringify(mockUser), 1)
    toast.success('ورود آزمایشی موفق')
    navigate('/dashboard')
    window.location.reload()
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mobile || mobile.length !== 11) {
      toast.error('لطفاً شماره موبایل صحیح وارد کنید')
      return
    }

    setLoading(true)
    const result = await sendOtp(mobile)
    setLoading(false)

    if (result.success) {
      setStep('otp')
      toast.success('کد تأیید به شماره شما ارسال شد')
    } else {
      toast.error(result.message || 'خطا در ارسال کد')
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otp || otp.length < 4 || otp.length > 6) {
      toast.error('لطفاً کد تأیید ۴ تا ۶ رقمی را وارد کنید')
      return
    }

    setLoading(true)
    const result = await login(mobile, otp)
    setLoading(false)

    if (result.success) {
      toast.success('خوش آمدید!')
      navigate('/dashboard')
    } else {
      toast.error(result.message || 'خطا در ورود')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">اَملاین</h1>
          <p className="text-gray-500 mt-2">پنل مدیریت</p>
        </div>

        {/* Form */}
        {step === 'mobile' ? (
          <form onSubmit={handleSendOtp} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                شماره موبایل
              </label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="0912..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                dir="ltr"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {loading ? 'در حال ارسال...' : 'ارسال کد تأیید'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                کد تأیید
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="****"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-center text-2xl tracking-widest"
                dir="ltr"
                maxLength={6}
              />
              <p className="text-sm text-gray-500 mt-2">
                کد ارسال شده به {mobile}
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {loading ? 'در حال ورود...' : 'ورود'}
            </button>
            <button
              type="button"
              onClick={() => setStep('mobile')}
              className="w-full py-2 text-sm text-gray-600 hover:text-primary"
            >
              تغییر شماره موبایل
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-400">
          © ۱۴۰۳ - اَملاین - تمامی حقوق محفوظ است
        </div>

        {/* Dev bypass */}
        {import.meta.env.DEV && (
          <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
            <button
              type="button"
              onClick={handleDevLogin}
              className="w-full py-2 text-sm text-orange-600 border border-orange-300 rounded-lg hover:bg-orange-50 transition-colors"
            >
              🔧 ورود آزمایشی (فقط در محیط توسعه)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
