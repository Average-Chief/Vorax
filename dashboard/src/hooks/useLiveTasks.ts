import { useState, useEffect, useCallback, useRef } from 'react';
import { TaskSummary, WsTaskEvent } from '../lib/types';
import { fetchTasks } from '../lib/api';
import { wsManager } from './useWs';

export function getTriagePriority(state?: string | null, isTerminal?: boolean): number {
  const s = (state || '').toLowerCase();
  if (['failed', 'rejected', 'input-required'].includes(s)) return 1;
  if (!isTerminal) return 2;
  return 3;
}

export function sortTasksByTriage(tasks: TaskSummary[]): TaskSummary[] {
  return [...tasks].sort((a, b) => {
    const priA = getTriagePriority(a.current_state, a.is_terminal);
    const priB = getTriagePriority(b.current_state, b.is_terminal);
    if (priA !== priB) return priA - priB;
    const timeA = a.last_event_at ? new Date(a.last_event_at).getTime() : 0;
    const timeB = b.last_event_at ? new Date(b.last_event_at).getTime() : 0;
    return timeB - timeA;
  });
}

export function useLiveTasks() {
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track highest seen seq per task_id to enforce idempotency (higher seq wins)
  const taskSeqMap = useRef<Map<string, number>>(new Map());

  const loadTasks = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchTasks();
      setTasks(sortTasksByTriage(data));
      // Populate seq map if known, or reset
    } catch (err: any) {
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();

    // Refetch on WS reconnect to bridge any missed events
    const unsubReconnect = wsManager.subscribeReconnect(() => {
      loadTasks();
    });

    // Handle WS deltas
    const unsubMsg = wsManager.subscribeMessage((delta: WsTaskEvent) => {
      const { task_id, seq, state, is_final, observed_at } = delta;
      const currentHighestSeq = taskSeqMap.current.get(task_id) || 0;

      if (seq <= currentHighestSeq) {
        // Idempotency: equal or lower seq is a no-op
        return;
      }
      taskSeqMap.current.set(task_id, seq);

      setTasks((prev) => {
        const existingIdx = prev.findIndex((t) => t.id === task_id);
        const isTerminal = is_final === true || ['completed', 'failed', 'canceled', 'rejected'].includes((state || '').toLowerCase());

        let updated: TaskSummary[];
        if (existingIdx !== -1) {
          const old = prev[existingIdx];
          const updatedTask: TaskSummary = {
            ...old,
            current_state: state || old.current_state,
            is_terminal: isTerminal ? true : old.is_terminal,
            last_event_at: observed_at || old.last_event_at,
          };
          updated = [...prev];
          updated[existingIdx] = updatedTask;
        } else {
          // New task seen via WS
          const newTask: TaskSummary = {
            id: task_id,
            current_state: state || 'working',
            is_terminal: isTerminal,
            started_at: observed_at || new Date().toISOString(),
            last_event_at: observed_at || new Date().toISOString(),
          };
          updated = [newTask, ...prev];
        }

        // Always re-sort by triage order
        return sortTasksByTriage(updated);
      });
    });

    return () => {
      unsubReconnect();
      unsubMsg();
    };
  }, [loadTasks]);

  return { tasks, loading, error, refresh: loadTasks };
}

