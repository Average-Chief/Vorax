import React, { useState, useEffect } from 'react';
import {
  Copy,
  Check,
  Terminal,
  RefreshCw,
  AlertTriangle,
  Zap,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
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
  const [pageSize, setPageSize] = useState<number>(6);

  // Pagination states for the 3 side-by-side columns
  const [pageAttention, setPageAttention] = useState<number>(1);
  const [pageInflight, setPageInflight] = useState<number>(1);
  const [pageTerminal, setPageTerminal] = useState<number>(1);

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

  const terminalTasks = tasks.filter(
    (t) =>
      t.is_terminal &&
      !['failed', 'rejected', 'input-required'].includes((t.current_state || '').toLowerCase())
  );

  // Pagination calculations
  const totalPagesAttention = Math.max(1, Math.ceil(attentionTasks.length / pageSize));
  const totalPagesInflight = Math.max(1, Math.ceil(inflightTasks.length / pageSize));
  const totalPagesTerminal = Math.max(1, Math.ceil(terminalTasks.length / pageSize));

  // Clamp pagination when lists change
  useEffect(() => {
    if (pageAttention > totalPagesAttention) setPageAttention(totalPagesAttention);
  }, [totalPagesAttention, pageAttention]);

  useEffect(() => {
    if (pageInflight > totalPagesInflight) setPageInflight(totalPagesInflight);
  }, [totalPagesInflight, pageInflight]);

  useEffect(() => {
    if (pageTerminal > totalPagesTerminal) setPageTerminal(totalPagesTerminal);
  }, [totalPagesTerminal, pageTerminal]);

  const pagedAttentionTasks = attentionTasks.slice(
    (pageAttention - 1) * pageSize,
    pageAttention * pageSize
  );
  const pagedInflightTasks = inflightTasks.slice(
    (pageInflight - 1) * pageSize,
    pageInflight * pageSize
  );
  const pagedTerminalTasks = terminalTasks.slice(
    (pageTerminal - 1) * pageSize,
    pageTerminal * pageSize
  );

  const renderTaskCard = (task: TaskSummary, variant: 'attention' | 'inflight' | 'terminal') => {
    const shortId = task.id.length > 14 ? `${task.id.slice(0, 10)}...` : task.id;
    const preview = task.error_summary || 'Task running / telemetry active';

    let cardBorder = 'border-neutral-800/80 hover:border-neutral-700 bg-black/60';
    if (variant === 'attention') {
      cardBorder = 'border-rose-900/60 hover:border-rose-500 bg-rose-950/15 hover:bg-rose-950/30';
    } else if (variant === 'inflight') {
      cardBorder = 'border-blue-900/60 hover:border-blue-500 bg-blue-950/15 hover:bg-blue-950/30';
    } else {
      cardBorder = 'border-neutral-800/80 hover:border-neutral-600 bg-neutral-950/40 hover:bg-neutral-900/60';
    }

    return (
      <div
        key={task.id}
        onClick={() => onSelectTask(task.id)}
        className={`p-3 border rounded transition-all cursor-pointer space-y-2 group ${cardBorder}`}
      >
        {/* Row 1: StateChip + Task ID + Copy + Time */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <StateChip state={task.current_state} />
            <span
              className="font-mono text-xs font-semibold text-white group-hover:text-orange-400 transition-colors truncate"
              title={task.id}
            >
              {shortId}
            </span>
            <button
              onClick={(e) => handleCopy(task.id, e)}
              className="text-slate-500 hover:text-slate-200 transition-colors p-0.5"
              title="Copy Task ID"
            >
              {copiedId === task.id ? (
                <Check size={11} className="text-emerald-400" />
              ) : (
                <Copy size={11} />
              )}
            </button>
          </div>
          <span className="text-[10px] text-slate-500 font-mono shrink-0">
            {timeAgo(task.last_event_at)}
          </span>
        </div>

        {/* Row 2: Error summary or message preview */}
        <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed font-sans" title={preview}>
          {preview}
        </p>

        {/* Row 3: Duration & Open Timeline Action */}
        <div className="flex items-center justify-between pt-1.5 border-t border-neutral-900/80 text-[10px] text-slate-500">
          <div className="flex items-center gap-1 font-mono">
            <Clock size={10} />
            <span>{formatDuration(task.started_at, task.last_event_at)}</span>
          </div>
          <span className="text-blue-400 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all flex items-center gap-0.5 font-medium">
            <span>Timeline</span>
            <ArrowUpRight size={10} />
          </span>
        </div>
      </div>
    );
  };

  const renderPaginationFooter = (
    currentPage: number,
    totalPages: number,
    totalItems: number,
    onPageChange: (newPage: number) => void
  ) => {
    if (totalItems === 0) return null;
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);

    return (
      <div className="flex items-center justify-between px-3 py-2 border-t border-neutral-800 text-[11px] text-slate-400 bg-neutral-950 select-none">
        <span className="font-mono text-[10px] text-slate-500">
          {startItem}-{endItem} of {totalItems}
        </span>
        <div className="flex items-center gap-1">
          <button
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="p-1 px-1.5 border border-neutral-800 bg-black hover:bg-neutral-900 disabled:opacity-30 disabled:hover:bg-black text-white font-mono text-[10px] rounded transition-colors flex items-center gap-0.5"
            title="Previous Page"
          >
            <ChevronLeft size={11} />
            <span>Prev</span>
          </button>
          <span className="px-1 text-[10px] font-mono text-slate-400">
            {currentPage}/{totalPages}
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="p-1 px-1.5 border border-neutral-800 bg-black hover:bg-neutral-900 disabled:opacity-30 disabled:hover:bg-black text-white font-mono text-[10px] rounded transition-colors flex items-center gap-0.5"
            title="Next Page"
          >
            <span>Next</span>
            <ChevronRight size={11} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-neutral-800/80">
        <div>
          <h1 className="text-xl font-bold font-sans text-white tracking-tight">Tasks Triage</h1>
          <p className="text-xs text-slate-400">
            Tri-column priority stream: needs attention, in-flight streams, and terminal execution
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Page size selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-black border border-neutral-800 text-xs text-white px-2 py-1 rounded focus:outline-none focus:border-neutral-600"
            >
              <option value={4}>4</option>
              <option value={6}>6</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>

          <button
            onClick={refresh}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-black hover:bg-neutral-900 text-neutral-200 text-xs font-mono uppercase transition-colors border border-neutral-800 rounded"
          >
            <RefreshCw size={12} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {loading && tasks.length === 0 ? (
        <div className="py-20 text-center text-neutral-500 text-xs font-mono uppercase">
          Loading task triage...
        </div>
      ) : tasks.length === 0 ? (
        <div className="border border-neutral-800 p-8 bg-[#080808] text-center space-y-4 rounded">
          <Terminal size={32} className="mx-auto text-neutral-600" />
          <h3 className="text-base font-mono font-medium text-neutral-300 uppercase">No tasks yet</h3>
          <p className="text-xs text-neutral-400 max-w-md mx-auto font-sans">
            POST a JSON-RPC message to{' '}
            <code className="bg-black border border-neutral-800 px-1 py-0.5 text-indigo-400 font-mono">
              /gw/{'{route}'}/
            </code>{' '}
            and watch it land here in real time.
          </p>
          <div className="bg-black border border-neutral-800 p-4 text-left font-mono text-xs max-w-lg mx-auto text-neutral-300 overflow-x-auto">
            {`curl -X POST http://localhost:8000/gw/research/ \\
  -H "Authorization: Bearer <GATEWAY_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc": "2.0", "id": 1, "method": "message/stream", "params": {"message": {"role": "user", "parts": [{"kind": "text", "text": "research query"}]}}}'`}
          </div>
        </div>
      ) : (
        /* 3 Columns Side-by-Side */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          {/* Column 1: Needs Attention */}
          <div className="bg-[#080808] border border-rose-950/80 rounded flex flex-col justify-between overflow-hidden shadow-sm">
            <div>
              <div className="p-3 bg-rose-950/25 border-b border-rose-900/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={15} className="text-rose-400 shrink-0" />
                  <h2 className="text-xs font-bold font-mono uppercase text-rose-300 tracking-wider">
                    Needs Attention
                  </h2>
                  <span className="px-1.5 py-0.2 bg-rose-900/60 border border-rose-700/80 text-rose-200 text-[10px] font-mono rounded">
                    {attentionTasks.length}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-rose-400/80">Failed / Input</span>
              </div>

              <div className="p-3 space-y-2.5 min-h-[300px]">
                {pagedAttentionTasks.length === 0 ? (
                  <div className="py-16 text-center text-xs font-mono text-neutral-600">
                    No failed or blocked tasks
                  </div>
                ) : (
                  pagedAttentionTasks.map((t) => renderTaskCard(t, 'attention'))
                )}
              </div>
            </div>

            {renderPaginationFooter(
              pageAttention,
              totalPagesAttention,
              attentionTasks.length,
              setPageAttention
            )}
          </div>

          {/* Column 2: In Flight */}
          <div className="bg-[#080808] border border-blue-950/80 rounded flex flex-col justify-between overflow-hidden shadow-sm">
            <div>
              <div className="p-3 bg-blue-950/25 border-b border-blue-900/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap size={15} className="text-blue-400 shrink-0 animate-pulse" />
                  <h2 className="text-xs font-bold font-mono uppercase text-blue-300 tracking-wider">
                    In Flight
                  </h2>
                  <span className="px-1.5 py-0.2 bg-blue-900/60 border border-blue-700/80 text-blue-200 text-[10px] font-mono rounded">
                    {inflightTasks.length}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-blue-400/80">Working & Streams</span>
              </div>

              <div className="p-3 space-y-2.5 min-h-[300px]">
                {pagedInflightTasks.length === 0 ? (
                  <div className="py-16 text-center text-xs font-mono text-neutral-600">
                    No active in-flight streams
                  </div>
                ) : (
                  pagedInflightTasks.map((t) => renderTaskCard(t, 'inflight'))
                )}
              </div>
            </div>

            {renderPaginationFooter(
              pageInflight,
              totalPagesInflight,
              inflightTasks.length,
              setPageInflight
            )}
          </div>

          {/* Column 3: Recent Terminal */}
          <div className="bg-[#080808] border border-neutral-800 rounded flex flex-col justify-between overflow-hidden shadow-sm">
            <div>
              <div className="p-3 bg-neutral-900/60 border-b border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                  <h2 className="text-xs font-bold font-mono uppercase text-slate-200 tracking-wider">
                    Recent Terminal
                  </h2>
                  <span className="px-1.5 py-0.2 bg-neutral-800 border border-neutral-700 text-slate-300 text-[10px] font-mono rounded">
                    {terminalTasks.length}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">Completed & Canceled</span>
              </div>

              <div className="p-3 space-y-2.5 min-h-[300px]">
                {pagedTerminalTasks.length === 0 ? (
                  <div className="py-16 text-center text-xs font-mono text-neutral-600">
                    No terminal tasks recorded yet
                  </div>
                ) : (
                  pagedTerminalTasks.map((t) => renderTaskCard(t, 'terminal'))
                )}
              </div>
            </div>

            {renderPaginationFooter(
              pageTerminal,
              totalPagesTerminal,
              terminalTasks.length,
              setPageTerminal
            )}
          </div>
        </div>
      )}
    </div>
  );
}
