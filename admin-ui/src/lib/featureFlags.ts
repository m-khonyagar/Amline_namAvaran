/**
 * Feature-flag helper — reads `VITE_FLAG_<NAME>` environment variables.
 *
 * Example: featureEnabled('PR_CONTRACTS_PAGE')
 *   reads VITE_FLAG_PR_CONTRACTS_PAGE from import.meta.env
 */

export function featureEnabled(flag: string): boolean {
  try {
    const env = (import.meta as unknown as { env?: Record<string, string> }).env ?? {};
    const value = env[`VITE_FLAG_${flag}`];
    return value === 'true' || value === '1';
  } catch {
    return false;
  }
}
