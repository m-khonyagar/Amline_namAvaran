/** تایپ‌های Plane.so API */

export interface PlaneConfig {
  baseUrl: string;
  apiKey: string;
  workspaceSlug: string;
}

export interface PlaneWorkspace {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  created_at: string;
}

export interface PlaneProject {
  id: string;
  name: string;
  identifier: string;
  description: string;
  network: number;
  is_member: boolean;
  total_members: number;
  total_issues: number;
  created_at: string;
  updated_at: string;
  emoji: string | null;
  icon_prop: { name?: string; color?: string } | null;
}

export type PlaneIssuePriority = 'urgent' | 'high' | 'medium' | 'low' | 'none';

export interface PlaneState {
  id: string;
  name: string;
  color: string;
  group: 'backlog' | 'unstarted' | 'started' | 'completed' | 'cancelled';
  sequence: number;
}

export interface PlaneIssue {
  id: string;
  name: string;
  description_html: string | null;
  priority: PlaneIssuePriority;
  state: string; // state id
  assignees: string[]; // member ids
  due_date: string | null;
  created_at: string;
  updated_at: string;
  sequence_id: number;
  label_ids: string[];
  completed_at: string | null;
  started_at: string | null;
}

/** نقش‌های عددی Plane */
export type PlaneRole = 5 | 10 | 15 | 18 | 20;

export interface PlaneMember {
  id: string;
  member: {
    id: string;
    display_name: string;
    avatar: string | null;
    email: string;
    first_name: string;
    last_name: string;
  };
  role: PlaneRole;
  created_at: string;
}

export interface PlaneCycle {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'started' | 'in_progress' | 'completed';
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  total_issues: number;
  completed_issues: number;
  cancelled_issues: number;
  started_issues: number;
  unstarted_issues: number;
  backlog_issues: number;
}

export interface PlaneListResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const PLANE_PRIORITY_LABEL: Record<PlaneIssuePriority, string> = {
  urgent: 'فوری',
  high: 'بالا',
  medium: 'متوسط',
  low: 'پایین',
  none: 'بدون اولویت',
};

export const PLANE_PRIORITY_COLOR: Record<PlaneIssuePriority, string> = {
  urgent: 'text-red-600 dark:text-red-400',
  high: 'text-orange-600 dark:text-orange-400',
  medium: 'text-yellow-600 dark:text-yellow-400',
  low: 'text-blue-500 dark:text-blue-400',
  none: 'text-gray-400 dark:text-slate-500',
};

export const PLANE_STATE_GROUP_LABEL: Record<PlaneState['group'], string> = {
  backlog: 'بک‌لاگ',
  unstarted: 'شروع‌نشده',
  started: 'در حال انجام',
  completed: 'انجام‌شده',
  cancelled: 'لغو‌شده',
};

export const PLANE_ROLE_LABEL: Record<PlaneRole, string> = {
  5: 'مهمان',
  10: 'ناظر',
  15: 'عضو',
  18: 'مالک',
  20: 'ادمین',
};
