import {
  TaskSummary,
  TaskTimeline,
  AgentListItem,
  GatewayRoute,
  ApiKeyItem,
  StatsResponse,
} from './types';

const API_KEY_STORAGE = 'a2a_api_key';

export function getStoredApiKey(): string {
  return localStorage.getItem(API_KEY_STORAGE) || '';
}

export function setStoredApiKey(key: string): void {
  if (key) {
    localStorage.setItem(API_KEY_STORAGE, key.trim());
  } else {
    localStorage.removeItem(API_KEY_STORAGE);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  const apiKey = getStoredApiKey();
  if (apiKey && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${apiKey}`);
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        errMessage = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // ignore
    }
    throw new Error(errMessage);
  }

  return response.json();
}

export async function fetchTasks(state?: string): Promise<TaskSummary[]> {
  const url = state ? `/control/tasks?state=${encodeURIComponent(state)}&limit=100` : '/control/tasks?limit=100';
  return request<TaskSummary[]>(url);
}

export async function fetchTaskTimeline(taskId: string): Promise<TaskTimeline> {
  return request<TaskTimeline>(`/control/tasks/${encodeURIComponent(taskId)}/timeline`);
}

export async function fetchAgents(): Promise<AgentListItem[]> {
  return request<AgentListItem[]>('/control/agents');
}

export async function registerAgent(payload: {
  name: string;
  endpoint_url: string;
  upstream_credential?: string;
}): Promise<AgentListItem> {
  return request<AgentListItem>('/control/agents', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchRoutes(): Promise<GatewayRoute[]> {
  return request<GatewayRoute[]>('/control/routes');
}

export async function createRoute(payload: {
  path_segment: string;
  agent_id: string;
}): Promise<GatewayRoute> {
  return request<GatewayRoute>('/control/routes', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchKeys(): Promise<ApiKeyItem[]> {
  return request<ApiKeyItem[]>('/control/keys');
}

export async function createKey(name: string): Promise<{
  id: string;
  name: string;
  prefix: string;
  key: string;
  created_at: string;
}> {
  return request('/control/keys', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function deleteKey(keyId: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/control/keys/${encodeURIComponent(keyId)}`, {
    method: 'DELETE',
  });
}

export async function fetchStats(): Promise<StatsResponse> {
  return request<StatsResponse>('/control/stats');
}
