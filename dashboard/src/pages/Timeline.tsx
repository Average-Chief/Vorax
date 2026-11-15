import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Copy, Check, Download, AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { useTimeline } from '../hooks/useTimeline';
import { StateChip } from '../components/StateChip';
import { JsonViewer } from '../components/JsonViewer';
import { TaskEventDetail } from '../lib/types';

interface TimelinePageProps {
  taskId: string;
  onBack: () => void;
}

export function TimelinePage({ taskId, onBack }: TimelinePageProps) {
  const { task, events, loading, error, refresh, isIncomplete, incompletenessReason } = useTimeline(taskId);
  const [copied, setCopied] = useState(false);
  const [expandedMessages, setExpandedMessages] = useState<Record<number, boolean>>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  // Auto-scroll to bottom only if user was already at bottom
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollHeight, scrollTop, clientHeight } = containerRef.current;
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 60;
  };

  useEffect(() => {
    if (isAtBottomRef.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [events]);

  const handleCopyId = () => {
    navigator.clipboard.writeText(taskId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleMessageExpand = (seq: number) => {
    setExpandedMessages((prev) => ({ ...prev, [seq]: !prev[seq] }));
  };

  const handleDownloadArtifact = (artifact: any) => {
    const name = artifact.name || 'artifact.json';
    let textContent = '';
    if (artifact.parts && Array.isArray(artifact.parts)) {
      textContent = artifact.parts.map((p: any) => p.text || JSON.stringify(p)).join('\n');
    } else {
      textContent = JSON.stringify(artifact, null, 2);
    }

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Find first gateway.note for the header 3am banner
  const gatewayNoteEvent = events.find((e) => e.kind === 'gateway.note');
  const gatewayNoteMessage =
    gatewayNoteEvent?.payload?.message ||
    gatewayNoteEvent?.payload?.detail ||
    (gatewayNoteEvent ? 'gateway observed abnormal termination' : null);

  const getKindBadge = (kind?: string | null) => {
    switch (kind) {
      case 'status-update':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">status-update</span>;
      case 'artifact-update':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30">artifact-update</span>;
      case 'task':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">task</span>;
      case 'gateway.note':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30">gateway.note</span>;
      case 'parse_error':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-500/20 text-red-400 border border-red-500/30">parse_error</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-500/20 text-slate-400 border border-slate-500/30">{kind || 'event'}</span>;
    }
  };

  // Duration
  let durationStr = '—';
  if (task?.started_at && task?.last_event_at) {
    const ms = new Date(task.last_event_at).getTime() - new Date(task.started_at).getTime();
    durationStr = ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(2)} s`;
  }

  const scrollToEvent = (seq: number) => {
    const el = document.getElementById(`event-seq-${seq}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto flex flex-col h-[calc(100vh-7rem)]">
      {/* Top navigation & action bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-100 transition-colors px-2 py-1 rounded hover:bg-slate-800"
        >
          <ArrowLeft size={14} />
          <span>Back to Tasks</span>
        </button>
        <button
          onClick={refresh}
          className="flex items-center space-x-1 px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-colors"
        >
          <RefreshCw size={12} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Hero Task Header Strip */}
      <div className="p-4 rounded-lg bg-card border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-semibold text-slate-400">Task</span>
            <div className="flex items-center space-x-1.5 font-mono text-xs bg-slate-900 px-2 py-1 rounded border border-slate-800">
              <span className="text-blue-300 font-medium select-all">{taskId}</span>
              <button
                onClick={handleCopyId}
                className="text-slate-500 hover:text-slate-300 transition-colors p-0.5 rounded"
                title="Copy Task ID"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              </button>
            </div>
            {task && <StateChip state={task.current_state} />}
            {task?.is_terminal && (
              <span className="text-[11px] text-slate-400 font-medium bg-slate-800 px-1.5 py-0.5 rounded">Terminal</span>
            )}
          </div>

          <div className="flex items-center space-x-4 text-xs text-slate-400">
            {task?.started_at && (
              <span title={new Date(task.started_at).toLocaleString()}>
                Started: <span className="text-slate-300">{new Date(task.started_at).toLocaleTimeString()}</span>
              </span>
            )}
            <span className="flex items-center space-x-1">
              <Clock size={12} />
              <span>Duration: <span className="text-slate-200 font-mono">{durationStr}</span></span>
            </span>
          </div>
        </div>

        {/* 3am Test Hero Alert Banner */}
        {gatewayNoteMessage && (
          <div className="p-3 bg-red-950/40 border border-red-500/60 text-red-200 flex items-start justify-between text-xs animate-in fade-in">
            <div className="flex items-start space-x-2">
              <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-red-100 uppercase tracking-wide mr-1.5 text-[10px] bg-red-900/60 border border-red-700/60 px-1 py-0.5">gateway.note</span>
                <span className="font-semibold text-red-200">{gatewayNoteMessage}</span>
              </div>
            </div>
            {gatewayNoteEvent && (
              <button
                onClick={() => scrollToEvent(gatewayNoteEvent.seq)}
                className="text-xs text-red-400 hover:text-red-200 underline shrink-0 ml-3 font-mono"
              >
                Jump to event #{gatewayNoteEvent.seq}
              </button>
            )}
          </div>
        )}

        {/* Timeline Incompleteness Indicator */}
        {isIncomplete && !gatewayNoteMessage && (
          <div className="p-3 bg-amber-950/40 border border-amber-500/60 text-amber-200 flex items-start justify-between text-xs animate-in fade-in">
            <div className="flex items-start space-x-2">
              <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-amber-100 uppercase tracking-wide mr-1.5 text-[10px] bg-amber-900/60 border border-amber-700/60 px-1 py-0.5">
                  timeline incomplete
                </span>
                <span className="font-medium text-amber-200">
                  {incompletenessReason || 'Some events were lost under backpressure or socket drop.'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Vertical Timeline container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 rounded-lg bg-card/60 border border-slate-800 space-y-4 pr-3"
      >
        {loading && events.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-sm">Loading event stream...</div>
        ) : events.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <div className="text-slate-400 font-medium">No events recorded</div>
            <p className="text-xs text-slate-500">No events found for task {taskId}.</p>
          </div>
        ) : (
          <div className="relative border-l border-slate-800/80 ml-6 space-y-6">
            {events.map((ev) => {
              const payload = ev.payload?.result || ev.payload || {};
              const isGatewayNote = ev.kind === 'gateway.note';

              // Extract preview message
              let messageText = '';
              if (payload.status?.message?.parts) {
                messageText = payload.status.message.parts
                  .map((p: any) => p.text || '')
                  .join(' ');
              } else if (payload.message) {
                messageText = typeof payload.message === 'string' ? payload.message : JSON.stringify(payload.message);
              } else if (isGatewayNote) {
                messageText = payload.message || payload.detail || 'Gateway transport evidence recorded';
              }

              // Extract artifacts
              const artifacts = payload.artifact ? [payload.artifact] : payload.artifacts || [];

              const isExpanded = !!expandedMessages[ev.seq];
              const shouldTruncate = messageText.length > 200;
              const displayText = shouldTruncate && !isExpanded ? `${messageText.slice(0, 200)}...` : messageText;

              return (
                <div
                  key={`${ev.seq}-${ev.id}`}
                  id={`event-seq-${ev.seq}`}
                  className={`relative pl-8 transition-all ${
                    isGatewayNote ? 'bg-orange-950/20 -mr-2 p-3 rounded-lg border-l-4 border-orange-500 shadow-sm' : ''
                  }`}
                >
                  {/* Dot on left vertical rail */}
                  <div
                    className={`absolute -left-1.5 top-1.5 w-3 h-3 rounded-full border-2 ${
                      isGatewayNote
                        ? 'bg-orange-500 border-orange-300 ring-2 ring-orange-500/30'
                        : ev.kind === 'artifact-update'
                        ? 'bg-purple-500 border-purple-300'
                        : ev.state === 'completed'
                        ? 'bg-emerald-500 border-emerald-300'
                        : 'bg-slate-700 border-slate-900'
                    }`}
                  />

                  {/* Event content card */}
                  <div className="space-y-1.5">
                    {/* Event metadata header */}
                    <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs text-slate-400">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-slate-500 font-semibold">#{ev.seq}</span>
                        {getKindBadge(ev.kind)}
                        {ev.state && <StateChip state={ev.state} />}
                        {isGatewayNote && (
                          <span className="text-[11px] uppercase font-bold tracking-wider text-orange-400">
                            gateway forensic
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-3 text-[11px] font-mono text-slate-400">
                        {ev.latency_ms !== null && ev.latency_ms !== undefined && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                            +{ev.latency_ms} ms
                          </span>
                        )}
                        <span>{new Date(ev.observed_at).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    {/* Message preview */}
                    {messageText && (
                      <div className="text-xs text-slate-200 leading-relaxed font-sans mt-1">
                        {isGatewayNote && <span className="font-semibold text-orange-300">gateway observed: </span>}
                        <span>{displayText}</span>
                        {shouldTruncate && (
                          <button
                            onClick={() => toggleMessageExpand(ev.seq)}
                            className="text-blue-400 hover:text-blue-300 ml-1.5 text-[11px]"
                          >
                            {isExpanded ? 'Show less' : 'Read more'}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Artifacts preview & download */}
                    {artifacts.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {artifacts.map((art: any, i: number) => (
                          <div
                            key={i}
                            className="flex items-center justify-between px-3 py-2 rounded bg-purple-950/20 border border-purple-500/30 text-xs"
                          >
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-purple-300">{art.name || 'Artifact'}</span>
                              <span className="text-[11px] text-purple-400/80">
                                ({art.parts?.length || 1} part{art.parts?.length === 1 ? '' : 's'})
                              </span>
                            </div>
                            <button
                              onClick={() => handleDownloadArtifact(art)}
                              className="flex items-center space-x-1 px-2 py-1 rounded bg-purple-900/40 hover:bg-purple-800/50 text-purple-200 border border-purple-500/40 transition-colors"
                              title="Download artifact payload"
                            >
                              <Download size={12} />
                              <span>Download</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Collapsible raw JSON viewer */}
                    <JsonViewer data={ev.payload} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

