import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  Info,
  ArrowRight,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { AgentListItem, GatewayRoute, StatsResponse, TaskSummary } from '../lib/types';
import { fetchAgents, fetchRoutes, fetchStats } from '../lib/api';
import { StateChip } from '../components/StateChip';

interface ConsoleHomeProps {
  tasks: TaskSummary[];
  loading: boolean;
  onSelectTask: (taskId: string) => void;
  onNavigate: (tab: 'home' | 'tasks' | 'agents' | 'gateway' | 'guide') => void;
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

type WidgetInfoKey = 'quickstart' | 'agents' | 'health' | 'traffic' | 'live_tasks' | 'whats_new';

interface WidgetInfoConfig {
  title: string;
  description: string;
  sections: { title: string; content: string }[];
}

export function ConsoleHome({
  tasks,
  loading,
  onSelectTask,
  onNavigate,
  onOpenCli,
}: ConsoleHomeProps) {
  const [showBanner, setShowBanner] = useState<boolean>(() => {
    try {
      return localStorage.getItem('a2a_dismiss_banner') !== 'true';
    } catch {
      return true;
    }
  });

  const handleDismissBanner = () => {
    setShowBanner(false);
    try {
      localStorage.setItem('a2a_dismiss_banner', 'true');
    } catch {}
  };

  const [activeInfoWidget, setActiveInfoWidget] = useState<WidgetInfoKey | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState(false);

  useEffect(() => {
    setFeedbackGiven(false);
  }, [activeInfoWidget]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveInfoWidget(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const WIDGET_INFO: Record<WidgetInfoKey, WidgetInfoConfig> = {
    quickstart: {
      title: 'Gateway Quickstart',
      description:
        'The Quickstart widget provides direct shortcuts to provision routes, configure secure credentials, and execute test requests against upstream agents.',
      sections: [
        {
          title: 'Route Provisioning',
          content:
            'Maps incoming external paths (/gw/:route/) to internal microservices or 3rd-party agent endpoints with zero-touch credential forwarding.',
        },
        {
          title: 'Gateway Authentication',
          content:
            'External callers use one unified gateway key. Upstream tokens and credentials remain hidden inside the gateway vault.',
        },
        {
          title: 'CloudShell CLI',
          content:
            'Built-in terminal modal with pre-filled cURL commands to verify live agent responses and SSE streams.',
        },
      ],
    },
    agents: {
      title: 'Registered Agents',
      description:
        'Displays all upstream autonomous agents registered in the gateway control plane along with their target base URLs and authentication types.',
      sections: [
        {
          title: 'Agent Endpoints',
          content:
            'The gateway proxies standard A2A JSON-RPC method calls directly to each registered agent base URL.',
        },
        {
          title: 'Credential Injection',
          content:
            'The gateway attaches upstream Bearer tokens or Basic auth headers automatically on behalf of callers.',
        },
        {
          title: 'Dynamic Discovery',
          content:
            'Agents can be registered or updated programmatically at runtime via the /control/agents API.',
        },
      ],
    },
    health: {
      title: 'Gateway Health & Triage',
      description:
        'Provides real-time operational status across all task executions to help operators identify failures immediately without digging through server logs.',
      sections: [
        {
          title: 'Needs Attention',
          content:
            'Tasks that entered terminal failed, rejected, or input-required states. Click to inspect the exact point of interruption.',
        },
        {
          title: 'In Flight',
          content:
            'Active streaming tasks currently communicating with upstream agents over open SSE sockets.',
        },
        {
          title: 'Completed',
          content:
            'Tasks that finished successfully with all output artifacts preserved.',
        },
      ],
    },
    traffic: {
      title: 'Traffic & Telemetry',
      description:
        'Visualizes gateway throughput, process uptime, and task outcome distribution calculated from the append-only event store.',
      sections: [
        {
          title: 'Uptime & Task Throughput',
          content:
            'Tracks total cumulative tasks routed through the gateway since the process initialized.',
        },
        {
          title: 'Outcome Distribution',
          content:
            'Percentage breakdown comparing completed tasks versus in-flight tasks and transport dropouts.',
        },
        {
          title: 'Zero-Copy SSE Tap',
          content:
            'Streaming chunks are tapped into Redis Pub/Sub and written to PostgreSQL asynchronously without blocking the client.',
        },
      ],
    },
    live_tasks: {
      title: 'Live Agent Tasks Stream',
      description:
        'A real-time monitor displaying active tasks currently executing across upstream agents. Automatically updates as events arrive over WebSocket.',
      sections: [
        {
          title: 'Active Streams Only',
          content:
            'Only tasks that are currently running (in-flight) appear in this feed. When all tasks complete, the feed displays a clean idle state.',
        },
        {
          title: 'Forensic Timeline',
          content:
            'Click Timeline on any active task to watch its streaming events, status changes, and partial artifacts arrive live.',
        },
        {
          title: 'Crash Provenance',
          content:
            'If an agent crashes mid-stream, the gateway appends a forensic note detailing the interruption before marking the task complete.',
        },
      ],
    },
    whats_new: {
      title: "What's New in A2A Gateway",
      description:
        'Highlights recent release milestones, protocol enhancements, and architectural upgrades across the A2A Gateway platform.',
      sections: [
        {
          title: 'Forensic Event Timeline (v0.1.4)',
          content:
            'Deep inspection into task executions with live SSE stream replay, token counters, tool provenance, and step-level forensics.',
        },
        {
          title: 'Dynamic Route Proxy (v0.1.3)',
          content:
            'Zero-touch reverse proxying for /gw/:route paths with vault-backed Bearer credential and header forwarding.',
        },
        {
          title: 'CloudShell CLI Test Runner (v0.1.2)',
          content:
            'Interactive terminal modal to run test cURL requests against upstream agent endpoints with zero setup.',
        },
        {
          title: 'A2A JSON-RPC 2.0 & Redis Pub/Sub (v0.1.1)',
          content:
            'High-throughput asynchronous message broker enabling zero-copy SSE tapping directly into PostgreSQL.',
        },
      ],
    },
  };

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
            onClick={handleDismissBanner}
            className="absolute top-3 right-3 text-neutral-500 hover:text-white p-1 hover:bg-neutral-800 transition-colors cursor-pointer"
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
            <div className="pb-3 border-b border-neutral-800 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Gateway Quickstart</h3>
                <button
                  onClick={() => setActiveInfoWidget('quickstart')}
                  className="text-xs text-blue-400 hover:text-blue-300 hover:underline cursor-pointer font-normal"
                >
                  Info
                </button>
              </div>
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
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Registered Agents ({agents.length})</span>
                <button
                  onClick={() => setActiveInfoWidget('agents')}
                  className="text-xs text-blue-400 hover:text-blue-300 hover:underline cursor-pointer font-normal"
                >
                  Info
                </button>
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
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Gateway Health</span>
                <button
                  onClick={() => setActiveInfoWidget('health')}
                  className="text-xs text-blue-400 hover:text-blue-300 hover:underline cursor-pointer font-normal"
                >
                  Info
                </button>
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

      {/* 4. Bottom Row Widgets: Traffic & Latency + Live Feed + What's New */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Widget 4: Traffic & Telemetry Explorer (col-span-4) - Real Live Stats */}
        <div className="lg:col-span-4 bg-[#080808] border border-neutral-800 p-4 flex flex-col justify-between hover:border-neutral-700 transition-colors">
          <div>
            <div className="pb-3 border-b border-neutral-800 mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Traffic & Telemetry</span>
                <button
                  onClick={() => setActiveInfoWidget('traffic')}
                  className="text-xs text-blue-400 hover:text-blue-300 hover:underline cursor-pointer font-normal"
                >
                  Info
                </button>
              </h3>
            </div>

            <div className="space-y-3.5">
              {/* 3 Core Telemetry Metrics */}
              <div className="grid grid-cols-3 gap-2 pb-1">
                <div>
                  <div className="text-[10px] text-slate-400">Total Tasks</div>
                  <div className="text-base font-bold text-white pt-0.5">{tasks.length}</div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">{stats ? formatUptime(stats.uptime_seconds) : 'live'}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Throughput</div>
                  <div className="text-base font-bold text-white pt-0.5 flex items-baseline gap-1">
                    <span className="font-mono">{stats?.events_per_sec ?? 0}</span>
                    <span className="text-[10px] text-blue-400 font-mono">ev/s</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Total Events</div>
                  <div className="text-base font-bold text-emerald-400 pt-0.5 font-mono">{stats?.total_events ?? 0}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{stats?.dropped_events ?? 0} drop</div>
                </div>
              </div>

              {/* Real Task State Distribution Bar & Legend */}
              <div className="border-t border-neutral-800 pt-2.5">
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

        {/* Widget 5: Live Tasks Feed (col-span-5) */}
        <div className="lg:col-span-5 bg-[#080808] border border-neutral-800 p-4 flex flex-col justify-between hover:border-neutral-700 transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Live Agent Tasks Stream</span>
                <button
                  onClick={() => setActiveInfoWidget('live_tasks')}
                  className="text-xs text-blue-400 hover:text-blue-300 hover:underline cursor-pointer font-normal"
                >
                  Info
                </button>
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

        {/* Widget 6: What's New (col-span-3) - Platform updates & feature release notes */}
        <div className="lg:col-span-3 bg-[#080808] border border-neutral-800 p-4 flex flex-col justify-between hover:border-neutral-700 transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles size={14} className="text-amber-400" />
                <span>What's New</span>
                <button
                  onClick={() => setActiveInfoWidget('whats_new')}
                  className="text-xs text-blue-400 hover:text-blue-300 hover:underline cursor-pointer font-normal"
                >
                  Info
                </button>
              </h3>
              <button
                onClick={() => onNavigate('guide')}
                className="text-[11px] text-blue-400 hover:text-orange-400 font-medium flex items-center gap-1 group transition-colors"
              >
                <span className="underline underline-offset-2 decoration-neutral-600 group-hover:decoration-orange-400">View Guide</span>
                <ArrowUpRight size={10} className="group-hover:text-orange-400" />
              </button>
            </div>

            {/* Updates List */}
            <div className="space-y-3">
              {/* Item 1 */}
              <div
                className="group cursor-pointer space-y-1"
                onClick={() => onNavigate('guide')}
              >
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold px-1.5 py-0.2 bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                    NEW
                  </span>
                  <span className="text-slate-500 font-mono">v0.1.4</span>
                </div>
                <div className="text-xs font-semibold text-slate-200 group-hover:text-orange-400 flex items-center gap-1 transition-colors">
                  <span className="underline underline-offset-2 decoration-neutral-700 group-hover:decoration-orange-400">
                    Forensic Event Timeline
                  </span>
                  <ArrowUpRight size={10} className="opacity-70 group-hover:text-orange-400" />
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Sub-second event tracing, step inspector, partial artifact preview, and crash provenance.
                </p>
              </div>

              {/* Item 2 */}
              <div
                className="group cursor-pointer space-y-1 pt-2.5 border-t border-neutral-800/80"
                onClick={() => onNavigate('gateway')}
              >
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold px-1.5 py-0.2 bg-blue-950 text-blue-300 border border-blue-800 font-mono">
                    FEATURE
                  </span>
                  <span className="text-slate-500 font-mono">v0.1.3</span>
                </div>
                <div className="text-xs font-semibold text-slate-200 group-hover:text-orange-400 flex items-center gap-1 transition-colors">
                  <span className="underline underline-offset-2 decoration-neutral-700 group-hover:decoration-orange-400">
                    Dynamic Route Proxying
                  </span>
                  <ArrowUpRight size={10} className="opacity-70 group-hover:text-orange-400" />
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Configure custom path bindings (<code className="text-slate-300 font-mono text-[10px]">/gw/:route</code>) with header injection.
                </p>
              </div>

              {/* Item 3 */}
              <div
                className="group cursor-pointer space-y-1 pt-2.5 border-t border-neutral-800/80"
                onClick={onOpenCli}
              >
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold px-1.5 py-0.2 bg-amber-950 text-amber-300 border border-amber-800 font-mono">
                    TOOL
                  </span>
                  <span className="text-slate-500 font-mono">v0.1.2</span>
                </div>
                <div className="text-xs font-semibold text-slate-200 group-hover:text-orange-400 flex items-center gap-1 transition-colors">
                  <span className="underline underline-offset-2 decoration-neutral-700 group-hover:decoration-orange-400">
                    CloudShell CLI & Terminal
                  </span>
                  <ArrowUpRight size={10} className="opacity-70 group-hover:text-orange-400" />
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Built-in test runner with pre-filled cURL commands to verify JSON-RPC methods and SSE streams.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-neutral-800 mt-3 text-right">
            <button
              onClick={() => onNavigate('guide')}
              className="text-xs text-blue-400 hover:text-orange-400 font-medium inline-flex items-center gap-1 group transition-colors"
            >
              <span className="underline underline-offset-2 decoration-neutral-600 group-hover:decoration-orange-400">Read Operator Guide</span>
              <ArrowUpRight size={11} className="group-hover:text-orange-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Right-Side Slide-Over Info Panel (Portaled to body to prevent container space-y margins) */}
      {activeInfoWidget && typeof document !== 'undefined' && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed top-12 inset-x-0 bottom-0 bg-black/50 backdrop-blur-[1px] z-40 transition-opacity !m-0"
            onClick={() => setActiveInfoWidget(null)}
          />

          {/* Drawer: starts flush under the navbar at top-12, left border touching navbar bottom line */}
          <div className="fixed top-12 bottom-0 right-0 w-80 sm:w-96 bg-[#0c0c0c] border-l border-neutral-800 shadow-2xl z-40 flex flex-col justify-between animate-in slide-in-from-right duration-200 !m-0">
            {/* Header: flush against navbar bottom border */}
            <div className="px-5 py-3 border-b border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-950">
              <div className="flex items-center gap-2">
                <Info size={15} className="text-blue-400" />
                <h3 className="text-sm font-bold text-white tracking-tight">
                  {WIDGET_INFO[activeInfoWidget].title}
                </h3>
              </div>
              <button
                onClick={() => setActiveInfoWidget(null)}
                className="text-slate-400 hover:text-white p-1 hover:bg-neutral-800 rounded transition-colors cursor-pointer"
                title="Close info panel"
              >
                <X size={15} />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {/* Main Description */}
              <p className="text-xs text-slate-300 leading-relaxed">
                {WIDGET_INFO[activeInfoWidget].description}
              </p>

              {/* Detail Sections */}
              <div className="space-y-2.5 pt-1">
                {WIDGET_INFO[activeInfoWidget].sections.map((sec, idx) => (
                  <div key={idx} className="p-3 bg-neutral-950 border border-neutral-800/80 rounded-sm space-y-1">
                    <div className="text-xs font-semibold text-slate-200">{sec.title}</div>
                    <p className="text-[11px] text-slate-400 leading-normal">{sec.content}</p>
                  </div>
                ))}
              </div>

              {/* Was this content helpful? (AWS Console Style) */}
              <div className="pt-4 border-t border-neutral-800 space-y-2.5">
                <div className="text-xs font-semibold text-slate-200">Was this content helpful?</div>
                {feedbackGiven ? (
                  <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 bg-emerald-950/30 border border-emerald-900/50 p-2 rounded-sm">
                    <CheckCircle2 size={13} />
                    <span>Thank you for your feedback!</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setFeedbackGiven(true)}
                      className="px-3 py-1 bg-neutral-900 hover:bg-neutral-800 text-slate-300 hover:text-white text-xs border border-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer rounded-sm"
                    >
                      <ThumbsUp size={12} />
                      <span>Yes</span>
                    </button>
                    <button
                      onClick={() => setFeedbackGiven(true)}
                      className="px-3 py-1 bg-neutral-900 hover:bg-neutral-800 text-slate-300 hover:text-white text-xs border border-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer rounded-sm"
                    >
                      <ThumbsDown size={12} />
                      <span>No</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-3.5 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between shrink-0">
              <span className="text-[10px] text-slate-500 font-mono">A2A Console Telemetry</span>
              <button
                onClick={() => setActiveInfoWidget(null)}
                className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs border border-neutral-700 transition-colors rounded-sm cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
