import type { Page } from '@playwright/test';

/** پاک کردن draft و CRM از localStorage تا تست‌ها state را به اشتراک نگذارند */
export async function clearAmlineBrowserStorage(page: Page): Promise<void> {
  await page.evaluate(() => {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (
        k &&
        (k.startsWith('amline_draft_') ||
          k.startsWith('amline_crm_leads') ||
          k.startsWith('amline_crm_activities'))
      ) {
        localStorage.removeItem(k);
      }
    }
  });
}
