/**
 * نشست احراز هویت سراسری — یک منبع حقیقت برای تمام مصرف‌کنندگان useAuth.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../lib/api'
import { apiV1 } from '../lib/apiPaths'
import { ensureMappedError } from '../lib/errorMapper'
import { CookieNames, getCookie, setCookie } from '../lib/cookies'
import { EXPLICIT_FULL_DEV_PERMISSIONS, isDevBypassEnv, permissionMatches } from '../lib/permissions'
import { clearAuthCookies, registerSessionExpiredHandler } from './authSession'

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

export interface AuthContextValue extends AuthState {
  login: (mobile: string, otp: string) => Promise<{ success: true } | { success: false; message: string }>
  sendOtp: (mobile: string) => Promise<{ success: true } | { success: false; message: string }>
  logout: () => void
  hasPermission: (permission: string) => boolean
  checkAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  })

  const checkAuth = useCallback(async () => {
    const token = getCookie(CookieNames.ACCESS_TOKEN)
    const userData = getCookie(CookieNames.USER)
    if (isDevBypassEnv() && token === 'dev-token-12345') {
      if (userData) {
        try {
          const user = JSON.parse(userData) as User
          if (user.id && user.mobile && user.role) {
            setAuthState({ user, isAuthenticated: true, isLoading: false })
            return
          }
        } catch {
          /* continue */
        }
      }
      const mockUser: User = {
        id: 'dev-001',
        mobile: '09120000000',
        full_name: 'کاربر آزمایشی',
        role: 'admin',
        role_id: 'role-admin',
        permissions: [...EXPLICIT_FULL_DEV_PERMISSIONS],
      }
      setCookie(CookieNames.USER, JSON.stringify(mockUser), 1)
      setAuthState({ user: mockUser, isAuthenticated: true, isLoading: false })
      return
    }

    try {
      const response = await apiClient.get<User>(apiV1('auth/me'))
      const user = response.data
      setCookie(CookieNames.USER, JSON.stringify(user), 1)
      setAuthState({ user, isAuthenticated: true, isLoading: false })
    } catch {
      clearAuthCookies()
      setAuthState({ user: null, isAuthenticated: false, isLoading: false })
    }
  }, [])

  useEffect(() => {
    void checkAuth()
  }, [checkAuth])

  useEffect(() => {
    return registerSessionExpiredHandler(() => {
      setAuthState({ user: null, isAuthenticated: false, isLoading: false })
      if (typeof window !== 'undefined' && !window.location.pathname.endsWith('/login')) {
        navigate('/login', { replace: true })
      }
    })
  }, [navigate])

  const login = useCallback(async (mobile: string, otp: string) => {
    try {
      const response = await apiClient.post<{
        access_token?: string
        refresh_token?: string
        user?: User
      }>(apiV1('admin/login'), { mobile, otp })

      const { access_token, refresh_token } = response.data

      if (access_token) setCookie(CookieNames.ACCESS_TOKEN, access_token, 1)
      if (refresh_token) setCookie(CookieNames.REFRESH_TOKEN, refresh_token, 30)

      const me = await apiClient.get<User>(apiV1('auth/me'))
      const user = me.data
      setCookie(CookieNames.USER, JSON.stringify(user), 1)
      setAuthState({ user, isAuthenticated: true, isLoading: false })

      return { success: true as const }
    } catch (error: unknown) {
      const m = ensureMappedError(error)
      return { success: false as const, message: m.message }
    }
  }, [])

  const sendOtp = useCallback(async (mobile: string) => {
    try {
      await apiClient.post(apiV1('admin/otp/send'), { mobile })
      return { success: true as const }
    } catch (error: unknown) {
      const m = ensureMappedError(error)
      return { success: false as const, message: m.message }
    }
  }, [])

  const logout = useCallback(() => {
    clearAuthCookies()
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    })
  }, [])

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!authState.user) return false
      return permissionMatches(authState.user.permissions, permission)
    },
    [authState.user]
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      ...authState,
      login,
      sendOtp,
      logout,
      hasPermission,
      checkAuth,
    }),
    [authState, login, sendOtp, logout, hasPermission, checkAuth]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth باید داخل AuthProvider استفاده شود.')
  }
  return ctx
}
