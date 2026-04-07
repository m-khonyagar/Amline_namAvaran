/**
 * احراز هویت — تا قبل از پشتیبانی رسمی backend برای httpOnly، توکن در cookie ذخیره می‌شود.
 * جزئیات مهاجرت در docs/HTTPONLY_AUTH.md
 */
import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '../lib/api'
import { DEV_FIXED_TEST_MOBILE } from '../lib/devLocalAuth'
import { ensureMappedError } from '../lib/errorMapper'
import { CookieNames, getCookie, removeCookie, setCookie } from '../lib/cookies'

export interface User {
  id: string
  mobile: string
  full_name?: string
  role: string
  role_id?: string
  permissions: string[]
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  })

  const checkAuth = useCallback(async () => {
    const token = getCookie(CookieNames.ACCESS_TOKEN)
    const userData = getCookie(CookieNames.USER)
    // dev bypass — فقط در توسعه و فقط وقتی VITE_ENABLE_DEV_BYPASS=true صریحاً تنظیم شده
    const isDevBypassEnabled =
      import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_BYPASS === 'true'

    if (isDevBypassEnabled && token === 'dev-token-12345') {
      if (userData) {
        try {
          const user = JSON.parse(userData) as User
          if (user.id && user.mobile && user.role) {
            setAuthState({ user, isAuthenticated: true, isLoading: false })
            return
          }
        } catch { /* continue */ }
      }
      // اگه userData نبود، mock user بساز
      const mockUser: User = {
        id: 'dev-001', mobile: DEV_FIXED_TEST_MOBILE,
        full_name: 'کاربر آزمایشی', role: 'admin', role_id: 'role-admin',
        permissions: ['users:read','users:write','contracts:read','contracts:write',
          'ads:read','ads:write','wallets:read','wallets:write','settings:read','settings:write',
          'audit:read','roles:read','roles:write','reports:read','notifications:read','crm:read','crm:write'],
      }
      setCookie(CookieNames.USER, JSON.stringify(mockUser), 1)
      setAuthState({ user: mockUser, isAuthenticated: true, isLoading: false })
      return
    }

    try {
      const response = await apiClient.get<User>('/auth/me')
      const user = response.data
      setCookie(CookieNames.USER, JSON.stringify(user), 1)
      setAuthState({ user, isAuthenticated: true, isLoading: false })
    } catch {
      // fallback: اگر backend session/httpOnly هنوز کامل نبود، user cache را موقتاً بپذیر
      if (userData) {
        try {
          const user = JSON.parse(userData) as User
          if (user.id && user.mobile && user.role && user.permissions) {
            setAuthState({ user, isAuthenticated: true, isLoading: false })
            return
          }
        } catch { /* continue */ }
      }
      removeCookie(CookieNames.ACCESS_TOKEN)
      removeCookie(CookieNames.REFRESH_TOKEN)
      removeCookie(CookieNames.USER)
      setAuthState({ user: null, isAuthenticated: false, isLoading: false })
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const login = async (mobile: string, otp: string) => {
    try {
      const response = await apiClient.post<{
        access_token?: string
        refresh_token?: string
        user?: User
      }>('/admin/login', { mobile, otp })

      const { access_token, refresh_token } = response.data

      if (access_token) setCookie(CookieNames.ACCESS_TOKEN, access_token, 1)
      if (refresh_token) setCookie(CookieNames.REFRESH_TOKEN, refresh_token, 30)

      // برای حالت session/httpOnly، user را از /auth/me می‌گیریم.
      const me = await apiClient.get<User>('/auth/me')
      const user = me.data
      setCookie(CookieNames.USER, JSON.stringify(user), 1)
      setAuthState({ user, isAuthenticated: true, isLoading: false })

      return { success: true }
    } catch (error: unknown) {
      const m = ensureMappedError(error)
      return { success: false, message: m.message, hint: m.hint }
    }
  }

  const sendOtp = async (mobile: string) => {
    try {
      await apiClient.post('/admin/otp/send', { mobile })
      return { success: true as const }
    } catch (error: unknown) {
      const m = ensureMappedError(error)
      return { success: false as const, message: m.message, hint: m.hint }
    }
  }

  const logout = () => {
    removeCookie(CookieNames.ACCESS_TOKEN)
    removeCookie(CookieNames.REFRESH_TOKEN)
    removeCookie(CookieNames.USER)
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    })
  }

  const hasPermission = (permission: string): boolean => {
    if (!authState.user) return false
    return authState.user.permissions.includes(permission)
  }

  return {
    ...authState,
    login,
    sendOtp,
    logout,
    hasPermission,
    checkAuth,
  }
}
