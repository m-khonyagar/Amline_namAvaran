import type { ReactNode } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { AccessDenied } from './AccessDenied';

interface PermissionGuardProps {
  permission: string;
  children: ReactNode;
}

export function PermissionGuard({ permission, children }: PermissionGuardProps) {
  const { hasPermission } = useAuth();
  if (
    import.meta.env.DEV &&
    import.meta.env.VITE_DEV_VIEW_ALL_PAGES === 'true'
  ) {
    return <>{children}</>;
  }
  if (!hasPermission(permission)) return <AccessDenied permission={permission} />;
  return <>{children}</>;
}
