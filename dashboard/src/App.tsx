import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Bell,
  HelpCircle,
  Settings,
  Terminal,
  ChevronDown,
  LayoutGrid,
  Menu,
  X,
  Server,
  Network,
  Layers,
  Key,
  Radio,
  Activity,
  Boxes,
  Zap,
  Globe,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Cpu,
  Copy,
  Check,
  LogOut,
} from 'lucide-react';
import { useWs } from './hooks/useWs';
import { useLiveTasks } from './hooks/useLiveTasks';
import { ConsoleHome } from './pages/ConsoleHome';
import { TasksPage } from './pages/Tasks';
import { TimelinePage } from './pages/Timeline';
import { AgentsPage } from './pages/Agents';
import { GatewayPage } from './pages/Gateway';
import { LoginPage } from './pages/Login';
import { AgentListItem, GatewayRoute } from './lib/types';
import { getStoredApiKey, setStoredApiKey, fetchAgents, fetchRoutes, isAuthenticated, setAuthenticated } from './lib/api';
import { StateChip } from './components/StateChip';

type Tab = 'home' | 'tasks' | 'agents' | 'gateway';

function parseInitialRoute(): { tab: Tab; taskId: string | null } {
  try {
    const path = window.location.pathname;
    if (path.startsWith('/tasks/')) {
      const id = path.replace('/tasks/', '').replace(/\/$/, '');
      if (id) return { tab: 'tasks', taskId: decodeURIComponent(id) };
    }
    if (path === '/tasks') return { tab: 'tasks', taskId: null };
    if (path === '/agents') return { tab: 'agents', taskId: null };
    if (path === '/gateway') return { tab: 'gateway', taskId: null };
  } catch (e) {
    // fallback
  }
  return { tab: 'home', taskId: null };
}

