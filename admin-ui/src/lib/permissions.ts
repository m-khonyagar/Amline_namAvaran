/** هم‌تراز با `useAuth` و دکمهٔ ورود آزمایشی — در build تولید غیرفعال است */
export function isDevBypassEnv(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_BYPASS !== 'false';
}

/**
 * تطبیق با منطق backend: `rbac_deps._perm_match` (ستاره کامل، پیشوند با *)
 */
export function permissionMatches(granted: string[] | undefined, need: string): boolean {
  if (!granted?.length) return false;
  if (granted.includes('*')) return true;
  if (granted.includes(need)) return true;
  for (const g of granted) {
    if (g.endsWith('*')) {
      const p = g.slice(0, -1);
      if (need === p || need.startsWith(`${p}:`) || need.startsWith(p)) return true;
    }
  }
  return false;
}

/** لیست صریح مجوزها برای ورود آزمایشی / mock — هم‌تراز با ماژول‌های پنل و API */
export const EXPLICIT_FULL_DEV_PERMISSIONS: string[] = [
  'legal:read',
  'legal:write',
  'contracts:read',
  'contracts:write',
  'users:read',
  'users:write',
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
  'notifications:write',
  'crm:read',
  'crm:write',
];
