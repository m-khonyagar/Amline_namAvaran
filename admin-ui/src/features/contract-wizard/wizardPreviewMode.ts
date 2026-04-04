/**
 * پیمایش آزاد ویزارد و شروع بدون POST — فقط وقتی DEV است و
 * VITE_WIZARD_PREVIEW_MODE=true (برای تست UI ادمین، نه production).
 */
export function isWizardPreviewMode(): boolean {
  if (!import.meta.env.DEV) return false;
  return import.meta.env.VITE_WIZARD_PREVIEW_MODE === 'true';
}

/** در پنل ادمین: رد کردن مراحل و پیمایش آزاد نوار همیشه فعال است (نیازی به env نیست). */
export function isAdminContractWizardFlexible(platform: 'admin' | 'user'): boolean {
  return platform === 'admin';
}

export function isPreviewBootstrapContractId(contractId: string): boolean {
  return contractId.startsWith('local-preview__');
}