export function App() {
  const initial = parseInitialRoute();
  const [activeTab, setActiveTab] = useState<Tab>(initial.tab);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initial.taskId);

  useEffect(() => {
    if (selectedTaskId) {
      window.history.replaceState(null, '', `/tasks/${encodeURIComponent(selectedTaskId)}`);
    } else if (activeTab === 'home') {
      window.history.replaceState(null, '', '/');
    } else {
      window.history.replaceState(null, '', `/${activeTab}`);
    }
  }, [activeTab, selectedTaskId]);

  const [apiKey, setApiKey] = useState(getStoredApiKey());
  const [isAuthed, setIsAuthed] = useState<boolean>(isAuthenticated());
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showCliModal, setShowCliModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showServicesMenu, setShowServicesMenu] = useState(false);
  const [showEnvMenu, setShowEnvMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  // Real connected data for global search & status
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [routes, setRoutes] = useState<GatewayRoute[]>([]);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [pingResult, setPingResult] = useState<string | null>(null);
  const [pinging, setPinging] = useState(false);

  const { status: wsStatus } = useWs();
  const { tasks, loading } = useLiveTasks();
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([fetchAgents(), fetchRoutes()])
      .then(([a, r]) => {
        setAgents(a);
        setRoutes(r);
      })
      .catch(() => {});
  }, []);

  // Shortcut for Option+S or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey && (e.key === 's' || e.key === 'S')) || ((e.metaKey || e.ctrlKey) && e.key === 'k')) {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      } else if (e.key === 'Escape') {
        setSearchOpen(false);
        setShowServicesMenu(false);
        setShowNotifications(false);
        setShowEnvMenu(false);
        setShowUserMenu(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    setStoredApiKey(apiKey);
    setShowKeyModal(false);
    window.location.reload();
  };

  const handlePing = async () => {
    try {
      setPinging(true);
      const res = await fetch('/ready');
      const data = await res.json();
      setPingResult(`HTTP ${res.status}: ${JSON.stringify(data)}`);
    } catch (err: any) {
      setPingResult(`Error: ${err.message}`);
    } finally {
      setPinging(false);
    }
  };

  const handleCopyCmd = (cmd: string, key: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedSnippet(key);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const failedTasks = tasks.filter((t) => {
    const s = (t.current_state || '').toLowerCase();
    return ['failed', 'rejected', 'input-required'].includes(s);
  });

  // Search filtering across real tasks, agents, and routes
  const q = searchQuery.trim().toLowerCase();
  const filteredTasks = q
    ? tasks.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          (t.current_state || '').toLowerCase().includes(q) ||
          (t.error_summary || '').toLowerCase().includes(q)
      ).slice(0, 5)
    : [];
  const filteredAgents = q
    ? agents.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.endpoint_url.toLowerCase().includes(q)
      ).slice(0, 3)
    : [];
  const filteredRoutes = q
    ? routes.filter((r) => r.path_segment.toLowerCase().includes(q)).slice(0, 3)
    : [];

  const hasSearchResults = q.length > 0 && (filteredTasks.length > 0 || filteredAgents.length > 0 || filteredRoutes.length > 0);

  if (!isAuthed) {
    return (
      <LoginPage
        onLoginSuccess={(token) => {
          setApiKey(token);
          setIsAuthed(true);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-black text-slate-100 font-sans selection:bg-neutral-800 selection:text-white">
      {/* 1. Pure Black Top Navigation Bar */}
      <header className="h-11 bg-black border-b border-neutral-800 px-3 flex items-center justify-between text-xs select-none sticky top-0 z-50">
        {/* Left Side: Brand Logo + Services Menu + Search */}
        <div className="flex items-center gap-3">
          {/* A2A Gateway Logo */}
          <div
            onClick={() => {
              setSelectedTaskId(null);
              setActiveTab('home');
            }}
            className="flex items-center gap-2 cursor-pointer group px-1 py-0.5 hover:bg-neutral-900 transition-colors"
            title="A2A Gateway Console Home"
          >
            <div className="w-5 h-5 bg-white text-black flex items-center justify-center font-bold text-[10px] tracking-wider">
              A2A
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-white text-xs tracking-tight">Gateway</span>
              <span className="text-[10px] text-slate-500 font-mono">v0.1</span>
            </div>
          </div>

          {/* Quick Services Menu */}
          <div className="relative">
            <button
              onClick={() => setShowServicesMenu(!showServicesMenu)}
              className={`p-1.5 transition-colors flex items-center justify-center border border-transparent ${
                showServicesMenu ? 'bg-neutral-900 text-white border-neutral-800' : 'text-slate-400 hover:text-white hover:bg-neutral-900'
              }`}
              title="Gateway Services & Routes"
            >
              <LayoutGrid size={14} />
            </button>

            {/* Services Dropdown */}
            {showServicesMenu && (
              <div className="absolute left-0 mt-2 w-72 bg-black border border-neutral-800 shadow-2xl py-2 z-50">
                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-neutral-800">
                  Gateway Control Plane
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      setActiveTab('home');
                      setSelectedTaskId(null);
                      setShowServicesMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-neutral-900 flex items-center gap-2.5 text-slate-200 border-b border-neutral-900"
                  >
                    <div className="w-5 h-5 bg-neutral-900 border border-neutral-700 flex items-center justify-center text-white text-[10px]">
                      H
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-white">Console Home</div>
                      <div className="text-[11px] text-slate-400">Modular widgets & telemetry overview</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('tasks');
                      setSelectedTaskId(null);
                      setShowServicesMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-neutral-900 flex items-center gap-2.5 text-slate-200 border-b border-neutral-900"
                  >
                    <div className="w-5 h-5 bg-neutral-900 border border-neutral-700 flex items-center justify-center text-cyan-400 text-[10px]">
                      <Activity size={12} />
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-white">Tasks Triage Stream</div>
                      <div className="text-[11px] text-slate-400">Streamed task states & priority sorting</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('agents');
                      setSelectedTaskId(null);
                      setShowServicesMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-neutral-900 flex items-center gap-2.5 text-slate-200 border-b border-neutral-900"
                  >
                    <div className="w-5 h-5 bg-neutral-900 border border-neutral-700 flex items-center justify-center text-amber-400 text-[10px]">
                      <Boxes size={12} />
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-white">Upstream Agent Registry</div>
                      <div className="text-[11px] text-slate-400">Registered agent cards and endpoints</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('gateway');
                      setSelectedTaskId(null);
                      setShowServicesMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-neutral-900 flex items-center gap-2.5 text-slate-200"
                  >
                    <div className="w-5 h-5 bg-neutral-900 border border-neutral-700 flex items-center justify-center text-emerald-400 text-[10px]">
                      <Network size={12} />
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-white">Gateway Routes & API Keys</div>
                      <div className="text-[11px] text-slate-400">Path segments & bcrypt token management</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sharp Search Bar with [Option+S] - Real Connected Search */}
          <div className="relative">
            <div
              onClick={() => {
                setSearchOpen(true);
                setTimeout(() => searchInputRef.current?.focus(), 50);
              }}
              className="flex items-center gap-2 w-48 sm:w-72 md:w-80 h-7 px-2.5 bg-black hover:bg-neutral-900 border border-neutral-800 text-slate-400 cursor-pointer transition-colors"
            >
              <Search size={12} className="text-slate-500 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search tasks, agents, routes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchOpen(true)}
                className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full font-sans"
              />
              <span className="text-[10px] font-mono text-slate-400 bg-neutral-900 border border-neutral-800 px-1 py-0.2 shrink-0">
                [Option+S]
              </span>
            </div>

            {/* Quick Search Dropdown with Real Matching Results */}
            {searchOpen && (
              <div className="absolute left-0 mt-1.5 w-full bg-black border border-neutral-800 shadow-2xl py-2 z-50 max-h-80 overflow-y-auto">
                {q.length === 0 ? (
                  <>
                    <div className="px-3 py-1 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                      Quick Navigation
                    </div>
                    <div className="py-1">
                      <div
                        onClick={() => {
                          setActiveTab('tasks');
                          setSelectedTaskId(null);
                          setSearchOpen(false);
                        }}
                        className="px-3 py-1.5 hover:bg-neutral-900 text-xs text-slate-200 cursor-pointer flex items-center justify-between"
                      >
                        <span>Tasks Triage Stream</span>
                        <span className="text-[10px] text-cyan-400">Triage Feed</span>
                      </div>
                      <div
                        onClick={() => {
                          setActiveTab('agents');
                          setSelectedTaskId(null);
                          setSearchOpen(false);
                        }}
                        className="px-3 py-1.5 hover:bg-neutral-900 text-xs text-slate-200 cursor-pointer flex items-center justify-between"
                      >
                        <span>Registered Upstream Agents</span>
                        <span className="text-[10px] text-amber-400">Agent Cards</span>
                      </div>
                      <div
                        onClick={() => {
                          setActiveTab('gateway');
                          setSelectedTaskId(null);
                          setSearchOpen(false);
                        }}
                        className="px-3 py-1.5 hover:bg-neutral-900 text-xs text-slate-200 cursor-pointer flex items-center justify-between"
                      >
                        <span>Gateway Routes & Keys</span>
                        <span className="text-[10px] text-emerald-400">Control Plane</span>
                      </div>
                      {tasks.slice(0, 3).map((t) => (
                        <div
                          key={t.id}
                          onClick={() => {
                            setSelectedTaskId(t.id);
                            setSearchOpen(false);
                          }}
                          className="px-3 py-1.5 hover:bg-neutral-900 text-xs text-slate-200 cursor-pointer flex items-center justify-between"
                        >
                          <span className="font-mono text-[11px] truncate">{t.id}</span>
                          <span className="text-[10px] text-indigo-400">Open Timeline</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : hasSearchResults ? (
                  <div className="space-y-2 py-1">
                    {/* Matching Tasks */}
                    {filteredTasks.length > 0 && (
                      <div>
                        <div className="px-3 py-1 text-[10px] text-slate-500 font-mono uppercase font-bold">
                          Matching Tasks ({filteredTasks.length})
                        </div>
                        {filteredTasks.map((t) => (
                          <div
                            key={t.id}
                            onClick={() => {
                              setSelectedTaskId(t.id);
                              setSearchOpen(false);
                            }}
                            className="px-3 py-1.5 hover:bg-neutral-900 text-xs cursor-pointer flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <StateChip state={t.current_state} />
                              <span className="font-mono text-[11px] text-slate-200 truncate">{t.id}</span>
                            </div>
                            <span className="text-[10px] text-indigo-400 shrink-0">Open Timeline ↗</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Matching Agents */}
                    {filteredAgents.length > 0 && (
                      <div className="border-t border-neutral-900 pt-1">
                        <div className="px-3 py-1 text-[10px] text-slate-500 font-mono uppercase font-bold">
                          Matching Agents ({filteredAgents.length})
                        </div>
                        {filteredAgents.map((a) => (
                          <div
                            key={a.id}
                            onClick={() => {
                              setActiveTab('agents');
                              setSelectedTaskId(null);
                              setSearchOpen(false);
                            }}
                            className="px-3 py-1.5 hover:bg-neutral-900 text-xs cursor-pointer flex items-center justify-between"
                          >
                            <span className="text-slate-200 font-medium">{a.name}</span>
                            <span className="font-mono text-[10px] text-slate-500">{a.endpoint_url}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Matching Routes */}
                    {filteredRoutes.length > 0 && (
                      <div className="border-t border-neutral-900 pt-1">
                        <div className="px-3 py-1 text-[10px] text-slate-500 font-mono uppercase font-bold">
                          Matching Routes ({filteredRoutes.length})
                        </div>
                        {filteredRoutes.map((r) => (
                          <div
                            key={r.id}
                            onClick={() => {
                              setActiveTab('gateway');
                              setSelectedTaskId(null);
                              setSearchOpen(false);
                            }}
                            className="px-3 py-1.5 hover:bg-neutral-900 text-xs cursor-pointer flex items-center justify-between"
                          >
                            <span className="font-mono text-emerald-400">/gw/{r.path_segment}</span>
                            <span className="text-[10px] text-slate-400">{r.agent_name || 'Route'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs text-slate-500 font-mono">
                    No tasks, agents, or routes matching "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Gateway CLI, Bell, Live Node Status, Account */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Gateway CloudShell CLI Button */}
          <button
            onClick={() => setShowCliModal(true)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-neutral-900 border border-transparent hover:border-neutral-800 transition-colors"
            title="Gateway CLI & Test Shell"
          >
            <Terminal size={13} />
          </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-neutral-900 border border-transparent hover:border-neutral-800 transition-colors relative"
              title="Gateway Alerts"
            >
              <Bell size={13} />
              {failedTasks.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-rose-600 text-white text-[9px] font-bold px-1 leading-tight">
                  {failedTasks.length}
                </span>
              )}
            </button>

            {/* Notification Drawer */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-black border border-neutral-800 shadow-2xl py-3 px-3 z-50 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                  <span className="font-bold text-xs text-white">Gateway Notifications</span>
                  <button onClick={() => setShowNotifications(false)} className="text-slate-500 hover:text-white">
                    <X size={12} />
                  </button>
                </div>
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {failedTasks.length > 0 ? (
                    failedTasks.map((t) => (
                      <div key={t.id} className="p-2 bg-neutral-950 border border-rose-900/60 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-rose-400 font-medium">
                          <AlertTriangle size={12} />
                          <span>3am Test: Transport Failure</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono truncate">{t.id}</p>
                        <button
                          onClick={() => {
                            setSelectedTaskId(t.id);
                            setShowNotifications(false);
                          }}
                          className="text-[10px] text-indigo-400 hover:underline pt-0.5 block"
                        >
                          View Forensic Timeline ↗
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-slate-500 text-xs">
                      All upstream agent streams operating normally.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Settings Gear */}
          <button
            onClick={() => setShowKeyModal(true)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-neutral-900 border border-transparent hover:border-neutral-800 transition-colors"
            title="Gateway Settings & API Key"
          >
            <Settings size={13} />
          </button>

          {/* Real Gateway Node Status Pill (Replaces Dummy Envs) */}
          <div className="relative">
            <button
              onClick={() => setShowEnvMenu(!showEnvMenu)}
              className="flex items-center gap-1.5 px-2 py-1 hover:bg-neutral-900 border border-transparent hover:border-neutral-800 text-slate-300 hover:text-white transition-colors"
              title="Gateway Node Info"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[11px] font-mono hidden sm:inline">localhost:8000</span>
              <ChevronDown size={11} className="text-slate-500" />
            </button>

            {showEnvMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-black border border-neutral-800 shadow-2xl p-3 z-50 text-xs space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-neutral-800">
                  <span className="font-bold text-white">Gateway Node Status</span>
                  <span className="text-[10px] text-emerald-400 font-mono">ONLINE</span>
                </div>
                <div className="space-y-1 font-mono text-[11px] text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Endpoint:</span>
                    <span>http://localhost:8000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Data Plane:</span>
                    <span className="text-indigo-400">/gw/:route/</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">WebSocket:</span>
                    <span className="text-emerald-400">{wsStatus}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Active Tasks:</span>
                    <span>{tasks.filter((t) => !t.is_terminal).length}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
                  <button
                    onClick={handlePing}
                    disabled={pinging}
                    className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 text-white rounded text-[11px] border border-neutral-700 transition-colors"
                  >
                    {pinging ? 'Pinging...' : 'Ping /ready'}
                  </button>
                  {pingResult && (
                    <span className="text-[10px] font-mono text-emerald-400 truncate max-w-[130px]">
                      {pingResult}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Identity & Admin Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-1.5 px-2 py-1 hover:bg-neutral-900 border border-transparent hover:border-neutral-800 text-slate-300 hover:text-white transition-colors"
            >
              <span className="w-1.5 h-1.5 bg-emerald-400" title="Live Redis WS Connected" />
              <span className="text-[11px] font-medium hidden md:inline">Admin (Bootstrap)</span>
              <ChevronDown size={11} className="text-slate-500" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-black border border-neutral-800 shadow-2xl py-2 px-3 z-50 text-xs space-y-2">
                <div className="pb-2 border-b border-neutral-800">
                  <div className="font-bold text-white">Gateway Administrator</div>
                  <div className="text-[10px] text-slate-500 font-mono">Role: Global Key Admin</div>
                  <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-400" />
                    <span>WebSocket Stream: {wsStatus}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    setShowKeyModal(true);
                  }}
                  className="w-full text-left py-1 text-slate-300 hover:text-white text-[11px]"
                >
                  Configure Gateway Auth Key
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    setAuthenticated(false);
                    setIsAuthed(false);
                  }}
                  className="w-full text-left py-1.5 text-rose-400 hover:text-rose-300 text-[11px] flex items-center gap-1.5 border-t border-neutral-800 mt-1 pt-1.5"
                >
                  <LogOut size={12} />
                  <span>Sign Out of Gateway</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. Subnav Bar & Breadcrumbs */}
      <div className="h-8 bg-black border-b border-neutral-800/80 px-3 flex items-center justify-between text-xs select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-slate-400 hover:text-white p-1 hover:bg-neutral-900 transition-colors"
            title="Toggle Sidebar Navigation"
          >
            <Menu size={13} />
          </button>

          {/* Breadcrumb Path */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedTaskId(null);
                setActiveTab('home');
              }}
              className="font-bold text-white hover:text-slate-300 transition-colors text-[11px]"
            >
              A2A Gateway
            </button>
            <span className="text-neutral-700">/</span>
            <span className="text-slate-400 capitalize text-[11px]">
              {selectedTaskId ? `Task ${selectedTaskId.slice(0, 8)}...` : activeTab === 'home' ? 'Console Home' : activeTab}
            </span>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setSelectedTaskId(null);
              setActiveTab('home');
            }}
            className={`px-2.5 py-0.5 text-[11px] font-medium transition-colors border ${
              activeTab === 'home' && !selectedTaskId
                ? 'bg-neutral-900 text-white border-neutral-700'
                : 'text-slate-400 hover:text-white border-transparent'
            }`}
          >
            Console Home
          </button>
          <button
            onClick={() => {
              setSelectedTaskId(null);
              setActiveTab('tasks');
            }}
            className={`px-2.5 py-0.5 text-[11px] font-medium transition-colors border ${
              activeTab === 'tasks' && !selectedTaskId
                ? 'bg-neutral-900 text-white border-neutral-700'
                : 'text-slate-400 hover:text-white border-transparent'
            }`}
          >
            Tasks ({tasks.length})
          </button>
          <button
            onClick={() => {
              setSelectedTaskId(null);
              setActiveTab('agents');
            }}
            className={`px-2.5 py-0.5 text-[11px] font-medium transition-colors border ${
              activeTab === 'agents'
                ? 'bg-neutral-900 text-white border-neutral-700'
                : 'text-slate-400 hover:text-white border-transparent'
            }`}
          >
            Agents ({agents.length})
          </button>
          <button
            onClick={() => {
              setSelectedTaskId(null);
              setActiveTab('gateway');
            }}
            className={`px-2.5 py-0.5 text-[11px] font-medium transition-colors border ${
              activeTab === 'gateway'
                ? 'bg-neutral-900 text-white border-neutral-700'
                : 'text-slate-400 hover:text-white border-transparent'
            }`}
          >
            Gateway ({routes.length})
          </button>
        </div>
      </div>

      {/* 3. Collapsible Navigation Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div className="w-64 bg-black border-r border-neutral-800 p-4 flex flex-col justify-between shadow-2xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2.5 border-b border-neutral-800">
                <span className="font-bold text-xs uppercase text-white">Gateway Navigation</span>
                <button onClick={() => setSidebarOpen(false)} className="text-slate-500 hover:text-white">
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-1 text-xs">
                <button
                  onClick={() => {
                    setActiveTab('home');
                    setSelectedTaskId(null);
                    setSidebarOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left transition-colors flex items-center gap-2 border font-medium ${
                    activeTab === 'home' && !selectedTaskId ? 'bg-neutral-900 text-white border-neutral-700' : 'text-slate-400 hover:bg-neutral-900 border-transparent'
                  }`}
                >
                  <LayoutGrid size={13} />
                  <span>Console Home</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('tasks');
                    setSelectedTaskId(null);
                    setSidebarOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left transition-colors flex items-center gap-2 border font-medium ${
                    activeTab === 'tasks' && !selectedTaskId ? 'bg-neutral-900 text-white border-neutral-700' : 'text-slate-400 hover:bg-neutral-900 border-transparent'
                  }`}
                >
                  <Activity size={13} />
                  <span>Tasks Triage Stream</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('agents');
                    setSelectedTaskId(null);
                    setSidebarOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left transition-colors flex items-center gap-2 border font-medium ${
                    activeTab === 'agents' ? 'bg-neutral-900 text-white border-neutral-700' : 'text-slate-400 hover:bg-neutral-900 border-transparent'
                  }`}
                >
                  <Boxes size={13} />
                  <span>Registered Agents ({agents.length})</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('gateway');
                    setSelectedTaskId(null);
                    setSidebarOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left transition-colors flex items-center gap-2 border font-medium ${
                    activeTab === 'gateway' ? 'bg-neutral-900 text-white border-neutral-700' : 'text-slate-400 hover:bg-neutral-900 border-transparent'
                  }`}
                >
                  <Network size={13} />
                  <span>Routes & API Keys ({routes.length})</span>
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-800 text-[11px] text-slate-500">
              A2A Gateway Console • Sharp Black Edition
            </div>
          </div>
          <div className="flex-1 bg-black/80" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* 4. Main Body Content */}
      <main className="max-w-[1500px] mx-auto w-full px-4 sm:px-6 py-4 flex-1">
        {selectedTaskId ? (
          <TimelinePage
            taskId={selectedTaskId}
            onBack={() => setSelectedTaskId(null)}
          />
        ) : activeTab === 'home' ? (
          <ConsoleHome
            tasks={tasks}
            loading={loading}
            onSelectTask={(id) => setSelectedTaskId(id)}
            onNavigate={(tab) => {
              setSelectedTaskId(null);
              setActiveTab(tab);
            }}
            onOpenCli={() => setShowCliModal(true)}
          />
        ) : activeTab === 'tasks' ? (
          <TasksPage onSelectTask={(id) => setSelectedTaskId(id)} />
        ) : activeTab === 'agents' ? (
          <AgentsPage />
        ) : (
          <GatewayPage />
        )}
      </main>

      {/* 5. Gateway Shell — Interactive Test Endpoints Modal */}
      {showCliModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="bg-black border border-neutral-800 max-w-2xl w-full p-4 space-y-3 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2 text-white font-bold">
                <Terminal size={13} className="text-indigo-400" />
                <span>Gateway Shell — Test Endpoints & Triggers</span>
              </div>
              <button onClick={() => setShowCliModal(false)} className="text-slate-500 hover:text-white">
                <X size={13} />
              </button>
            </div>
            <div className="bg-neutral-950 p-3 border border-neutral-800 text-slate-300 space-y-3 leading-relaxed">
              {/* Snippet 1 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span># 1. Gateway Health & Readiness Check</span>
                  <button
                    onClick={() => handleCopyCmd('curl http://localhost:8000/ready', 'ready')}
                    className="text-slate-400 hover:text-white flex items-center gap-1 font-mono text-[10px]"
                  >
                    {copiedSnippet === 'ready' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    <span>{copiedSnippet === 'ready' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="flex items-center justify-between bg-black p-2 border border-neutral-900 rounded">
                  <span className="text-emerald-400 font-bold">$ curl http://localhost:8000/ready</span>
                  <button
                    onClick={handlePing}
                    disabled={pinging}
                    className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 text-[10px] text-slate-300 rounded border border-neutral-700"
                  >
                    {pinging ? 'Testing...' : 'Test in UI'}
                  </button>
                </div>
                {pingResult && (
                  <p className="text-[10px] text-emerald-400 font-mono bg-neutral-900/60 p-1 rounded">
                    {pingResult}
                  </p>
                )}
              </div>

              {/* Snippet 2 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span># 2. Trigger 3am Mid-Stream Failure Forensics (/gw/flaky/)</span>
                  <button
                    onClick={() =>
                      handleCopyCmd(
                        `curl -X POST http://localhost:8000/gw/flaky/ \\\n  -H "Authorization: Bearer ${apiKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"jsonrpc":"2.0","method":"message/stream","params":{"message":{"parts":[{"kind":"text","text":"directive flaky:die"}]}}}'`,
                        'flaky'
                      )
                    }
                    className="text-slate-400 hover:text-white flex items-center gap-1 font-mono text-[10px]"
                  >
                    {copiedSnippet === 'flaky' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    <span>{copiedSnippet === 'flaky' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="text-rose-400 font-bold bg-black p-2 border border-neutral-900 rounded overflow-x-auto text-[11px]">
{`$ curl -X POST http://localhost:8000/gw/flaky/ \\
  -H "Authorization: Bearer ${apiKey}" \\
  -d '{"jsonrpc":"2.0","method":"message/stream","params":{"message":{"parts":[{"kind":"text","text":"directive flaky:die"}]}}}'`}
                </pre>
              </div>

              {/* Snippet 3 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span># 3. Stream Multi-step Research Task (/gw/research/)</span>
                  <button
                    onClick={() =>
                      handleCopyCmd(
                        `curl -N -X POST http://localhost:8000/gw/research/ \\\n  -H "Authorization: Bearer ${apiKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"jsonrpc":"2.0","method":"message/stream","params":{"message":{"parts":[{"kind":"text","text":"analyze telemetry"}]}}}'`,
                        'research'
                      )
                    }
                    className="text-slate-400 hover:text-white flex items-center gap-1 font-mono text-[10px]"
                  >
                    {copiedSnippet === 'research' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    <span>{copiedSnippet === 'research' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="text-blue-400 font-bold bg-black p-2 border border-neutral-900 rounded overflow-x-auto text-[11px]">
{`$ curl -N -X POST http://localhost:8000/gw/research/ \\
  -H "Authorization: Bearer ${apiKey}" \\
  -d '{"jsonrpc":"2.0","method":"message/stream","params":{"message":{"parts":[{"kind":"text","text":"analyze telemetry"}]}}}'`}
                </pre>
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <button
                onClick={() => setShowCliModal(false)}
                className="px-4 py-1.5 bg-white text-black font-bold hover:bg-neutral-200 transition-colors text-xs"
              >
                Close Shell
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Set API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="bg-black border border-neutral-800 max-w-sm w-full p-4 space-y-3 shadow-2xl">
            <h3 className="text-xs font-bold uppercase text-white">Gateway API Key</h3>
            <p className="text-[11px] text-slate-400 leading-normal">
              Control plane endpoints require a valid gateway key. Enter your bootstrap admin key or issued bearer key:
            </p>

            <form onSubmit={handleSaveKey} className="space-y-3 pt-1">
              <input
                type="password"
                placeholder="dev-only-do-not-use-in-prod"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-neutral-500 font-mono"
              />
              <div className="flex justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-colors"
                >
                  Save Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
