export type WorkspaceTaskStatus = 'TODO' | 'DOING' | 'DONE' | 'BLOCKED';

export interface WorkspaceTask {
  id: string;
  title: string;
  assignee_name: string;
  status: WorkspaceTaskStatus;
  due_at: string | null;
  created_at: string;
  priority: 'low' | 'medium' | 'high';
}

export interface TeamPresenceRow {
  user_id: string;
  full_name: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  last_seen_at: string;
}

export interface WorkspaceFileRow {
  id: string;
  title: string;
  kind: 'upload' | 'gdoc' | 'gsheet';
  url: string | null;
  embed_url: string | null;
  created_at: string;
  created_by: string;
}
