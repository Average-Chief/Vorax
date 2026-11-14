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
} from 'lucide-react';
import { useWs } from './hooks/useWs';
import { useLiveTasks } from './hooks/useLiveTasks';
import { ConsoleHome } from './pages/ConsoleHome';
import { TasksPage } from './pages/Tasks';
import { TimelinePage } from './pages/Timeline';
import { AgentsPage } from './pages/Agents';
import { GatewayPage } from './pages/Gateway';
import { getStoredApiKey, setStoredApiKey } from './lib/api';

type Tab = 'home' | 'tasks' | 'agents' | 'gateway';

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState(getStoredApiKey());
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showCliModal, setShowCliModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showServicesMenu, setShowServicesMenu] = useState(false);
  const [showEnvMenu, setShowEnvMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedEnv, setSelectedEnv] = useState('Local Docker Fleet (Port 8000)');

  const { status: wsStatus } = useWs();
  const { tasks, loading } = useLiveTasks();
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  const failedTasks = tasks.filter((t) => {
    const s = (t.current_state || '').toLowerCase();
    return ['failed', 'rejected', 'input-required'].includes(s);
  });

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
                      <div className="text-[11px] text-slate-400">Echo, Research, and Flaky agent cards</div>
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

          {/* Sharp Search Bar with [Option+S] */}
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

            {/* Quick Search Dropdown */}
            {searchOpen && (
              <div className="absolute left-0 mt-1.5 w-full bg-black border border-neutral-800 shadow-2xl py-2 z-50">
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
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Gateway CLI, Bell, Env, Account */}
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

          {/* Environment Selector */}
          <div className="relative">
            <button
              onClick={() => setShowEnvMenu(!showEnvMenu)}
              className="flex items-center gap-1 px-2 py-1 hover:bg-neutral-900 border border-transparent hover:border-neutral-800 text-slate-300 hover:text-white transition-colors"
            >
              <span className="text-[11px] hidden sm:inline">{selectedEnv}</span>
              <ChevronDown size={11} className="text-slate-500" />
            </button>

            {showEnvMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-black border border-neutral-800 shadow-2xl py-1 z-50 text-xs">
                {['Local Docker Fleet (Port 8000)', 'Staging Gateway', 'Production Swarm'].map(
                  (env) => (
                    <button
                      key={env}
                      onClick={() => {
                        setSelectedEnv(env);
                        setShowEnvMenu(false);
                      }}
                      className={`w-full px-3 py-1.5 text-left hover:bg-neutral-900 transition-colors ${
                        selectedEnv === env ? 'text-indigo-400 font-semibold' : 'text-slate-300'
                      }`}
                    >
                      {env}
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {/* Identity & WebSocket Status Pill */}
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
            Agents
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
            Gateway
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
                  <span>Registered Agents</span>
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
                  <span>Routes & API Keys</span>
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

      {/* 5. CloudShell CLI Simulation Modal */}
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
            <div className="bg-neutral-950 p-3 border border-neutral-800 text-slate-300 space-y-2 leading-relaxed">
              <p className="text-slate-500"># 1. Gateway Health Check</p>
              <p className="text-emerald-400 font-bold">$ curl http://localhost:8000/healthz</p>
              <p className="text-slate-500"># 2. Trigger 3am Test (simulated mid-stream drop on /gw/flaky/)</p>
              <p className="text-rose-400 font-bold">
                $ curl -X POST http://localhost:8000/gw/flaky/ \<br />
                &nbsp;&nbsp;-H "Authorization: Bearer dev-only-do-not-use-in-prod" \<br />
                &nbsp;&nbsp;-d '&#123;"jsonrpc":"2.0","method":"message/stream","params":&#123;"message":&#123;"parts":[&#123;"kind":"text","text":"directive flaky:die"&#125;]&#125;&#125;&#125;'
              </p>
              <p className="text-slate-500"># 3. Stream Multi-step Research Task</p>
              <p className="text-blue-400 font-bold">
                $ curl -N -X POST http://localhost:8000/gw/research/ \<br />
                &nbsp;&nbsp;-H "Authorization: Bearer dev-only-do-not-use-in-prod" \<br />
                &nbsp;&nbsp;-d '&#123;"jsonrpc":"2.0","method":"message/stream","params":&#123;"message":&#123;"parts":[&#123;"kind":"text","text":"analyze telemetry"&#125;]&#125;&#125;&#125;'
              </p>
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
