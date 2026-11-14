import React, { useState } from 'react';
import {
  Rocket,
  Shield,
  Activity,
  Layers,
  Server,
  Network,
  Key,
  Radio,
  Terminal,
  Boxes,
  Zap,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  MoreVertical,
  GripVertical,
  X,
  Info,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  RefreshCw,
} from 'lucide-react';
import { TaskSummary } from '../lib/types';
import { StateChip } from '../components/StateChip';

interface ConsoleHomeProps {
  tasks: TaskSummary[];
  loading: boolean;
  onSelectTask: (taskId: string) => void;
  onNavigate: (tab: 'home' | 'tasks' | 'agents' | 'gateway') => void;
  onOpenCli: () => void;
}

export function ConsoleHome({
  tasks,
  loading,
  onSelectTask,
  onNavigate,
  onOpenCli,
}: ConsoleHomeProps) {
  const [showBanner, setShowBanner] = useState(true);
  const [activeTasksTab, setActiveTasksTab] = useState<'needs_attention' | 'in_flight' | 'terminal' | 'all'>('needs_attention');

  // Live task segmentation
  const failedTasks = tasks.filter((t) => {
    const s = (t.current_state || '').toLowerCase();
    return ['failed', 'rejected', 'input-required'].includes(s);
  });
  const inFlightTasks = tasks.filter((t) => !t.is_terminal);
  const completedTasks = tasks.filter((t) => t.is_terminal && !failedTasks.includes(t));

  const displayedTasks =
    activeTasksTab === 'needs_attention'
      ? failedTasks
      : activeTasksTab === 'in_flight'
      ? inFlightTasks
      : activeTasksTab === 'terminal'
      ? completedTasks
      : tasks;

  return (
    <div className="space-y-4 text-neutral-200">
      {/* 1. Pure Black Gateway Announcement Banner */}
      {showBanner && (
        <div className="relative bg-[#080808] border border-neutral-800 p-4 shadow-sm">
          <button
            onClick={() => setShowBanner(false)}
            className="absolute top-3 right-3 text-neutral-500 hover:text-white p-1 hover:bg-neutral-800 transition-colors"
            title="Dismiss"
          >
            <X size={14} />
          </button>

          <div className="max-w-4xl space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-indigo-500" />
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                A2A Gateway Console • Observability & Telemetry Platform
              </h2>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed font-sans">
              Zero-copy SSE tapping, automatic upstream reconnect handling, and sub-second 3am failure forensics. All your A2A upstream agents consolidated behind one secure, observable endpoint.
            </p>
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                onClick={onOpenCli}
                className="px-3 py-1.5 border border-neutral-700 hover:border-neutral-400 text-xs font-mono text-white bg-black hover:bg-neutral-900 transition-colors flex items-center gap-1.5"
              >
                <Terminal size={12} className="text-indigo-400" />
                <span>Test Gateway Endpoints</span>
              </button>
              <button
                onClick={() => onNavigate('tasks')}
                className="px-3 py-1.5 bg-neutral-100 hover:bg-white text-black text-xs font-semibold font-mono uppercase transition-colors"
              >
                Inspect Live Triage Stream
              </button>
              <span className="text-[11px] font-mono text-neutral-500">
                JSON-RPC 2.0 • SSE Passthrough • Redis Pub/Sub
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Console Title & Actions Bar */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-lg font-bold text-white tracking-tight uppercase font-mono">Gateway Console</h1>
          <span className="text-[10px] font-mono text-neutral-500 border border-neutral-800 px-1.5 py-0.2 uppercase">
            Live Stream
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 text-xs font-mono bg-black hover:bg-neutral-900 text-neutral-300 border border-neutral-800 hover:border-neutral-700 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw size={11} className="text-neutral-400" />
            <span>Reset View</span>
          </button>
          <button
            onClick={() => onNavigate('gateway')}
            className="px-3 py-1.5 text-xs font-mono font-bold bg-white hover:bg-neutral-200 text-black transition-colors flex items-center gap-1"
          >
            <span>+</span>
            <span>Register Route</span>
          </button>
        </div>
      </div>

      {/* 3. Top Row Widgets (3 Columns Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Widget 1: Getting Started & Core Capabilities (col-span-4) */}
        <div className="lg:col-span-4 bg-[#080808] border border-neutral-800 p-4 flex flex-col justify-between hover:border-neutral-700 transition-colors">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-neutral-800 mb-3">
              <div className="flex items-center gap-2">
                <GripVertical size={13} className="text-neutral-600" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">Gateway Quickstart</h3>
              </div>
              <button className="text-neutral-500 hover:text-white p-0.5">
                <MoreVertical size={13} />
              </button>
            </div>

            <div className="space-y-3.5">
              {/* Item 1 */}
              <div
                className="flex items-start gap-3 group cursor-pointer border border-transparent hover:border-neutral-800 p-1.5 -m-1.5 transition-colors"
                onClick={() => onNavigate('gateway')}
              >
                <div className="w-7 h-7 bg-neutral-900 border border-neutral-800 flex items-center justify-center text-indigo-400 shrink-0">
                  <Rocket size={14} />
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-white group-hover:text-indigo-400 flex items-center gap-1 transition-colors">
                    <span>Route Provisioning & Proxying</span>
                    <ArrowUpRight size={11} className="opacity-70" />
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-normal font-sans">
                    Map incoming paths (<code className="text-neutral-300 font-mono text-[10px]">/gw/:route</code>) to upstream agent endpoints with zero-touch credential forwarding.
                  </p>
                </div>
              </div>

              {/* Item 2 */}
              <div
                className="flex items-start gap-3 group cursor-pointer border border-transparent hover:border-neutral-800 p-1.5 -m-1.5 transition-colors"
                onClick={() => onNavigate('tasks')}
              >
                <div className="w-7 h-7 bg-neutral-900 border border-neutral-800 flex items-center justify-center text-rose-400 shrink-0">
                  <Shield size={14} />
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-white group-hover:text-rose-400 flex items-center gap-1 transition-colors">
                    <span>The 3am Test Diagnostic</span>
                    <ArrowUpRight size={11} className="opacity-70" />
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-normal font-sans">
                    Locate upstream mid-stream drops, failure causes, and forensic notes in &lt; 2 minutes without touching server logs.
                  </p>
                </div>
              </div>

              {/* Item 3 */}
              <div
                className="flex items-start gap-3 group cursor-pointer border border-transparent hover:border-neutral-800 p-1.5 -m-1.5 transition-colors"
                onClick={() => onNavigate('agents')}
              >
                <div className="w-7 h-7 bg-neutral-900 border border-neutral-800 flex items-center justify-center text-emerald-400 shrink-0">
                  <Cpu size={14} />
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-white group-hover:text-emerald-400 flex items-center gap-1 transition-colors">
                    <span>Agent Card Cache & Discovery</span>
                    <ArrowUpRight size={11} className="opacity-70" />
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-normal font-sans">
                    Automatic 5s in-memory caching for <code className="text-neutral-300 font-mono text-[10px]">.well-known/agent-card.json</code> with upstream refresh.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Widget 2: Fleet Agents & Subsystems (col-span-5) */}
        <div className="lg:col-span-5 bg-[#080808] border border-neutral-800 p-4 flex flex-col justify-between hover:border-neutral-700 transition-colors">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-neutral-800 mb-3">
              <div className="flex items-center gap-2">
                <GripVertical size={13} className="text-neutral-600" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">Agent Fleet & Subsystems</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('agents')}
                  className="px-2 py-0.5 text-[10px] font-mono uppercase bg-black hover:bg-neutral-900 text-neutral-300 border border-neutral-800 transition-colors"
                >
                  All Agents
                </button>
                <button className="text-neutral-500 hover:text-white p-0.5">
                  <MoreVertical size={13} />
                </button>
              </div>
            </div>

            {/* 2-column Grid of Gateway Agents & Subsystems */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              {/* Column 1 */}
              <div className="space-y-2">
                <button
                  onClick={() => onNavigate('agents')}
                  className="flex items-center gap-2 text-neutral-300 hover:text-white w-full text-left group border border-neutral-900 hover:border-neutral-800 p-1 bg-black"
                >
                  <div className="w-5 h-5 bg-neutral-900 border border-amber-800/80 text-amber-400 flex items-center justify-center font-mono font-bold text-[9px]">
                    EC
                  </div>
                  <span className="font-mono text-[11px] group-hover:underline">Echo Agent (:8101)</span>
                </button>

                <button
                  onClick={() => onNavigate('agents')}
                  className="flex items-center gap-2 text-neutral-300 hover:text-white w-full text-left group border border-neutral-900 hover:border-neutral-800 p-1 bg-black"
                >
                  <div className="w-5 h-5 bg-neutral-900 border border-blue-800/80 text-blue-400 flex items-center justify-center text-[10px]">
                    <Layers size={11} />
                  </div>
                  <span className="font-mono text-[11px] group-hover:underline">Research (:8102)</span>
                </button>

                <button
                  onClick={() => onNavigate('agents')}
                  className="flex items-center gap-2 text-neutral-300 hover:text-white w-full text-left group border border-neutral-900 hover:border-neutral-800 p-1 bg-black"
                >
                  <div className="w-5 h-5 bg-neutral-900 border border-rose-800/80 text-rose-400 flex items-center justify-center text-[10px]">
                    <Zap size={11} />
                  </div>
                  <span className="font-mono text-[11px] group-hover:underline">Flaky Agent (:8103)</span>
                </button>

                <button
                  onClick={() => onNavigate('tasks')}
                  className="flex items-center gap-2 text-neutral-300 hover:text-white w-full text-left group border border-neutral-900 hover:border-neutral-800 p-1 bg-black"
                >
                  <div className="w-5 h-5 bg-neutral-900 border border-cyan-800/80 text-cyan-400 flex items-center justify-center text-[10px]">
                    <Activity size={11} />
                  </div>
                  <span className="font-mono text-[11px] group-hover:underline">Triage Priority Engine</span>
                </button>

                <button
                  onClick={() => onNavigate('tasks')}
                  className="flex items-center gap-2 text-neutral-300 hover:text-white w-full text-left group border border-neutral-900 hover:border-neutral-800 p-1 bg-black"
                >
                  <div className="w-5 h-5 bg-neutral-900 border border-purple-800/80 text-purple-400 flex items-center justify-center text-[10px]">
                    <Clock size={11} />
                  </div>
                  <span className="font-mono text-[11px] group-hover:underline">Task Timeline Tap</span>
                </button>
              </div>

              {/* Column 2 */}
              <div className="space-y-2">
                <button
                  onClick={() => onNavigate('gateway')}
                  className="flex items-center gap-2 text-neutral-300 hover:text-white w-full text-left group border border-neutral-900 hover:border-neutral-800 p-1 bg-black"
                >
                  <div className="w-5 h-5 bg-neutral-900 border border-emerald-800/80 text-emerald-400 flex items-center justify-center text-[10px]">
                    <Network size={11} />
                  </div>
                  <span className="font-mono text-[11px] group-hover:underline">Route Mapping</span>
                </button>

                <button
                  onClick={() => onNavigate('gateway')}
                  className="flex items-center gap-2 text-neutral-300 hover:text-white w-full text-left group border border-neutral-900 hover:border-neutral-800 p-1 bg-black"
                >
                  <div className="w-5 h-5 bg-neutral-900 border border-indigo-800/80 text-indigo-400 flex items-center justify-center text-[10px]">
                    <Key size={11} />
                  </div>
                  <span className="font-mono text-[11px] group-hover:underline">API Key Vault</span>
                </button>

                <button
                  onClick={() => onNavigate('tasks')}
                  className="flex items-center gap-2 text-neutral-300 hover:text-white w-full text-left group border border-neutral-900 hover:border-neutral-800 p-1 bg-black"
                >
                  <div className="w-5 h-5 bg-neutral-900 border border-red-800/80 text-red-400 flex items-center justify-center text-[10px]">
                    <Radio size={11} />
                  </div>
                  <span className="font-mono text-[11px] group-hover:underline">Redis Event Bus</span>
                </button>

                <button
                  onClick={onOpenCli}
                  className="flex items-center gap-2 text-neutral-300 hover:text-white w-full text-left group border border-neutral-900 hover:border-neutral-800 p-1 bg-black"
                >
                  <div className="w-5 h-5 bg-neutral-900 border border-neutral-700 text-neutral-300 flex items-center justify-center text-[10px]">
                    <Terminal size={11} />
                  </div>
                  <span className="font-mono text-[11px] group-hover:underline">Gateway Shell</span>
                </button>

                <button
                  onClick={() => onNavigate('gateway')}
                  className="flex items-center gap-2 text-neutral-300 hover:text-white w-full text-left group border border-neutral-900 hover:border-neutral-800 p-1 bg-black"
                >
                  <div className="w-5 h-5 bg-neutral-900 border border-teal-800/80 text-teal-400 flex items-center justify-center text-[10px]">
                    <Boxes size={11} />
                  </div>
                  <span className="font-mono text-[11px] group-hover:underline">Synthetic Note Writer</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Widget 3: Gateway Health & Triage Status (col-span-3) */}
        <div className="lg:col-span-3 bg-[#080808] border border-neutral-800 p-4 flex flex-col justify-between hover:border-neutral-700 transition-colors">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-neutral-800 mb-3">
              <div className="flex items-center gap-2">
                <GripVertical size={13} className="text-neutral-600" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">Gateway Health</h3>
              </div>
              <button className="text-neutral-500 hover:text-white p-0.5">
                <MoreVertical size={13} />
              </button>
            </div>

            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-mono uppercase text-neutral-500">Needs Attention</div>
                  <div className="text-xl font-mono font-bold text-white flex items-center gap-2 pt-0.5">
                    <span className={failedTasks.length > 0 ? 'text-rose-400' : 'text-neutral-200'}>
                      {failedTasks.length}
                    </span>
                    {failedTasks.length > 0 && (
                      <span className="text-[10px] px-1 py-0.2 bg-rose-950/60 text-rose-400 font-mono border border-rose-800 uppercase">
                        3am Alert
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-[10px] font-mono text-neutral-600 text-right uppercase">Active Failures</div>
              </div>

              <div className="flex items-center justify-between border-t border-neutral-800 pt-2.5">
                <div>
                  <div className="text-[11px] font-mono uppercase text-neutral-500">In-Flight Streams</div>
                  <div className="text-xl font-mono font-bold text-blue-400 flex items-center gap-2 pt-0.5">
                    <span>{inFlightTasks.length}</span>
                    {inFlightTasks.length > 0 && (
                      <span className="w-1.5 h-1.5 bg-blue-400" />
                    )}
                  </div>
                </div>
                <div className="text-[10px] font-mono text-neutral-600 text-right uppercase">Streaming</div>
              </div>

              <div className="flex items-center justify-between border-t border-neutral-800 pt-2.5">
                <div>
                  <div className="text-[11px] font-mono uppercase text-neutral-500">Completed Tasks</div>
                  <div className="text-xl font-mono font-bold text-emerald-400 pt-0.5">
                    {completedTasks.length}
                  </div>
                </div>
                <div className="text-[10px] font-mono text-neutral-600 text-right uppercase">Terminal</div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-neutral-800 mt-3 text-right">
            <button
              onClick={() => onNavigate('tasks')}
              className="text-xs font-mono text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 uppercase"
            >
              <span>Go to Triage Queue</span>
              <ArrowUpRight size={11} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Bottom Row Widgets: Traffic & Latency + Live Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Widget 4: Traffic & Latency Explorer (col-span-5) */}
        <div className="lg:col-span-5 bg-[#080808] border border-neutral-800 p-4 flex flex-col justify-between hover:border-neutral-700 transition-colors">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-neutral-800 mb-3">
              <div className="flex items-center gap-2">
                <GripVertical size={13} className="text-neutral-600" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">Traffic & Telemetry</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('tasks')}
                  className="px-2 py-0.5 text-[10px] font-mono uppercase bg-black hover:bg-neutral-900 text-neutral-300 border border-neutral-800 transition-colors"
                >
                  Stream Logs
                </button>
                <button className="text-neutral-500 hover:text-white p-0.5">
                  <MoreVertical size={13} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              {/* Left Column: Metrics Summary */}
              <div className="sm:col-span-5 space-y-3">
                <div>
                  <div className="text-[10px] font-mono uppercase text-neutral-500">Total Tasks Handled</div>
                  <div className="text-xl font-mono font-bold text-white flex items-center gap-1.5 pt-0.5">
                    <span>{tasks.length}</span>
                    <span className="text-[10px] font-mono text-emerald-400 flex items-center">
                      <TrendingUp size={10} /> +12%
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-mono uppercase text-neutral-500">Median Chunk Gap</div>
                  <div className="text-sm font-mono font-semibold text-white flex items-center gap-1.5 pt-0.5">
                    <span>500.6 ms</span>
                    <span className="text-[10px] font-mono text-blue-400 flex items-center">
                      <TrendingDown size={10} /> 0.2%
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-mono uppercase text-neutral-500">Upstream Drops (Simulated)</div>
                  <div className="text-sm font-mono font-semibold text-rose-400 flex items-center gap-1 pt-0.5">
                    <span>{failedTasks.length} dropped</span>
                    <Info size={10} className="text-neutral-600" />
                  </div>
                </div>
              </div>

              {/* Right Column: Stacked Sharp Telemetry Bar Chart */}
              <div className="sm:col-span-7">
                <div className="text-[9px] font-mono uppercase text-neutral-500 text-right mb-1">Volume by Agent (Events)</div>
                <div className="h-32 flex items-end justify-between gap-1.5 pt-2 border-b border-neutral-800">
                  {[
                    { label: 'T-50m', c1: 'h-4 bg-amber-600', c2: 'h-6 bg-blue-600', c3: 'h-2 bg-rose-600' },
                    { label: 'T-40m', c1: 'h-5 bg-amber-600', c2: 'h-7 bg-blue-600', c3: 'h-1 bg-rose-600' },
                    { label: 'T-30m', c1: 'h-7 bg-amber-600', c2: 'h-9 bg-blue-600', c3: 'h-3 bg-rose-600' },
                    { label: 'T-20m', c1: 'h-8 bg-amber-600', c2: 'h-10 bg-blue-600', c3: 'h-2 bg-rose-600' },
                    { label: 'T-10m', c1: 'h-7 bg-amber-600', c2: 'h-8 bg-blue-600', c3: 'h-3 bg-rose-600' },
                    { label: 'Now', c1: 'h-9 bg-amber-600', c2: 'h-11 bg-blue-600', c3: 'h-2 bg-rose-600' },
                  ].map((bar, idx) => (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center gap-1 group cursor-pointer"
                    >
                      <div className="w-full max-w-[24px] flex flex-col-reverse bg-neutral-900 border border-neutral-800 group-hover:brightness-125 transition-all">
                        <div className={`w-full ${bar.c3}`} title="Flaky/Error drops" />
                        <div className={`w-full ${bar.c2}`} title="Research stream events" />
                        <div className={`w-full ${bar.c1}`} title="Echo completions" />
                      </div>
                      <span className="text-[9px] font-mono text-neutral-500 origin-center truncate">
                        {bar.label}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center text-[9px] font-mono text-neutral-500 pt-1 uppercase">
                  <span>Relative</span>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-amber-600" />Echo</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-blue-600" />Research</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-rose-600" />Flaky</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Widget 5: Live Tasks Feed (col-span-7) */}
        <div className="lg:col-span-7 bg-[#080808] border border-neutral-800 p-4 flex flex-col justify-between hover:border-neutral-700 transition-colors">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-neutral-800 mb-2">
              <div className="flex items-center gap-2">
                <GripVertical size={13} className="text-neutral-600" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">Live Agent Tasks Stream</h3>
              </div>
              <button
                onClick={() => onNavigate('tasks')}
                className="text-xs font-mono text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 uppercase"
              >
                <span>View Full Table</span>
                <ArrowUpRight size={11} />
              </button>
            </div>

            <p className="text-[11px] text-neutral-400 mb-3 font-sans">
              Real-time tasks ordered by triage priority: failed tasks needing attention first, active streams second, terminal third.
            </p>

            {/* Filter Tabs */}
            <div className="flex items-center gap-3 border-b border-neutral-800 text-xs mb-3 font-mono">
              <button
                onClick={() => setActiveTasksTab('needs_attention')}
                className={`pb-1.5 font-medium transition-colors border-b-2 flex items-center gap-1 uppercase text-[11px] ${
                  activeTasksTab === 'needs_attention'
                    ? 'border-rose-500 text-rose-400'
                    : 'border-transparent text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <span>Needs Attention ({failedTasks.length})</span>
              </button>

              <button
                onClick={() => setActiveTasksTab('in_flight')}
                className={`pb-1.5 font-medium transition-colors border-b-2 flex items-center gap-1 uppercase text-[11px] ${
                  activeTasksTab === 'in_flight'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <span>In Flight ({inFlightTasks.length})</span>
              </button>

              <button
                onClick={() => setActiveTasksTab('terminal')}
                className={`pb-1.5 font-medium transition-colors border-b-2 flex items-center gap-1 uppercase text-[11px] ${
                  activeTasksTab === 'terminal'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <span>Completed ({completedTasks.length})</span>
              </button>

              <button
                onClick={() => setActiveTasksTab('all')}
                className={`pb-1.5 font-medium transition-colors border-b-2 flex items-center gap-1 uppercase text-[11px] ${
                  activeTasksTab === 'all'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <span>All ({tasks.length})</span>
              </button>
            </div>

            {/* Tasks List */}
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {displayedTasks.length === 0 ? (
                <div className="py-8 text-center text-xs font-mono text-neutral-600 uppercase">
                  No tasks matching the selected filter.
                </div>
              ) : (
                displayedTasks.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onSelectTask(t.id)}
                    className="flex items-center justify-between p-2 bg-black hover:bg-neutral-900 border border-neutral-800/80 hover:border-neutral-700 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <StateChip state={t.current_state} />
                      <div className="truncate">
                        <div className="text-xs font-mono text-neutral-200 group-hover:text-indigo-400 transition-colors truncate max-w-[200px] sm:max-w-[320px]">
                          {t.id}
                        </div>
                        {t.error_summary && (
                          <div className="text-[10px] font-mono text-rose-400 truncate">
                            {t.error_summary}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-right">
                      <span className="text-[10px] text-neutral-500 font-mono hidden sm:inline">
                        {t.last_event_at ? new Date(t.last_event_at).toLocaleTimeString() : 'now'}
                      </span>
                      <span className="text-[11px] font-mono text-indigo-400 group-hover:underline flex items-center gap-0.5">
                        <span>Timeline</span>
                        <ArrowUpRight size={10} />
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
