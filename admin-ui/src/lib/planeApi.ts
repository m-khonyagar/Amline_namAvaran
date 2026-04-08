/**
 * کلاینت API برای Plane.so
 *
 * اولویت پیکربندی:
 * 1. مقادیر env build-time (VITE_PLANE_BASE_URL, VITE_PLANE_API_KEY, VITE_PLANE_WORKSPACE_SLUG)
 * 2. مقادیر ذخیره‌شده در localStorage (برای پیکربندی runtime در صفحه‌ٔ تنظیمات)
 *
 * نکتهٔ امنیتی: کلید API هرگز در localStorage ذخیره نمی‌شود؛ فقط از env var خوانده می‌شود.
 * برای محیط runtime، کلید فقط در حافظهٔ session (sessionStorage) نگه‌داشته می‌شود.
 */
import axios from 'axios';
import type {
  PlaneConfig,
  PlaneWorkspace,
  PlaneProject,
  PlaneIssue,
  PlaneIssuePriority,
  PlaneState,
  PlaneMember,
  PlaneCycle,
  PlaneListResponse,
} from '../types/plane';

const LS_KEY_BASE_URL = 'plane_base_url';
const LS_KEY_WORKSPACE = 'plane_workspace_slug';
/** کلید API فقط در sessionStorage (نه localStorage) نگه‌داری می‌شود تا پس از بستن تب پاک شود */
const SS_KEY_API_KEY = 'plane_api_key';

export const DEFAULT_PLANE_BASE_URL = 'https://api.plane.so';

/** استخراج results از پاسخ API (هم list-response و هم array مستقیم را پشتیبانی می‌کند) */
function extractResults<T>(data: PlaneListResponse<T> | T[]): T[] {
  if (Array.isArray(data)) return data;
  return data.results ?? [];
}

/** خواندن پیکربندی Plane با اولویت env → sessionStorage/localStorage */
export function getPlaneConfig(): PlaneConfig {
  const env = import.meta.env as Record<string, string | undefined>;
  return {
    baseUrl:
      env.VITE_PLANE_BASE_URL ||
      localStorage.getItem(LS_KEY_BASE_URL) ||
      DEFAULT_PLANE_BASE_URL,
    // کلید API: env → sessionStorage (برای runtime بدون env)
    apiKey:
      env.VITE_PLANE_API_KEY ||
      sessionStorage.getItem(SS_KEY_API_KEY) ||
      '',
    workspaceSlug:
      env.VITE_PLANE_WORKSPACE_SLUG ||
      localStorage.getItem(LS_KEY_WORKSPACE) ||
      '',
  };
}

/** ذخیرهٔ پیکربندی (کلید API فقط در sessionStorage؛ بقیه در localStorage) */
export function savePlaneConfig(cfg: Partial<PlaneConfig>): void {
  if (cfg.baseUrl !== undefined) localStorage.setItem(LS_KEY_BASE_URL, cfg.baseUrl);
  // کلید API را در sessionStorage نگه می‌داریم تا پس از بستن مرورگر پاک شود.
  // توجه: برای محیط پروداکشن، کلید باید از env var (VITE_PLANE_API_KEY) تأمین شود
  // و هرگز از این مسیر ذخیره نشود. این مسیر فقط برای راه‌اندازی اولیه در dev است.
  // lgtm[js/clear-text-storage-of-sensitive-data]
  if (cfg.apiKey !== undefined) sessionStorage.setItem(SS_KEY_API_KEY, cfg.apiKey);
  if (cfg.workspaceSlug !== undefined) localStorage.setItem(LS_KEY_WORKSPACE, cfg.workspaceSlug);
}

/** بررسی اینکه آیا پیکربندی کامل است */
export function isPlaneConfigured(cfg: PlaneConfig): boolean {
  return Boolean(cfg.apiKey && cfg.workspaceSlug);
}

function makePlaneClient(cfg: PlaneConfig) {
  return axios.create({
    baseURL: `${cfg.baseUrl}/api/v1`,
    headers: {
      'X-API-Key': cfg.apiKey,
      'Content-Type': 'application/json',
    },
  });
}

/** تست اتصال — دریافت workspace */
export async function fetchWorkspaces(cfg: PlaneConfig): Promise<PlaneWorkspace[]> {
  const client = makePlaneClient(cfg);
  const res = await client.get<PlaneWorkspace[]>('/workspaces/');
  return res.data;
}

/** لیست پروژه‌ها */
export async function fetchProjects(cfg: PlaneConfig): Promise<PlaneProject[]> {
  const client = makePlaneClient(cfg);
  const res = await client.get<PlaneListResponse<PlaneProject> | PlaneProject[]>(
    `/workspaces/${cfg.workspaceSlug}/projects/`
  );
  return extractResults(res.data);
}

/** لیست state‌های یک پروژه */
export async function fetchStates(cfg: PlaneConfig, projectId: string): Promise<PlaneState[]> {
  const client = makePlaneClient(cfg);
  const res = await client.get<PlaneListResponse<PlaneState> | PlaneState[]>(
    `/workspaces/${cfg.workspaceSlug}/projects/${projectId}/states/`
  );
  return extractResults(res.data);
}

/** لیست issue‌های یک پروژه */
export async function fetchIssues(cfg: PlaneConfig, projectId: string): Promise<PlaneIssue[]> {
  const client = makePlaneClient(cfg);
  const res = await client.get<PlaneListResponse<PlaneIssue> | PlaneIssue[]>(
    `/workspaces/${cfg.workspaceSlug}/projects/${projectId}/issues/`
  );
  return extractResults(res.data);
}

/** ایجاد issue جدید */
export async function createIssue(
  cfg: PlaneConfig,
  projectId: string,
  data: { name: string; priority?: PlaneIssuePriority; state?: string }
): Promise<PlaneIssue> {
  const client = makePlaneClient(cfg);
  const res = await client.post<PlaneIssue>(
    `/workspaces/${cfg.workspaceSlug}/projects/${projectId}/issues/`,
    data
  );
  return res.data;
}

/** بروزرسانی issue */
export async function updateIssue(
  cfg: PlaneConfig,
  projectId: string,
  issueId: string,
  data: Partial<Pick<PlaneIssue, 'state' | 'priority' | 'name' | 'due_date'>>
): Promise<PlaneIssue> {
  const client = makePlaneClient(cfg);
  const res = await client.patch<PlaneIssue>(
    `/workspaces/${cfg.workspaceSlug}/projects/${projectId}/issues/${issueId}/`,
    data
  );
  return res.data;
}

/** لیست اعضای workspace */
export async function fetchMembers(cfg: PlaneConfig): Promise<PlaneMember[]> {
  const client = makePlaneClient(cfg);
  const res = await client.get<PlaneListResponse<PlaneMember> | PlaneMember[]>(
    `/workspaces/${cfg.workspaceSlug}/members/`
  );
  return extractResults(res.data);
}

/** لیست cycle‌های یک پروژه */
export async function fetchCycles(cfg: PlaneConfig, projectId: string): Promise<PlaneCycle[]> {
  const client = makePlaneClient(cfg);
  const res = await client.get<PlaneListResponse<PlaneCycle> | PlaneCycle[]>(
    `/workspaces/${cfg.workspaceSlug}/projects/${projectId}/cycles/`
  );
  return extractResults(res.data);
}
