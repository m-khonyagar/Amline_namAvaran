import type { ReactNode } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { AccessDenied } from './AccessDenied';

interface PermissionGuardProps {
  permission: string;
  children: ReactNode;
}

/** در dev به‌صورت پیش‌فرض همهٔ صفحات قابل باز شدن است؛ با VITE_DEV_VIEW_ALL_PAGES=false تست RBAC */
function isDevViewAllPages(): boolean {
  return (
    import.meta.env.DEV && import.meta.env.VITE_DEV_VIEW_ALL_PAGES !== 'false'
  );
}

export function PermissionGuard({ permission, children }: PermissionGuardProps) {
  const { hasPermission } = useAuth();
  if (isDevViewAllPages()) return <>{children}</>;
  if (!hasPermission(permission)) return <AccessDenied permission={permission} />;
  return <>{children}</>;
}
