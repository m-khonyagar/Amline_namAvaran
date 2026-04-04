/**
 * پیمایش آزاد ویزارد و شروع بدون POST — فقط وقتی DEV است و
 * VITE_WIZARD_PREVIEW_MODE=true (برای تست UI ادمین، نه production).
 */
export function isWizardPreviewMode(): boolean {
  if (!import.meta.env.DEV) return false;
  return import.meta.env.VITE_WIZARD_PREVIEW_MODE === 'true';
}

export function isPreviewBootstrapContractId(contractId: string): boolean {
  return contractId.startsWith('local-preview__');
}
