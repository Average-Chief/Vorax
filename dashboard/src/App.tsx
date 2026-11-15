import React, { useState, useEffect } from 'react';
import {
  Bell,
  Settings,
  Terminal,
  ChevronDown,
  X,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
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
import { getStoredApiKey, setStoredApiKey, fetchAgents, fetchRoutes } from './lib/api';
import { isDashboardAuthenticated, logoutDashboard } from './lib/auth';
import { StateChip } from './components/StateChip';
import { Logo } from './components/Logo';

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
  const [isAuthed, setIsAuthed] = useState<boolean>(isDashboardAuthenticated());
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showCliModal, setShowCliModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showEnvMenu, setShowEnvMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Real connected data for global status
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [routes, setRoutes] = useState<GatewayRoute[]>([]);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [pingResult, setPingResult] = useState<string | null>(null);
  const [pinging, setPinging] = useState(false);

  const { status: wsStatus } = useWs();
  const { tasks, loading } = useLiveTasks();

  useEffect(() => {
    Promise.all([fetchAgents(), fetchRoutes()])
      .then(([a, r]) => {
        setAgents(a);
        setRoutes(r);
      })
      .catch(() => {});
  }, []);

  // Escape key closes menus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
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

  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('a2a_read_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const markNotificationAsRead = (id: string) => {
    setReadNotificationIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try {
        localStorage.setItem('a2a_read_notifications', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const markAllNotificationsAsRead = () => {
    const allIds = failedTasks.map((t) => t.id);
    setReadNotificationIds((prev) => {
      const combined = Array.from(new Set([...prev, ...allIds]));
      try {
        localStorage.setItem('a2a_read_notifications', JSON.stringify(combined));
      } catch (e) {}
      return combined;
    });
  };

  const failedTasks = tasks.filter((t) => {
    const s = (t.current_state || '').toLowerCase();
    return ['failed', 'rejected', 'input-required'].includes(s);
  });

  const unreadFailedTasks = failedTasks.filter((t) => !readNotificationIds.includes(t.id));

  const toggleNotifications = () => {
    const nextState = !showNotifications;
    setShowNotifications(nextState);
    if (nextState) {
      markAllNotificationsAsRead();
    }
  };

  if (!isAuthed) {
    return (
      <LoginPage
        onLoginSuccess={() => {
          setIsAuthed(true);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-black text-slate-100 font-sans selection:bg-neutral-800 selection:text-white">
      {/* 1. Pure Black Unified Navigation Bar */}
      <header className="h-12 bg-black border-b border-neutral-800 px-3 sm:px-4 flex items-center justify-between text-xs select-none sticky top-0 z-50">
        {/* Left Side: Brand Logo + Primary View Tabs */}
        <div className="flex items-center gap-4 sm:gap-6">
          {/* A2A Gateway Logo */}
          <div
            onClick={() => {
              setSelectedTaskId(null);
              setActiveTab('home');
            }}
            className="flex items-center gap-2.5 cursor-pointer group px-1 py-0.5 hover:bg-neutral-900 transition-colors"
            title="A2A Gateway Console Home"
          >
            <Logo className="h-5 w-auto" />
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-white text-xs tracking-tight">Gateway</span>
              <span className="text-[10px] text-slate-500 font-mono">v0.1</span>
            </div>
          </div>

          {/* Primary View Tabs */}
          <nav className="flex items-center gap-1">
            <button
              onClick={() => {
                setSelectedTaskId(null);
                setActiveTab('home');
              }}
              className={`px-2.5 py-1 text-xs font-medium transition-colors border ${
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
              className={`px-2.5 py-1 text-xs font-medium transition-colors border flex items-center gap-1.5 ${
                activeTab === 'tasks' && !selectedTaskId
                  ? 'bg-neutral-900 text-white border-neutral-700'
                  : 'text-slate-400 hover:text-white border-transparent'
              }`}
            >
              <span>Tasks</span>
              <span className="text-[10px] px-1 py-0.2 bg-neutral-900 border border-neutral-800 rounded font-mono text-slate-300">
                {tasks.length}
              </span>
            </button>
            <button
              onClick={() => {
                setSelectedTaskId(null);
                setActiveTab('agents');
              }}
              className={`px-2.5 py-1 text-xs font-medium transition-colors border flex items-center gap-1.5 ${
                activeTab === 'agents'
                  ? 'bg-neutral-900 text-white border-neutral-700'
                  : 'text-slate-400 hover:text-white border-transparent'
              }`}
            >
              <span>Agents</span>
              <span className="text-[10px] px-1 py-0.2 bg-neutral-900 border border-neutral-800 rounded font-mono text-slate-300">
                {agents.length}
              </span>
            </button>
            <button
              onClick={() => {
                setSelectedTaskId(null);
                setActiveTab('gateway');
              }}
              className={`px-2.5 py-1 text-xs font-medium transition-colors border flex items-center gap-1.5 ${
                activeTab === 'gateway'
                  ? 'bg-neutral-900 text-white border-neutral-700'
                  : 'text-slate-400 hover:text-white border-transparent'
              }`}
            >
              <span>Gateway</span>
              <span className="text-[10px] px-1 py-0.2 bg-neutral-900 border border-neutral-800 rounded font-mono text-slate-300">
                {routes.length}
              </span>
            </button>
          </nav>
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
              onClick={toggleNotifications}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-neutral-900 border border-transparent hover:border-neutral-800 transition-colors relative"
              title="Gateway Alerts"
            >
              <Bell size={13} />
              {unreadFailedTasks.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-rose-600 text-white text-[9px] font-bold px-1 leading-tight rounded-sm">
                  {unreadFailedTasks.length}
                </span>
              )}
            </button>

            {/* Notification Drawer */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-black border border-neutral-800 shadow-2xl py-3 px-3 z-50 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-white">Gateway Notifications</span>
                    {unreadFailedTasks.length > 0 ? (
                      <span className="text-[10px] bg-rose-950 text-rose-300 border border-rose-800 px-1 font-mono">
                        {unreadFailedTasks.length} new
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-mono">
                        All read
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {failedTasks.length > 0 && (
                      <button
                        onClick={markAllNotificationsAsRead}
                        className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                        title="Mark all alerts as read"
                      >
                        Clear badge
                      </button>
                    )}
                    <button onClick={() => setShowNotifications(false)} className="text-slate-500 hover:text-white">
                      <X size={12} />
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {failedTasks.length > 0 ? (
                    failedTasks.map((t) => {
                      const isUnread = !readNotificationIds.includes(t.id);
                      return (
                        <div
                          key={t.id}
                          className={`p-2 bg-neutral-950 border text-xs space-y-1 transition-colors ${
                            isUnread ? 'border-rose-900/80 bg-rose-950/20' : 'border-neutral-800/60 opacity-80'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-rose-400 font-medium">
                              <AlertTriangle size={12} />
                              <span>3am Test: Transport Failure</span>
                            </div>
                            <button
                              onClick={() => markNotificationAsRead(t.id)}
                              className="text-slate-500 hover:text-slate-300 p-0.5"
                              title="Dismiss this notification"
                            >
                              <X size={10} />
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono truncate">{t.id}</p>
                          <button
                            onClick={() => {
                              markNotificationAsRead(t.id);
                              setSelectedTaskId(t.id);
                              setShowNotifications(false);
                            }}
                            className="text-[10px] text-indigo-400 hover:underline pt-0.5 block"
                          >
                            View Forensic Timeline ↗
                          </button>
                        </div>
                      );
                    })
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
                    setShowChangePasswordModal(true);
                  }}
                  className="w-full text-left py-1 text-slate-300 hover:text-white text-[11px]"
                >
                  Change Admin Password
                </button>
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
                    logoutDashboard();
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

      {/* 2. Main Body Content */}
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

      {/* 5b. Change Admin Password Modal */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="relative max-w-md w-full">
            <button
              onClick={() => setShowChangePasswordModal(false)}
              className="absolute -top-8 right-0 text-slate-400 hover:text-white flex items-center gap-1 text-xs"
            >
              <X size={14} /> Close
            </button>
            <LoginPage
              initialMode="change_password"
              onLoginSuccess={() => setShowChangePasswordModal(false)}
            />
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
