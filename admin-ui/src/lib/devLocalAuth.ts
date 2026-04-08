/** Canonical test mobile / OTP — aligned with dev-mock-api and backend fixed-test OTP. */
export const DEV_FIXED_TEST_MOBILE = '09100000000';
export const DEV_FIXED_TEST_OTP = '11111';

/** Admin panel: local dev quick-login / OTP shortcuts (VITE_ENABLE_DEV_BYPASS !== 'false'). */
export function isAdminDevBypassEnabled(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_BYPASS !== 'false';
}
