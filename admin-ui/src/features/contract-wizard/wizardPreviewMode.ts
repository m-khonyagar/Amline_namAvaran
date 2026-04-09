/**
 * پیمایش آزاد ویزارد و شروع بدون POST — فقط وقتی DEV است و
 * VITE_WIZARD_PREVIEW_MODE=true (برای تست UI ادمین، نه production).
 */
function getViteEnv(name: string): string | undefined {
  try {
    const env = (import.meta as ImportMeta & { env?: Record<string, unknown> }).env
    const value = env?.[name]
    return value === undefined || value === null ? undefined : String(value)
  } catch {
    return undefined
  }
}

export function isWizardPreviewMode(): boolean {
  if (getViteEnv('DEV') !== 'true') return false
  return getViteEnv('VITE_WIZARD_PREVIEW_MODE') === 'true'
}

/** در پنل ادمین: رد کردن مراحل و پیمایش آزاد نوار همیشه فعال است (نیازی به env نیست). */
export function isAdminContractWizardFlexible(platform: 'admin' | 'user'): boolean {
  return platform === 'admin';
}

export function isPreviewBootstrapContractId(contractId: string): boolean {
  return contractId.startsWith('local-preview__');
}
