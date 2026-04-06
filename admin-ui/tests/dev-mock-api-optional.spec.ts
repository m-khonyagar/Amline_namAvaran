/**
 * درخواست‌های مستقیم به dev-mock-api (پورت پیش‌فرض 8080).
 * اگر سرور mock بالا نباشد، این تست‌ها به‌صورت خودکار رد می‌شوند.
 */
import { test, expect } from '@playwright/test';

const DEV_MOCK = process.env.DEV_MOCK_BASE_URL ?? 'http://127.0.0.1:8080';

async function mockReachable(request: import('@playwright/test').APIRequestContext): Promise<boolean> {
  try {
    const r = await request.get(`${DEV_MOCK}/health`, { timeout: 3000 });
    return r.ok();
  } catch {
    return false;
  }
}

test.describe('dev-mock API HTTP (optional)', () => {
  test('health و شکل /admin/users', async ({ request }) => {
    test.skip(!(await mockReachable(request)), `dev-mock در دسترس نیست (${DEV_MOCK})`);

    const h = await request.get(`${DEV_MOCK}/health`);
    expect(h.ok()).toBeTruthy();

    const users = await request.get(`${DEV_MOCK}/admin/users`);
    expect(users.ok()).toBeTruthy();
    const j = (await users.json()) as { items?: unknown[]; total?: number };
    expect(Array.isArray(j.items)).toBeTruthy();
    expect(typeof j.total).toBe('number');
  });
});
