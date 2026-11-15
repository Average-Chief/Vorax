import { useState, useEffect, useCallback, useRef } from 'react';
import { TaskSummary, TaskEventDetail, TaskTimeline, WsTaskEvent } from '../lib/types';
import { fetchTaskTimeline } from '../lib/api';
import { wsManager } from './useWs';

export function useTimeline(taskId: string) {
  const [task, setTask] = useState<TaskSummary | null>(null);
  const [events, setEvents] = useState<TaskEventDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isIncomplete, setIsIncomplete] = useState<boolean>(false);
  const [incompletenessReason, setIncompletenessReason] = useState<string | null>(null);

  const seenSeqSet = useRef<Set<number>>(new Set());

  const loadTimeline = useCallback(async () => {
    if (!taskId) return;
    try {
      setError(null);
      const data = await fetchTaskTimeline(taskId);
      setTask(data.task);
      setEvents(data.events);
      setIsIncomplete(Boolean(data.is_incomplete || data.task?.is_incomplete));
      setIncompletenessReason(data.incompleteness_reason || data.task?.incompleteness_reason || null);
      seenSeqSet.current = new Set(data.events.map((e) => e.seq));
    } catch (err: any) {
      setError(err.message || 'Failed to load timeline');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    loadTimeline();

    // Refetch on WS reconnect
    const unsubReconnect = wsManager.subscribeReconnect(() => {
      loadTimeline();
    });

    // Handle WS deltas
    const unsubMsg = wsManager.subscribeMessage((delta: WsTaskEvent) => {
      if (delta.task_id !== taskId) return;

      const { seq, state, kind, is_final, latency_ms, observed_at } = delta;

      if (seenSeqSet.current.has(seq)) {
        // Idempotency: equal seq is no-op
        return;
      }
      seenSeqSet.current.add(seq);

      const isTerminal = is_final === true || ['completed', 'failed', 'canceled', 'rejected'].includes((state || '').toLowerCase());

      setTask((prev) => {
        if (!prev) {
          return {
            id: taskId,
            current_state: state,
            is_terminal: isTerminal,
            last_event_at: observed_at || new Date().toISOString(),
          };
        }
        return {
          ...prev,
          current_state: state || prev.current_state,
          is_terminal: isTerminal ? true : prev.is_terminal,
          last_event_at: observed_at || prev.last_event_at,
        };
      });

      // Synthetic/live TaskEventDetail
      const newEvent: TaskEventDetail = {
        id: -seq, // temporary client id before snapshot
        seq,
        source: kind === 'gateway.note' ? 'gateway' : 'upstream',
        kind: kind || 'status-update',
        state: state || null,
        is_final: is_final ?? null,
        payload: {
          result: {
            kind,
            status: {
              state,
              message: { parts: [{ kind: 'text', text: `Live event (seq ${seq})` }] },
            },
          },
        },
        observed_at: observed_at || new Date().toISOString(),
        latency_ms: latency_ms ?? null,
      };

      setEvents((prev) => {
        const next = [...prev, newEvent];
        return next.sort((a, b) => a.seq - b.seq);
      });
    });

    return () => {
      unsubReconnect();
      unsubMsg();
    };
  }, [taskId, loadTimeline]);

  return { task, events, loading, error, refresh: loadTimeline, isIncomplete, incompletenessReason };
}

