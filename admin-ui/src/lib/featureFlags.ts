/** فلگ‌های محیط: `VITE_FLAG_<NAME>=true` (مثلاً `VITE_FLAG_PR_CONTRACTS_PAGE=true`) */
export function featureEnabled(flagName: string): boolean {
  const key = `VITE_FLAG_${flagName}`
  const env = import.meta.env as Record<string, string | boolean | undefined>
  return env[key] === 'true'
}
