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
    <div className="min-h-screen flex flex-col bg-[#0b0f17] text-slate-100 font-sans selection:bg-indigo-600 selection:text-white">
      {/* 1. Cloud-Console Style Top Navigation Bar */}
      <header className="h-11 bg-[#101622] border-b border-[#1e293b] px-3 flex items-center justify-between text-xs select-none sticky top-0 z-50">
        {/* Left Side: Brand Logo + Services Menu + Search */}
        <div className="flex items-center gap-3">
          {/* A2A Gateway Logo */}
          <div
            onClick={() => {
              setSelectedTaskId(null);
              setActiveTab('home');
            }}
            className="flex items-center gap-2 cursor-pointer group px-1 py-0.5 rounded hover:bg-slate-800 transition-colors"
            title="A2A Gateway Console Home"
          >
            <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center font-black text-white text-[11px] shadow-sm tracking-wider">
              A2A
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-white text-sm tracking-tight">Gateway</span>
              <span className="text-[10px] text-slate-400 font-mono">v0.1</span>
            </div>
          </div>

          {/* Quick Services Menu */}
          <div className="relative">
            <button
              onClick={() => setShowServicesMenu(!showServicesMenu)}
              className={`p-1.5 rounded transition-colors flex items-center justify-center ${
                showServicesMenu ? 'bg-[#1e293b] text-white' : 'text-slate-400 hover:text-white hover:bg-[#162030]'
              }`}
              title="Gateway Services & Routes"
            >
              <LayoutGrid size={15} />
            </button>

            {/* Services Dropdown */}
            {showServicesMenu && (
              <div className="absolute left-0 mt-2 w-72 bg-[#111724] border border-[#1e293b] rounded-lg shadow-2xl py-2 z-50">
                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  Gateway Control Plane
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      setActiveTab('home');
                      setSelectedTaskId(null);
                      setShowServicesMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2.5 text-slate-200"
                  >
                    <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center text-white text-[10px]">
                      H
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-white">Console Home</div>
                      <div className="text-[10px] text-slate-400">Modular widgets & telemetry overview</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('tasks');
                      setSelectedTaskId(null);
                      setShowServicesMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2.5 text-slate-200"
                  >
                    <div className="w-5 h-5 rounded bg-cyan-600 flex items-center justify-center text-white text-[10px]">
                      <Activity size={12} />
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-white">Tasks Triage & Live Feed</div>
                      <div className="text-[10px] text-slate-400">Streamed task states & priority sorting</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('agents');
                      setSelectedTaskId(null);
                      setShowServicesMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2.5 text-slate-200"
                  >
                    <div className="w-5 h-5 rounded bg-amber-600 flex items-center justify-center text-white text-[10px]">
                      <Boxes size={12} />
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-white">Upstream Agent Registry</div>
                      <div className="text-[10px] text-slate-400">Echo, Research, and Flaky agent cards</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('gateway');
                      setSelectedTaskId(null);
                      setShowServicesMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2.5 text-slate-200"
                  >
                    <div className="w-5 h-5 rounded bg-emerald-600 flex items-center justify-center text-white text-[10px]">
                      <Network size={12} />
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-white">Gateway Routes & API Keys</div>
                      <div className="text-[10px] text-slate-400">Path segments & bcrypt token management</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Search Bar with [Option+S] shortcut */}
          <div className="relative">
            <div
              onClick={() => {
                setSearchOpen(true);
                setTimeout(() => searchInputRef.current?.focus(), 50);
              }}
              className="flex items-center gap-2 w-48 sm:w-72 md:w-80 h-7 px-2.5 rounded bg-[#0d121b] hover:bg-[#141b27] border border-[#1e293b] text-slate-400 cursor-pointer transition-colors"
            >
              <Search size={13} className="text-slate-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search tasks, agents, routes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchOpen(true)}
                className="bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none w-full"
              />
              <span className="text-[10px] font-mono text-slate-400 bg-[#162030] border border-slate-700/80 px-1 py-0.2 rounded shrink-0">
                [Option+S]
              </span>
            </div>

            {/* Quick Search Palette */}
            {searchOpen && (
              <div className="absolute left-0 mt-1.5 w-full bg-[#111724] border border-[#1e293b] rounded-lg shadow-2xl py-2 z-50">
                <div className="px-3 py-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Quick Navigation
                </div>
                <div className="py-1">
                  <div
                    onClick={() => {
                      setActiveTab('tasks');
                      setSelectedTaskId(null);
                      setSearchOpen(false);
                    }}
                    className="px-3 py-1.5 hover:bg-slate-800 text-xs text-slate-200 cursor-pointer flex items-center justify-between"
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
                    className="px-3 py-1.5 hover:bg-slate-800 text-xs text-slate-200 cursor-pointer flex items-center justify-between"
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
                    className="px-3 py-1.5 hover:bg-slate-800 text-xs text-slate-200 cursor-pointer flex items-center justify-between"
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
                      className="px-3 py-1.5 hover:bg-slate-800 text-xs text-slate-200 cursor-pointer flex items-center justify-between"
                    >
                      <span className="font-mono text-[11px] truncate">{t.id}</span>
                      <span className="text-[10px] text-blue-400">Open Timeline</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: CloudShell CLI, Bell, Env, Account */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Gateway CloudShell CLI Button */}
          <button
            onClick={() => setShowCliModal(true)}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#162030] transition-colors"
            title="Gateway CLI & Smoke Test Shell"
          >
            <Terminal size={14} />
          </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#162030] transition-colors relative"
              title="Gateway Alerts & 3am Test Forensics"
            >
              <Bell size={14} />
              {failedTasks.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[9px] font-bold px-1 rounded-full leading-tight">
                  {failedTasks.length}
                </span>
              )}
            </button>

            {/* Notification Drawer */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-[#111724] border border-[#1e293b] rounded-lg shadow-2xl py-3 px-3 z-50 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="font-bold text-xs text-white">Gateway Notifications</span>
                  <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-white">
                    <X size={12} />
                  </button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {failedTasks.length > 0 ? (
                    failedTasks.map((t) => (
                      <div key={t.id} className="p-2 rounded bg-slate-900 border border-rose-900/30 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-rose-400 font-medium">
                          <AlertTriangle size={13} />
                          <span>3am Test: Transport Failure</span>
                        </div>
                        <p className="text-[11px] text-slate-300 font-mono truncate">{t.id}</p>
                        <button
                          onClick={() => {
                            setSelectedTaskId(t.id);
                            setShowNotifications(false);
                          }}
                          className="text-[11px] text-blue-400 hover:underline pt-1 block"
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
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#162030] transition-colors"
            title="Gateway Settings & API Key"
          >
            <Settings size={14} />
          </button>

          {/* Environment Selector */}
          <div className="relative">
            <button
              onClick={() => setShowEnvMenu(!showEnvMenu)}
              className="flex items-center gap-1 px-2 py-1 rounded hover:bg-[#162030] text-slate-300 hover:text-white transition-colors"
            >
              <span className="text-[11px] hidden sm:inline">{selectedEnv}</span>
              <ChevronDown size={11} className="text-slate-400" />
            </button>

            {showEnvMenu && (
              <div className="absolute right-0 mt-2 w-60 bg-[#111724] border border-[#1e293b] rounded-lg shadow-2xl py-1 z-50 text-xs">
                {['Local Docker Fleet (Port 8000)', 'Staging Gateway', 'Production Swarm'].map(
                  (env) => (
                    <button
                      key={env}
                      onClick={() => {
                        setSelectedEnv(env);
                        setShowEnvMenu(false);
                      }}
                      className={`w-full px-3 py-1.5 text-left hover:bg-slate-800 transition-colors ${
                        selectedEnv === env ? 'text-blue-400 font-semibold' : 'text-slate-300'
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
              className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[#162030] text-slate-300 hover:text-white transition-colors"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Live Redis WS Connected" />
              <span className="text-[11px] font-medium hidden md:inline">Admin (Bootstrap)</span>
              <ChevronDown size={11} className="text-slate-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-[#111724] border border-[#1e293b] rounded-lg shadow-2xl py-2 px-3 z-50 text-xs space-y-2">
                <div className="pb-2 border-b border-slate-800">
                  <div className="font-bold text-white">Gateway Administrator</div>
                  <div className="text-[11px] text-slate-400 font-mono">Role: Global Key Admin</div>
                  <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>WebSocket Stream: {wsStatus}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    setShowKeyModal(true);
                  }}
                  className="w-full text-left py-1 text-slate-300 hover:text-white"
                >
                  Configure Gateway Auth Key
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. Subnav Bar & Drawer Toggle */}
      <div className="h-9 bg-[#0e131d] border-b border-[#1a2332] px-3 flex items-center justify-between text-xs select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
            title="Toggle Sidebar Navigation"
          >
            <Menu size={14} />
          </button>

          {/* Breadcrumb Path */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedTaskId(null);
                setActiveTab('home');
              }}
              className="font-bold text-white hover:text-slate-200 transition-colors flex items-center gap-1.5"
            >
              <span>A2A Gateway</span>
            </button>
            <span className="text-slate-600">/</span>
            <span className="text-slate-300 capitalize">
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
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              activeTab === 'home' && !selectedTaskId ? 'bg-[#1e293b] text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Console Home
          </button>
          <button
            onClick={() => {
              setSelectedTaskId(null);
              setActiveTab('tasks');
            }}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              activeTab === 'tasks' && !selectedTaskId ? 'bg-[#1e293b] text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Tasks ({tasks.length})
          </button>
          <button
            onClick={() => {
              setSelectedTaskId(null);
              setActiveTab('agents');
            }}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              activeTab === 'agents' ? 'bg-[#1e293b] text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Agents
          </button>
          <button
            onClick={() => {
              setSelectedTaskId(null);
              setActiveTab('gateway');
            }}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              activeTab === 'gateway' ? 'bg-[#1e293b] text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Gateway
          </button>
        </div>
      </div>

      {/* 3. Collapsible Navigation Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div className="w-64 bg-[#111724] border-r border-[#1e293b] p-4 flex flex-col justify-between shadow-2xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="font-bold text-sm text-white">Gateway Navigation</span>
                <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-white">
                  <X size={15} />
                </button>
              </div>

              <div className="space-y-1 text-xs">
                <button
                  onClick={() => {
                    setActiveTab('home');
                    setSelectedTaskId(null);
                    setSidebarOpen(false);
                  }}
                  className={`w-full px-3 py-2 rounded text-left font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'home' && !selectedTaskId ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <LayoutGrid size={14} />
                  <span>Console Home</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('tasks');
                    setSelectedTaskId(null);
                    setSidebarOpen(false);
                  }}
                  className={`w-full px-3 py-2 rounded text-left font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'tasks' && !selectedTaskId ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Activity size={14} />
                  <span>Tasks Triage Stream</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('agents');
                    setSelectedTaskId(null);
                    setSidebarOpen(false);
                  }}
                  className={`w-full px-3 py-2 rounded text-left font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'agents' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Boxes size={14} />
                  <span>Registered Agents</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('gateway');
                    setSelectedTaskId(null);
                    setSidebarOpen(false);
                  }}
                  className={`w-full px-3 py-2 rounded text-left font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'gateway' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Network size={14} />
                  <span>Routes & API Keys</span>
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500">
              A2A Gateway Console • Cloud-Native Observability
            </div>
          </div>
          <div className="flex-1 bg-black/60" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* 4. Main Body Content */}
      <main className="max-w-[1500px] mx-auto w-full px-4 sm:px-6 py-5 flex-1">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="bg-[#101622] border border-[#1e293b] rounded-lg max-w-2xl w-full p-4 space-y-3 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-bold">
                <Terminal size={14} className="text-indigo-400" />
                <span>Gateway Shell — Test Endpoints & Triggers</span>
              </div>
              <button onClick={() => setShowCliModal(false)} className="text-slate-400 hover:text-white">
                <X size={14} />
              </button>
            </div>
            <div className="bg-[#0b0f17] p-3 rounded border border-slate-800/80 text-slate-300 space-y-2 leading-relaxed">
              <p className="text-slate-400"># 1. Gateway Health Check</p>
              <p className="text-emerald-400 font-bold">$ curl http://localhost:8000/healthz</p>
              <p className="text-slate-400"># 2. Trigger 3am Test (simulated mid-stream drop on /gw/flaky/)</p>
              <p className="text-rose-400 font-bold">
                $ curl -X POST http://localhost:8000/gw/flaky/ \<br />
                &nbsp;&nbsp;-H "Authorization: Bearer dev-only-do-not-use-in-prod" \<br />
                &nbsp;&nbsp;-d '&#123;"jsonrpc":"2.0","method":"message/stream","params":&#123;"message":&#123;"parts":[&#123;"kind":"text","text":"directive flaky:die"&#125;]&#125;&#125;&#125;'
              </p>
              <p className="text-slate-400"># 3. Stream Multi-step Research Task</p>
              <p className="text-blue-400 font-bold">
                $ curl -N -X POST http://localhost:8000/gw/research/ \<br />
                &nbsp;&nbsp;-H "Authorization: Bearer dev-only-do-not-use-in-prod" \<br />
                &nbsp;&nbsp;-d '&#123;"jsonrpc":"2.0","method":"message/stream","params":&#123;"message":&#123;"parts":[&#123;"kind":"text","text":"analyze telemetry"&#125;]&#125;&#125;&#125;'
              </p>
            </div>
            <div className="flex justify-end pt-1">
              <button
                onClick={() => setShowCliModal(false)}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium"
              >
                Close Shell
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Set API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="bg-[#111724] border border-[#1e293b] rounded-lg max-w-sm w-full p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white">Gateway API Key</h3>
            <p className="text-xs text-slate-400">
              Control plane endpoints require a valid gateway key. Enter your bootstrap admin key or issued bearer key:
            </p>

            <form onSubmit={handleSaveKey} className="space-y-3">
              <input
                type="password"
                placeholder="dev-only-do-not-use-in-prod"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3 py-2 bg-[#0b0f17] border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium"
                >
                  Save & Reload
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
