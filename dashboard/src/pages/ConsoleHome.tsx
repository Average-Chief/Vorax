import React, { useState, useEffect } from 'react';
import {
  Rocket,
  Shield,
  Activity,
  Terminal,
  ArrowUpRight,
  X,
  Cpu,
  RefreshCw,
  Plus,
  Network,
  Key,
} from 'lucide-react';
import { AgentListItem, GatewayRoute, StatsResponse, TaskSummary } from '../lib/types';
import { fetchAgents, fetchRoutes, fetchStats } from '../lib/api';
import { StateChip } from '../components/StateChip';

interface ConsoleHomeProps {
  tasks: TaskSummary[];
  loading: boolean;
  onSelectTask: (taskId: string) => void;
  onNavigate: (tab: 'home' | 'tasks' | 'agents' | 'gateway') => void;
  onOpenCli: () => void;
}

function formatUptime(seconds?: number): string {
  if (!seconds || seconds <= 0) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function ConsoleHome({
  tasks,
  loading,
  onSelectTask,
  onNavigate,
  onOpenCli,
}: ConsoleHomeProps) {
  const [showBanner, setShowBanner] = useState(true);

  // Live real data for agents, routes, and stats
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [routes, setRoutes] = useState<GatewayRoute[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);

  const loadExtraData = async () => {
    try {
      const [agentList, routeList, statsData] = await Promise.all([
        fetchAgents(),
        fetchRoutes(),
        fetchStats(),
      ]);
      setAgents(agentList);
      setRoutes(routeList);
      setStats(statsData);
    } catch {
      // Graceful fallback
    }
  };

  useEffect(() => {
    loadExtraData();
    const interval = setInterval(loadExtraData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Live task segmentation
  const failedTasks = tasks.filter((t) => {
    const s = (t.current_state || '').toLowerCase();
    return ['failed', 'rejected', 'input-required'].includes(s);
  });
  const inFlightTasks = tasks.filter((t) => !t.is_terminal);
  const completedTasks = tasks.filter((t) => t.is_terminal && !failedTasks.includes(t));

  // Real distribution calculations
  const totalTasksCount = tasks.length;
  const completedPct = totalTasksCount > 0 ? Math.round((completedTasks.length / totalTasksCount) * 100) : 0;
  const inFlightPct = totalTasksCount > 0 ? Math.round((inFlightTasks.length / totalTasksCount) * 100) : 0;
  const attentionPct = totalTasksCount > 0 ? Math.round((failedTasks.length / totalTasksCount) * 100) : 0;

  return (
    <div className="space-y-4 text-slate-200 font-sans">
      {/* 1. Gateway Announcement Banner */}
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
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Gateway Console</h1>
          <p className="text-xs text-slate-400">Live observability, telemetry metrics, and agent triage</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 text-xs font-medium bg-black hover:bg-neutral-900 text-slate-300 border border-neutral-800 hover:border-neutral-700 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw size={12} className="text-slate-400" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => onNavigate('gateway')}
            className="px-3 py-1.5 text-xs font-bold bg-white hover:bg-slate-100 text-slate-900 transition-colors flex items-center gap-1.5"
          >
            <Plus size={13} />
            <span>Register Route</span>
          </button>
        </div>
      </div>

      {/* 3. Top Row Widgets (3 Columns Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Widget 1: Getting Started & Core Capabilities (col-span-4) */}
        <div className="lg:col-span-4 bg-[#080808] border border-neutral-800 p-4 flex flex-col justify-between hover:border-neutral-700 transition-colors">
          <div>
            <div className="pb-3 border-b border-neutral-800 mb-3">
              <h3 className="text-sm font-bold text-white">Gateway Quickstart</h3>
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

        {/* Widget 2: Fleet Agents & Subsystems (col-span-5) - Dynamic & Real */}
        <div className="lg:col-span-5 bg-[#080808] border border-neutral-800 p-4 flex flex-col justify-between hover:border-neutral-700 transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>Registered Agents ({agents.length})</span>
                <span className="text-[11px] text-blue-400 font-normal">fleet</span>
              </h3>
              <button
                onClick={() => onNavigate('agents')}
                className="px-2.5 py-1 text-[11px] font-medium bg-black hover:bg-neutral-900 text-slate-300 border border-neutral-800 transition-colors"
              >
                Manage Agents
              </button>
            </div>

            {/* Dynamic Grid of Actual Registered Upstream Agents */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
              {agents.length === 0 ? (
                <div className="col-span-2 py-4 text-center text-xs text-slate-500">
                  <span>No agents registered yet. </span>
                  <button
                    onClick={() => onNavigate('agents')}
                    className="text-blue-400 hover:underline"
                  >
                    Register your first agent ↗
                  </button>
                </div>
              ) : (
                agents.slice(0, 6).map((agent) => {
                  const boundRoute = routes.find((r) => r.agent_id === agent.id);
                  const isHealthy = agent.health === 'healthy';
                  return (
                    <button
                      key={agent.id}
                      onClick={() => onNavigate('agents')}
                      className="flex items-center gap-2 text-slate-300 w-full text-left group py-1 transition-colors"
                      title={`${agent.name} (${agent.endpoint_url})`}
                    >
                      <span
                        className={`w-2 h-2 shrink-0 rounded-full ${
                          isHealthy ? 'bg-emerald-400' : 'bg-slate-600'
                        }`}
                      />
                      <div className="truncate">
                        <span className="underline underline-offset-2 decoration-neutral-500 group-hover:text-orange-400 group-hover:decoration-orange-400 text-xs font-medium block truncate transition-colors">
                          {agent.name}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono block truncate">
                          {boundRoute ? `/gw/${boundRoute.path_segment}` : agent.endpoint_url}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Core Subsystem Triggers */}
            <div className="border-t border-neutral-800/80 pt-2.5 mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <button
                onClick={() => onNavigate('tasks')}
                className="flex items-center gap-2 text-slate-400 hover:text-white text-left group py-0.5 transition-colors"
              >
                <Activity size={12} className="text-cyan-400 shrink-0" />
                <span className="underline underline-offset-2 decoration-neutral-600 group-hover:text-orange-400 group-hover:decoration-orange-400 text-[11px] truncate">
                  Triage Stream
                </span>
              </button>

              <button
                onClick={() => onNavigate('gateway')}
                className="flex items-center gap-2 text-slate-400 hover:text-white text-left group py-0.5 transition-colors"
              >
                <Network size={12} className="text-emerald-400 shrink-0" />
                <span className="underline underline-offset-2 decoration-neutral-600 group-hover:text-orange-400 group-hover:decoration-orange-400 text-[11px] truncate">
                  Route Registry
                </span>
              </button>

              <button
                onClick={() => onNavigate('gateway')}
                className="flex items-center gap-2 text-slate-400 hover:text-white text-left group py-0.5 transition-colors"
              >
                <Key size={12} className="text-indigo-400 shrink-0" />
                <span className="underline underline-offset-2 decoration-neutral-600 group-hover:text-orange-400 group-hover:decoration-orange-400 text-[11px] truncate">
                  API Key Vault
                </span>
              </button>

              <button
                onClick={onOpenCli}
                className="flex items-center gap-2 text-slate-400 hover:text-white text-left group py-0.5 transition-colors"
              >
                <Terminal size={12} className="text-amber-400 shrink-0" />
                <span className="underline underline-offset-2 decoration-neutral-600 group-hover:text-orange-400 group-hover:decoration-orange-400 text-[11px] truncate">
                  Gateway Shell
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Widget 3: Gateway Health & Triage Status (col-span-3) */}
        <div className="lg:col-span-3 bg-[#080808] border border-neutral-800 p-4 flex flex-col justify-between hover:border-neutral-700 transition-colors">
          <div>
            <div className="pb-3 border-b border-neutral-800 mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>Gateway Health</span>
                <span className="text-[11px] text-blue-400 font-normal">live</span>
              </h3>
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
        {/* Widget 4: Traffic & Telemetry Explorer (col-span-5) - Real Live Stats */}
        <div className="lg:col-span-5 bg-[#080808] border border-neutral-800 p-4 flex flex-col justify-between hover:border-neutral-700 transition-colors">
          <div>
            <div className="pb-3 border-b border-neutral-800 mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>Traffic & Telemetry</span>
                <span className="text-[11px] text-blue-400 font-normal">live</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              {/* Left Column: Real Metrics Summary */}
              <div className="sm:col-span-5 space-y-3">
                <div>
                  <div className="text-[11px] text-slate-400">Total Tasks Handled</div>
                  <div className="text-lg font-bold text-white flex items-center gap-1.5 pt-0.5">
                    <span>{tasks.length}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      ({stats ? formatUptime(stats.uptime_seconds) : 'live'} uptime)
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-400">Live Throughput</div>
                  <div className="text-sm font-semibold text-white flex items-center gap-1.5 pt-0.5">
                    <span className="font-mono">{stats?.events_per_sec ?? 0}</span>
                    <span className="text-[11px] text-blue-400 font-mono">ev/s</span>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-400">Total Events Ingested</div>
                  <div className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5 pt-0.5 font-mono">
                    <span>{stats?.total_events ?? 0}</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      ({stats?.dropped_events ?? 0} dropped)
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Real Task State Distribution Bar */}
              <div className="sm:col-span-7">
                <div className="text-[10px] text-slate-400 text-right mb-1">Task State Distribution</div>
                
                {/* Horizontal Segmented Bar */}
                <div className="h-6 w-full bg-neutral-900 border border-neutral-800 flex overflow-hidden rounded-sm my-2">
                  {completedPct > 0 && (
                    <div
                      style={{ width: `${completedPct}%` }}
                      className="bg-emerald-600 hover:bg-emerald-500 transition-all flex items-center justify-center text-[10px] font-bold text-white"
                      title={`Completed: ${completedTasks.length} (${completedPct}%)`}
                    >
                      {completedPct >= 15 ? `${completedPct}%` : ''}
                    </div>
                  )}
                  {inFlightPct > 0 && (
                    <div
                      style={{ width: `${inFlightPct}%` }}
                      className="bg-blue-600 hover:bg-blue-500 transition-all flex items-center justify-center text-[10px] font-bold text-white"
                      title={`In-Flight: ${inFlightTasks.length} (${inFlightPct}%)`}
                    >
                      {inFlightPct >= 15 ? `${inFlightPct}%` : ''}
                    </div>
                  )}
                  {attentionPct > 0 && (
                    <div
                      style={{ width: `${attentionPct}%` }}
                      className="bg-rose-600 hover:bg-rose-500 transition-all flex items-center justify-center text-[10px] font-bold text-white"
                      title={`Needs Attention: ${failedTasks.length} (${attentionPct}%)`}
                    >
                      {attentionPct >= 15 ? `${attentionPct}%` : ''}
                    </div>
                  )}
                  {totalTasksCount === 0 && (
                    <div className="w-full flex items-center justify-center text-[10px] text-slate-500 font-mono">
                      No tasks recorded yet
                    </div>
                  )}
                </div>

                {/* Legend with Real Counts */}
                <div className="space-y-1 pt-1 text-[10px]">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-emerald-500" />
                      <span>Completed</span>
                    </span>
                    <span className="font-mono text-slate-400">{completedTasks.length} ({completedPct}%)</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-blue-500" />
                      <span>In-Flight</span>
                    </span>
                    <span className="font-mono text-slate-400">{inFlightTasks.length} ({inFlightPct}%)</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-rose-500" />
                      <span>Needs Attention</span>
                    </span>
                    <span className="font-mono text-slate-400">{failedTasks.length} ({attentionPct}%)</span>
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
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Live Agent Tasks Stream</span>
                {inFlightTasks.length > 0 ? (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-800 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {inFlightTasks.length} active
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 font-mono">0 active</span>
                )}
              </h3>
              <button
                onClick={() => onNavigate('tasks')}
                className="text-xs text-blue-400 hover:text-orange-400 font-medium flex items-center gap-1 group transition-colors"
              >
                <span className="underline underline-offset-2 decoration-neutral-600 group-hover:decoration-orange-400">View All Tasks</span>
                <ArrowUpRight size={11} className="group-hover:text-orange-400" />
              </button>
            </div>

            <p className="text-[11px] text-slate-400 mb-3">
              Real-time tasks currently streaming and being processed by upstream agents.
            </p>

            {/* Live Tasks List */}
            <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
              {inFlightTasks.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-slate-600" />
                    <span className="font-medium">No live active tasks in flight.</span>
                  </div>
                  <span className="text-[11px] text-slate-600 font-mono">
                    Inbound agent JSON-RPC streams will appear here in real time.
                  </span>
                </div>
              ) : (
                inFlightTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onSelectTask(t.id)}
                    className="flex items-center justify-between py-2 px-1 hover:bg-neutral-900/60 border-b border-neutral-900/80 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" title="Stream in flight" />
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
