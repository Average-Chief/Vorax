import React, { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronRight, Terminal, RefreshCw } from 'lucide-react';
import { TaskSummary } from '../lib/types';
import { useLiveTasks } from '../hooks/useLiveTasks';
import { StateChip } from '../components/StateChip';

interface TasksPageProps {
  onSelectTask: (taskId: string) => void;
}

function timeAgo(isoString?: string | null): string {
  if (!isoString) return '—';
  const sec = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (sec < 0) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return new Date(isoString).toLocaleDateString();
}

function formatDuration(startedAt?: string | null, lastEventAt?: string | null): string {
  if (!startedAt || !lastEventAt) return '—';
  const ms = new Date(lastEventAt).getTime() - new Date(startedAt).getTime();
  if (ms < 0) return '0ms';
  if (ms < 1000) return `${ms}ms`;
  const sec = (ms / 1000).toFixed(1);
  return `${sec}s`;
}

export function TasksPage({ onSelectTask }: TasksPageProps) {
  const { tasks, loading, error, refresh } = useLiveTasks();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [expandedSections, setExpandedSections] = useState({
    attention: true,
    inflight: true,
    terminal: true,
  });

  const handleCopy = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Group tasks into three triage sections
  const attentionTasks = tasks.filter((t) =>
    ['failed', 'rejected', 'input-required'].includes((t.current_state || '').toLowerCase())
  );

  const inflightTasks = tasks.filter(
    (t) =>
      !t.is_terminal &&
      !['failed', 'rejected', 'input-required'].includes((t.current_state || '').toLowerCase())
  );

  const terminalTasks = tasks
    .filter(
      (t) =>
        t.is_terminal &&
        !['failed', 'rejected', 'input-required'].includes((t.current_state || '').toLowerCase())
    )
    .slice(0, 50);

  const toggleSection = (sec: 'attention' | 'inflight' | 'terminal') => {
    setExpandedSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  const renderTaskRow = (task: TaskSummary, variant: 'attention' | 'inflight' | 'terminal') => {
    const s = (task.current_state || '').toLowerCase();
    let rowBg = 'hover:bg-slate-800/40';
    if (variant === 'attention') {
      rowBg = s === 'input-required' ? 'bg-amber-950/20 hover:bg-amber-900/30 border-l-2 border-amber-500' : 'bg-red-950/20 hover:bg-red-900/30 border-l-2 border-red-500';
    } else if (variant === 'inflight') {
      rowBg = s === 'working' ? 'hover:bg-blue-950/20 bg-slate-900/40' : 'hover:bg-slate-800/40 bg-slate-900/40';
    } else {
      rowBg = 'opacity-70 hover:opacity-100 hover:bg-slate-800/30';
    }

    const shortId = task.id.length > 12 ? `${task.id.slice(0, 8)}...` : task.id;
    const preview = task.error_summary || 'Task running';

    return (
      <tr
        key={task.id}
        onClick={() => onSelectTask(task.id)}
        className={`cursor-pointer transition-colors border-b border-slate-800/60 text-xs ${rowBg}`}
      >
        <td className="py-2.5 px-3 whitespace-nowrap">
          <StateChip state={task.current_state} />
        </td>
        <td className="py-2.5 px-3 font-mono text-slate-300">
          <div className="flex items-center space-x-1.5">
            <span title={task.id}>{shortId}</span>
            <button
              onClick={(e) => handleCopy(task.id, e)}
              className="text-slate-500 hover:text-slate-300 transition-colors p-0.5 rounded"
              title="Copy ID"
            >
              {copiedId === task.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            </button>
          </div>
        </td>
        <td className="py-2.5 px-3 max-w-xs truncate text-slate-300" title={preview}>
          {preview}
        </td>
        <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">{timeAgo(task.last_event_at)}</td>
        <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap font-mono">
          {formatDuration(task.started_at, task.last_event_at)}
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Tasks</h1>
          <p className="text-xs text-muted">Triage feed: live tasks ordered by failure and urgency</p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors border border-slate-700"
        >
          <RefreshCw size={13} />
          <span>Refresh</span>
        </button>
      </div>

      {loading && tasks.length === 0 ? (
        <div className="py-16 text-center text-slate-500 text-sm">Loading task triage...</div>
      ) : tasks.length === 0 ? (
        <div className="border border-slate-800 rounded-lg p-8 bg-card text-center space-y-4">
          <Terminal size={32} className="mx-auto text-slate-600" />
          <h3 className="text-base font-medium text-slate-300">No tasks yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            POST a JSON-RPC message to <code className="bg-slate-900 px-1 py-0.5 rounded text-blue-400">/gw/{'{route}'}/</code> and watch it land here in real time.
          </p>
          <div className="bg-black/50 p-4 rounded-md text-left font-mono text-xs max-w-lg mx-auto text-slate-300 overflow-x-auto">
            {`curl -X POST http://localhost:8000/gw/research/ \\
  -H "Authorization: Bearer <GATEWAY_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc": "2.0", "id": 1, "method": "message/stream", "params": {"message": {"role": "user", "parts": [{"kind": "text", "text": "research query"}]}}}'`}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 1. Needs Attention */}
          {attentionTasks.length > 0 && (
            <div className="border border-red-950/60 rounded-lg bg-card overflow-hidden">
              <button
                onClick={() => toggleSection('attention')}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-red-950/30 text-red-400 text-xs font-semibold uppercase tracking-wider select-none hover:bg-red-950/40 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  {expandedSections.attention ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span>Needs Attention ({attentionTasks.length})</span>
                </div>
                <span className="text-[11px] font-normal normal-case text-red-400/80">Failed & Input Required</span>
              </button>
              {expandedSections.attention && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] text-slate-400 font-medium">
                      <th className="py-2 px-3">State</th>
                      <th className="py-2 px-3">Task ID</th>
                      <th className="py-2 px-3">Summary / Error</th>
                      <th className="py-2 px-3">Last Active</th>
                      <th className="py-2 px-3">Duration</th>
                    </tr>
                  </thead>
                  <tbody>{attentionTasks.map((t) => renderTaskRow(t, 'attention'))}</tbody>
                </table>
              )}
            </div>
          )}

          {/* 2. In Flight */}
          <div className="border border-slate-800 rounded-lg bg-card overflow-hidden">
            <button
              onClick={() => toggleSection('inflight')}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-900/60 text-blue-400 text-xs font-semibold uppercase tracking-wider select-none hover:bg-slate-900/80 transition-colors"
            >
              <div className="flex items-center space-x-2">
                {expandedSections.inflight ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span>In Flight ({inflightTasks.length})</span>
              </div>
              <span className="text-[11px] font-normal normal-case text-slate-500">Working & Submitted</span>
            </button>
            {expandedSections.inflight && (
              inflightTasks.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-500">No active in-flight tasks</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] text-slate-400 font-medium">
                      <th className="py-2 px-3">State</th>
                      <th className="py-2 px-3">Task ID</th>
                      <th className="py-2 px-3">Preview</th>
                      <th className="py-2 px-3">Last Active</th>
                      <th className="py-2 px-3">Duration</th>
                    </tr>
                  </thead>
                  <tbody>{inflightTasks.map((t) => renderTaskRow(t, 'inflight'))}</tbody>
                </table>
              )
            )}
          </div>

          {/* 3. Recent Terminal */}
          <div className="border border-slate-800 rounded-lg bg-card overflow-hidden">
            <button
              onClick={() => toggleSection('terminal')}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-900/60 text-slate-400 text-xs font-semibold uppercase tracking-wider select-none hover:bg-slate-900/80 transition-colors"
            >
              <div className="flex items-center space-x-2">
                {expandedSections.terminal ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span>Recent Terminal ({terminalTasks.length})</span>
              </div>
              <span className="text-[11px] font-normal normal-case text-slate-500">Completed & Canceled</span>
            </button>
            {expandedSections.terminal && (
              terminalTasks.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-500">No completed tasks yet</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] text-slate-400 font-medium">
                      <th className="py-2 px-3">State</th>
                      <th className="py-2 px-3">Task ID</th>
                      <th className="py-2 px-3">Preview</th>
                      <th className="py-2 px-3">Last Active</th>
                      <th className="py-2 px-3">Duration</th>
                    </tr>
                  </thead>
                  <tbody>{terminalTasks.map((t) => renderTaskRow(t, 'terminal'))}</tbody>
                </table>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

