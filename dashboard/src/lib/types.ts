export interface TaskSummary {
  id: string;
  route_id?: string | null;
  context_id?: string | null;
  current_state?: string | null;
  is_terminal: boolean;
  started_at?: string | null;
  last_event_at?: string | null;
  error_summary?: string | null;
}

export interface TaskEventDetail {
  id: number;
  seq: number;
  source: string;
  kind?: string | null;
  state?: string | null;
  is_final?: boolean | null;
  payload: any;
  observed_at: string;
  latency_ms?: number | null;
}

export interface TaskTimeline {
  task: TaskSummary;
  events: TaskEventDetail[];
}

export interface AgentListItem {
  id: string;
  name: string;
  endpoint_url: string;
  health: string;
  card_summary: {
    name?: string;
    description?: string;
    version?: string;
    capabilities?: any;
  };
  created_at: string;
}

export interface GatewayRoute {
  id: string;
  path_segment: string;
  agent_id: string;
  agent_name?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  key_prefix: string;
  is_active: boolean;
  created_at: string;
}

export interface StatsResponse {
  tasks_by_state: Record<string, number>;
  events_per_sec: number;
  total_events: number;
  dropped_events: number;
  orphan_errors: number;
  uptime_seconds: number;
}

export interface WsTaskEvent {
  type: 'task_event';
  task_id: string;
  kind?: string | null;
  state?: string | null;
  is_final?: boolean | null;
  seq: number;
  latency_ms?: number | null;
  observed_at?: string;
}
