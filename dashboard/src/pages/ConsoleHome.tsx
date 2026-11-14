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
    <div className="space-y-4 text-slate-200 font-sans">
      {/* 1. Pure Black Gateway Announcement Banner */}
      {showBanner && (
        <div className="relative bg-[#080808] border border-neutral-800 p-4 shadow-sm">
          <button
            onClick={() => setShowBanner(false)}
            className="absolute top-3 right-3 text-neutral-500 hover:text-white p-1 hover:bg-neutral-800 transition-colors"
            title="Dismiss"
          >
            <X size={15} />
          </button>

          <div className="max-w-4xl space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-indigo-500" />
              <h2 className="text-sm font-semibold text-white tracking-tight">
                A2A Gateway Console • Observability & Telemetry Platform
              </h2>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Zero-copy SSE tapping, automatic upstream reconnect handling, and sub-second 3am failure forensics. All your A2A upstream agents consolidated behind one secure, observable endpoint.
            </p>
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                onClick={onOpenCli}
                className="px-3 py-1.5 border border-neutral-700 hover:border-neutral-400 text-xs font-medium text-white bg-black hover:bg-neutral-900 transition-colors flex items-center gap-1.5"
              >
                <Terminal size={12} className="text-indigo-400" />
                <span>Test Gateway Endpoints</span>
              </button>
              <button
                onClick={() => onNavigate('tasks')}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold transition-colors"
              >
                Inspect Live Triage Stream
              </button>
              <span className="text-[11px] text-slate-400">
                JSON-RPC 2.0 • SSE Passthrough • Redis Pub/Sub
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Console Title & Actions Bar */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-white tracking-tight">Gateway Console</h1>
          <span className="text-xs text-blue-400 hover:underline cursor-pointer flex items-center gap-0.5">
            overview
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 text-xs font-medium bg-black hover:bg-neutral-900 text-slate-300 border border-neutral-800 hover:border-neutral-700 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw size={12} className="text-slate-400" />
            <span>Reset View</span>
          </button>
          <button
            onClick={() => onNavigate('gateway')}
            className="px-3 py-1.5 text-xs font-bold bg-white hover:bg-slate-100 text-slate-900 transition-colors flex items-center gap-1.5"
          >
            <span>+</span>
            <span>Register Route</span>
          </button>
        </div>
      </div>

      {/* 3. Top Row Widgets (3 Columns Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Widget 1: Getting Started & Core Capabilities (col-span-4) */}
        <div className="lg:col-span-4 bg-[#080808] border border-neutral-800 p-4 flex flex-col justify-between hover:border-neutral-700 transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
              <div className="flex items-center gap-2">
                <GripVertical size={14} className="text-neutral-600 cursor-grab" />
                <h3 className="text-sm font-bold text-white">Gateway Quickstart</h3>
              </div>
              <button className="text-neutral-400 hover:text-white p-0.5">
                <MoreVertical size={14} />
              </button>
            </div>

            <div className="space-y-3.5">
              {/* Item 1 */}
              <div
                className="flex items-start gap-3 group cursor-pointer transition-colors"
                onClick={() => onNavigate('gateway')}
              >
                <div className="w-7 h-7 bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                  <Rocket size={15} />
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-white group-hover:text-orange-400 flex items-center gap-1 transition-colors">
                    <span className="underline underline-offset-2 decoration-neutral-600 group-hover:decoration-orange-400">Route Provisioning & Proxying</span>
                    <ArrowUpRight size={11} className="opacity-70 group-hover:text-orange-400" />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Map incoming paths (<code className="text-slate-300 font-mono text-[10px]">/gw/:route</code>) to upstream agent endpoints with zero-touch credential forwarding.
                  </p>
                </div>
              </div>

              {/* Item 2 */}
              <div
                className="flex items-start gap-3 group cursor-pointer transition-colors"
                onClick={() => onNavigate('tasks')}
              >
                <div className="w-7 h-7 bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
                  <Shield size={15} />
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-white group-hover:text-orange-400 flex items-center gap-1 transition-colors">
                    <span className="underline underline-offset-2 decoration-neutral-600 group-hover:decoration-orange-400">The 3am Test Diagnostic</span>
                    <ArrowUpRight size={11} className="opacity-70 group-hover:text-orange-400" />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Locate upstream mid-stream drops, failure causes, and forensic notes in &lt; 2 minutes without touching server logs.
                  </p>
                </div>
              </div>

              {/* Item 3 */}
              <div
                className="flex items-start gap-3 group cursor-pointer transition-colors"
                onClick={() => onNavigate('agents')}
              >
                <div className="w-7 h-7 bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                  <Cpu size={15} />
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-white group-hover:text-orange-400 flex items-center gap-1 transition-colors">
                    <span className="underline underline-offset-2 decoration-neutral-600 group-hover:decoration-orange-400">Agent Card Cache & Discovery</span>
                    <ArrowUpRight size={11} className="opacity-70 group-hover:text-orange-400" />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Automatic 5s in-memory caching for <code className="text-slate-300 font-mono text-[10px]">.well-known/agent-card.json</code> with upstream refresh.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Widget 2: Fleet Agents & Subsystems (col-span-5) - Permanent Underline + Orange on Hover */}
        <div className="lg:col-span-5 bg-[#080808] border border-neutral-800 p-4 flex flex-col justify-between hover:border-neutral-700 transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
              <div className="flex items-center gap-2">
                <GripVertical size={14} className="text-neutral-600 cursor-grab" />
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>Agent Fleet & Subsystems</span>
                  <span className="text-[11px] text-blue-400 font-normal">info</span>
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('agents')}
                  className="px-2.5 py-1 text-[11px] font-medium bg-black hover:bg-neutral-900 text-slate-300 border border-neutral-800 transition-colors"
                >
                  All Agents
                </button>
                <button className="text-neutral-400 hover:text-white p-0.5">
                  <MoreVertical size={14} />
                </button>
              </div>
            </div>

            {/* 2-column Grid of Gateway Agents & Subsystems - Permanent Underline + Orange Hover */}
            <div className="grid grid-cols-2 gap-x-5 gap-y-2 text-xs">
              {/* Column 1 */}
              <div className="space-y-1.5">
                <button
                  onClick={() => onNavigate('agents')}
                  className="flex items-center gap-2.5 text-slate-300 w-full text-left group py-1 transition-colors"
                >
                  <div className="w-5 h-5 bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-[9px] shrink-0 group-hover:bg-orange-500/20 group-hover:text-orange-400 transition-colors">
                    EC
                  </div>
                  <span className="underline underline-offset-2 decoration-neutral-500 group-hover:text-orange-400 group-hover:decoration-orange-400 text-xs truncate transition-colors">
                    Echo Agent (:8101)
                  </span>
                </button>

                <button
                  onClick={() => onNavigate('agents')}
                  className="flex items-center gap-2.5 text-slate-300 w-full text-left group py-1 transition-colors"
                >
                  <div className="w-5 h-5 bg-blue-500/10 text-blue-400 flex items-center justify-center text-[10px] shrink-0 group-hover:bg-orange-500/20 group-hover:text-orange-400 transition-colors">
                    <Layers size={12} />
                  </div>
                  <span className="underline underline-offset-2 decoration-neutral-500 group-hover:text-orange-400 group-hover:decoration-orange-400 text-xs truncate transition-colors">
                    Research (:8102)
                  </span>
                </button>

                <button
                  onClick={() => onNavigate('agents')}
                  className="flex items-center gap-2.5 text-slate-300 w-full text-left group py-1 transition-colors"
                >
                  <div className="w-5 h-5 bg-rose-500/10 text-rose-400 flex items-center justify-center text-[10px] shrink-0 group-hover:bg-orange-500/20 group-hover:text-orange-400 transition-colors">
                    <Zap size={12} />
                  </div>
                  <span className="underline underline-offset-2 decoration-neutral-500 group-hover:text-orange-400 group-hover:decoration-orange-400 text-xs truncate transition-colors">
                    Flaky Agent (:8103)
                  </span>
                </button>

                <button
                  onClick={() => onNavigate('tasks')}
                  className="flex items-center gap-2.5 text-slate-300 w-full text-left group py-1 transition-colors"
                >
                  <div className="w-5 h-5 bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-[10px] shrink-0 group-hover:bg-orange-500/20 group-hover:text-orange-400 transition-colors">
                    <Activity size={12} />
                  </div>
                  <span className="underline underline-offset-2 decoration-neutral-500 group-hover:text-orange-400 group-hover:decoration-orange-400 text-xs truncate transition-colors">
                    Triage Priority Engine
                  </span>
                </button>

                <button
                  onClick={() => onNavigate('tasks')}
                  className="flex items-center gap-2.5 text-slate-300 w-full text-left group py-1 transition-colors"
                >
                  <div className="w-5 h-5 bg-purple-500/10 text-purple-400 flex items-center justify-center text-[10px] shrink-0 group-hover:bg-orange-500/20 group-hover:text-orange-400 transition-colors">
                    <Clock size={12} />
                  </div>
                  <span className="underline underline-offset-2 decoration-neutral-500 group-hover:text-orange-400 group-hover:decoration-orange-400 text-xs truncate transition-colors">
                    Task Timeline Tap
                  </span>
                </button>
              </div>

              {/* Column 2 */}
              <div className="space-y-1.5">
                <button
                  onClick={() => onNavigate('gateway')}
                  className="flex items-center gap-2.5 text-slate-300 w-full text-left group py-1 transition-colors"
                >
                  <div className="w-5 h-5 bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-[10px] shrink-0 group-hover:bg-orange-500/20 group-hover:text-orange-400 transition-colors">
                    <Network size={12} />
                  </div>
                  <span className="underline underline-offset-2 decoration-neutral-500 group-hover:text-orange-400 group-hover:decoration-orange-400 text-xs truncate transition-colors">
                    Route Mapping
                  </span>
                </button>

                <button
                  onClick={() => onNavigate('gateway')}
                  className="flex items-center gap-2.5 text-slate-300 w-full text-left group py-1 transition-colors"
                >
                  <div className="w-5 h-5 bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-[10px] shrink-0 group-hover:bg-orange-500/20 group-hover:text-orange-400 transition-colors">
                    <Key size={12} />
                  </div>
                  <span className="underline underline-offset-2 decoration-neutral-500 group-hover:text-orange-400 group-hover:decoration-orange-400 text-xs truncate transition-colors">
                    API Key Vault
                  </span>
                </button>

                <button
                  onClick={() => onNavigate('tasks')}
                  className="flex items-center gap-2.5 text-slate-300 w-full text-left group py-1 transition-colors"
                >
                  <div className="w-5 h-5 bg-red-500/10 text-red-400 flex items-center justify-center text-[10px] shrink-0 group-hover:bg-orange-500/20 group-hover:text-orange-400 transition-colors">
                    <Radio size={12} />
                  </div>
                  <span className="underline underline-offset-2 decoration-neutral-500 group-hover:text-orange-400 group-hover:decoration-orange-400 text-xs truncate transition-colors">
                    Redis Event Bus
                  </span>
                </button>

                <button
                  onClick={onOpenCli}
                  className="flex items-center gap-2.5 text-slate-300 w-full text-left group py-1 transition-colors"
                >
                  <div className="w-5 h-5 bg-neutral-800 text-neutral-300 flex items-center justify-center text-[10px] shrink-0 group-hover:bg-orange-500/20 group-hover:text-orange-400 transition-colors">
                    <Terminal size={12} />
                  </div>
                  <span className="underline underline-offset-2 decoration-neutral-500 group-hover:text-orange-400 group-hover:decoration-orange-400 text-xs truncate transition-colors">
                    Gateway Shell
                  </span>
                </button>

                <button
                  onClick={() => onNavigate('gateway')}
                  className="flex items-center gap-2.5 text-slate-300 w-full text-left group py-1 transition-colors"
                >
                  <div className="w-5 h-5 bg-teal-500/10 text-teal-400 flex items-center justify-center text-[10px] shrink-0 group-hover:bg-orange-500/20 group-hover:text-orange-400 transition-colors">
                    <Boxes size={12} />
                  </div>
                  <span className="underline underline-offset-2 decoration-neutral-500 group-hover:text-orange-400 group-hover:decoration-orange-400 text-xs truncate transition-colors">
                    Synthetic Note Writer
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Widget 3: Gateway Health & Triage Status (col-span-3) */}
        <div className="lg:col-span-3 bg-[#080808] border border-neutral-800 p-4 flex flex-col justify-between hover:border-neutral-700 transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
              <div className="flex items-center gap-2">
                <GripVertical size={14} className="text-neutral-600 cursor-grab" />
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>Gateway Health</span>
                  <span className="text-[11px] text-blue-400 font-normal">live</span>
                </h3>
              </div>
              <button className="text-neutral-400 hover:text-white p-0.5">
                <MoreVertical size={14} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Needs Attention</div>
                  <div className="text-lg font-bold text-white flex items-center gap-2 pt-0.5">
                    <span className={failedTasks.length > 0 ? 'text-rose-400' : 'text-slate-200'}>
                      {failedTasks.length}
                    </span>
                    {failedTasks.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 bg-rose-950/60 text-rose-400 font-medium border border-rose-800">
                        3am Alert
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 text-right">Active Failures</div>
              </div>

              <div className="flex items-center justify-between border-t border-neutral-800 pt-3">
                <div>
                  <div className="text-xs text-slate-400">In-Flight Streams</div>
                  <div className="text-lg font-bold text-blue-400 flex items-center gap-2 pt-0.5">
                    <span>{inFlightTasks.length}</span>
                    {inFlightTasks.length > 0 && (
                      <span className="w-1.5 h-1.5 bg-blue-400" />
                    )}
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 text-right">Streaming</div>
              </div>

              <div className="flex items-center justify-between border-t border-neutral-800 pt-3">
                <div>
                  <div className="text-xs text-slate-400">Completed Tasks</div>
                  <div className="text-lg font-bold text-emerald-400 pt-0.5">
                    {completedTasks.length}
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 text-right">Terminal</div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-neutral-800 mt-3 text-right">
            <button
              onClick={() => onNavigate('tasks')}
              className="text-xs text-blue-400 hover:text-orange-400 font-medium inline-flex items-center gap-1 group transition-colors"
            >
              <span className="underline underline-offset-2 decoration-neutral-600 group-hover:decoration-orange-400">Go to Triage Queue</span>
              <ArrowUpRight size={11} className="group-hover:text-orange-400" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Bottom Row Widgets: Traffic & Latency + Live Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Widget 4: Traffic & Latency Explorer (col-span-5) */}
        <div className="lg:col-span-5 bg-[#080808] border border-neutral-800 p-4 flex flex-col justify-between hover:border-neutral-700 transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
              <div className="flex items-center gap-2">
                <GripVertical size={14} className="text-neutral-600 cursor-grab" />
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>Traffic & Telemetry</span>
                  <span className="text-[11px] text-blue-400 font-normal">metrics</span>
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('tasks')}
                  className="px-2.5 py-1 text-[11px] font-medium bg-black hover:bg-neutral-900 text-slate-300 border border-neutral-800 transition-colors"
                >
                  Stream Logs
                </button>
                <button className="text-neutral-400 hover:text-white p-0.5">
                  <MoreVertical size={14} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              {/* Left Column: Metrics Summary */}
              <div className="sm:col-span-5 space-y-3">
                <div>
                  <div className="text-[11px] text-slate-400">Total Tasks Handled</div>
                  <div className="text-lg font-bold text-white flex items-center gap-1.5 pt-0.5">
                    <span>{tasks.length}</span>
                    <span className="text-[11px] text-emerald-400 flex items-center">
                      <TrendingUp size={11} /> +12%
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-400">Median Chunk Gap</div>
                  <div className="text-sm font-semibold text-white flex items-center gap-1.5 pt-0.5">
                    <span>500.6 ms</span>
                    <span className="text-[11px] text-blue-400 flex items-center">
                      <TrendingDown size={11} /> 0.2%
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-400">Upstream Drops (Simulated)</div>
                  <div className="text-sm font-semibold text-rose-400 flex items-center gap-1 pt-0.5">
                    <span>{failedTasks.length} dropped</span>
                    <Info size={11} className="text-slate-500" />
                  </div>
                </div>
              </div>

              {/* Right Column: Stacked Telemetry Bar Chart */}
              <div className="sm:col-span-7">
                <div className="text-[10px] text-slate-400 text-right mb-1">Volume by Agent (Events)</div>
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
                      <span className="text-[9px] text-slate-400 origin-center truncate">
                        {bar.label}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center text-[9px] text-slate-500 pt-1">
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
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-2">
              <div className="flex items-center gap-2">
                <GripVertical size={14} className="text-neutral-600 cursor-grab" />
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>Live Agent Tasks Stream</span>
                  <span className="text-[11px] text-blue-400 font-normal">triage</span>
                </h3>
              </div>
              <button
                onClick={() => onNavigate('tasks')}
                className="text-xs text-blue-400 hover:text-orange-400 font-medium flex items-center gap-1 group transition-colors"
              >
                <span className="underline underline-offset-2 decoration-neutral-600 group-hover:decoration-orange-400">View Full Table</span>
                <ArrowUpRight size={11} className="group-hover:text-orange-400" />
              </button>
            </div>

            <p className="text-[11px] text-slate-400 mb-3">
              Real-time tasks ordered by triage priority: failed tasks needing attention first, active streams second, terminal third.
            </p>

            {/* Filter Tabs */}
            <div className="flex items-center gap-4 border-b border-neutral-800 text-xs mb-3">
              <button
                onClick={() => setActiveTasksTab('needs_attention')}
                className={`pb-2 font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
                  activeTasksTab === 'needs_attention'
                    ? 'border-rose-500 text-rose-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Needs Attention ({failedTasks.length})</span>
              </button>

              <button
                onClick={() => setActiveTasksTab('in_flight')}
                className={`pb-2 font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
                  activeTasksTab === 'in_flight'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>In Flight ({inFlightTasks.length})</span>
              </button>

              <button
                onClick={() => setActiveTasksTab('terminal')}
                className={`pb-2 font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
                  activeTasksTab === 'terminal'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Completed ({completedTasks.length})</span>
              </button>

              <button
                onClick={() => setActiveTasksTab('all')}
                className={`pb-2 font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
                  activeTasksTab === 'all'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>All ({tasks.length})</span>
              </button>
            </div>

            {/* Tasks List - Clean borderless rows with subtle divider */}
            <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
              {displayedTasks.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No tasks matching the selected filter.
                </div>
              ) : (
                displayedTasks.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onSelectTask(t.id)}
                    className="flex items-center justify-between py-2 px-1 hover:bg-neutral-900/60 border-b border-neutral-900/80 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <StateChip state={t.current_state} />
                      <div className="truncate">
                        <div className="text-xs font-mono text-slate-200 group-hover:text-orange-400 transition-colors truncate max-w-[200px] sm:max-w-[320px]">
                          {t.id}
                        </div>
                        {t.error_summary && (
                          <div className="text-[10px] text-rose-400 truncate">
                            {t.error_summary}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-right">
                      <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                        {t.last_event_at ? new Date(t.last_event_at).toLocaleTimeString() : 'now'}
                      </span>
                      <span className="text-[11px] text-blue-400 group-hover:text-orange-400 underline underline-offset-2 decoration-neutral-600 group-hover:decoration-orange-400 flex items-center gap-0.5 transition-colors">
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
