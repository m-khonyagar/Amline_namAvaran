import type { ReactNode } from 'react'
import { useAuth } from '../../hooks/useAuth'
import ForbiddenPage from '../../pages/ForbiddenPage'

interface PermissionGuardProps {
  permission: string
  children: ReactNode
  /** page: صفحهٔ 403 | silent: بدون UI (مثلاً برای شرط‌های تو در تو) */
  mode?: 'page' | 'silent'
}

export function PermissionGuard({ permission, children, mode = 'page' }: PermissionGuardProps) {
  const { hasPermission } = useAuth()
  if (hasPermission(permission)) return <>{children}</>
  if (mode === 'silent') return null
  return <ForbiddenPage />
}
