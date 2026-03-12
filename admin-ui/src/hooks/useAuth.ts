import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '../lib/api'
import { CookieNames, getCookie, removeCookie, setCookie } from '../lib/cookies'

export interface User {
  id: string
  mobile: string
  full_name?: string
  role: string
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

    if (!token) {
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      })
      return
    }

    try {
      // Always validate with API for security
      const response = await apiClient.get<User>('/auth/me')
      const user = response.data
      // Update cookie with fresh data from API
      setCookie(CookieNames.USER, JSON.stringify(user), 1)
      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch {
      // If API call fails, check if we have cached user data
      if (userData) {
        try {
          const user = JSON.parse(userData) as User
          // Validate cached user has required fields
          if (user.id && user.mobile && user.role && user.permissions) {
            setAuthState({
              user,
              isAuthenticated: true,
              isLoading: false,
            })
            return
          }
        } catch {
          // Invalid JSON, continue to clear cookies
        }
      }
      removeCookie(CookieNames.ACCESS_TOKEN)
      removeCookie(CookieNames.REFRESH_TOKEN)
      removeCookie(CookieNames.USER)
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      })
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const login = async (mobile: string, otp: string) => {
    try {
      const response = await apiClient.post<{
        access_token: string
        refresh_token: string
        user: User
      }>('/admin/login', { mobile, otp })

      const { access_token, refresh_token, user } = response.data

      setCookie(CookieNames.ACCESS_TOKEN, access_token, 1)
      setCookie(CookieNames.REFRESH_TOKEN, refresh_token, 30)
      setCookie(CookieNames.USER, JSON.stringify(user), 1)

      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
      })

      return { success: true }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } }
      return {
        success: false,
        message: err.response?.data?.detail || 'خطا در ورود',
      }
    }
  }

  const sendOtp = async (mobile: string) => {
    try {
      await apiClient.post('/admin/otp/send', { mobile })
      return { success: true }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } }
      return {
        success: false,
        message: err.response?.data?.detail || 'خطا در ارسال کد',
      }
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
