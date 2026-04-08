import type { ReactNode } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { AccessDenied } from './AccessDenied';

interface PermissionGuardProps {
  permission: string;
  children: ReactNode;
}

export function PermissionGuard({ permission, children }: PermissionGuardProps) {
  const { hasPermission } = useAuth();
  if (!hasPermission(permission)) return <AccessDenied permission={permission} />;
  return <>{children}</>;
}
