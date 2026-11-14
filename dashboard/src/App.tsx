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
  Shield,
  Radio,
  Activity,
  Boxes,
  Zap,
  Globe,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Code2,
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
  const [showRegionMenu, setShowRegionMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState('Asia Pacific (Mumbai)');

  const { status: wsStatus } = useWs();
  const { tasks, loading } = useLiveTasks();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut listener for Option+S or Cmd+K
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
        setShowRegionMenu(false);
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

  const failedTasks = tasks.filter((t) => (t.current_state || '').toLowerCase() === 'failed');

  return (
    <div className="min-h-screen flex flex-col bg-[#0f141c] text-slate-100 font-sans selection:bg-[#ec7211] selection:text-white">
      {/* 1. Global AWS Management Console Top Bar */}
      <header className="h-10 bg-[#131924] border-b border-[#253246] px-3 flex items-center justify-between text-xs select-none sticky top-0 z-50">
        {/* Left Side: AWS Logo + Services Menu + Search */}
        <div className="flex items-center gap-3">
          {/* AWS Logo with signature orange curve */}
          <div
            onClick={() => {
              setSelectedTaskId(null);
              setActiveTab('home');
            }}
            className="flex items-center gap-1.5 cursor-pointer group px-1 py-0.5 rounded hover:bg-slate-800 transition-colors"
            title="AWS Management Console Home"
          >
            <div className="relative font-black tracking-tighter text-white text-base leading-none">
              <span>aws</span>
              <svg className="w-5 h-1.5 -mt-0.5 text-[#ec7211]" viewBox="0 0 24 6" fill="none">
                <path d="M1 1C7 4.5 17 4.5 23 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* 9-dot Services Menu Button */}
          <div className="relative">
            <button
              onClick={() => setShowServicesMenu(!showServicesMenu)}
              className={`p-1.5 rounded transition-colors flex items-center justify-center ${
                showServicesMenu ? 'bg-[#253246] text-white' : 'text-slate-400 hover:text-white hover:bg-[#1a2332]'
              }`}
              title="Services"
            >
              <LayoutGrid size={15} />
            </button>

            {/* Services Dropdown */}
            {showServicesMenu && (
              <div className="absolute left-0 mt-2 w-72 bg-[#161f2e] border border-[#2b3a50] rounded-lg shadow-2xl py-2 z-50">
                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  A2A Gateway & AWS Services
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
                      <div className="text-[10px] text-slate-400">AWS Console widgets & overview</div>
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
                    <div className="w-5 h-5 rounded bg-pink-600 flex items-center justify-center text-white text-[10px]">
                      <Activity size={12} />
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-white">CloudWatch Tasks & Triage</div>
                      <div className="text-[10px] text-slate-400">Live triage feed & state updates</div>
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
                    <div className="w-5 h-5 rounded bg-orange-600 flex items-center justify-center text-white text-[10px]">
                      <Boxes size={12} />
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-white">ECR & Agent Registry</div>
                      <div className="text-[10px] text-slate-400">Echo, Research, and Flaky agents</div>
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
                    <div className="w-5 h-5 rounded bg-rose-600 flex items-center justify-center text-white text-[10px]">
                      <Zap size={12} />
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-white">Amplify & Routes Registry</div>
                      <div className="text-[10px] text-slate-400">Proxy routes & API keys</div>
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
              className="flex items-center gap-2 w-48 sm:w-72 md:w-96 h-7 px-2.5 rounded bg-[#101622] hover:bg-[#151d2d] border border-[#2b3a50] text-slate-400 cursor-pointer transition-colors"
            >
              <Search size={13} className="text-slate-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchOpen(true)}
                className="bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none w-full"
              />
              <span className="text-[10px] font-mono text-slate-400 bg-[#1e2738] border border-slate-700/80 px-1 py-0.2 rounded shrink-0">
                [Option+S]
              </span>
            </div>

            {/* Quick Search Results Dropdown */}
            {searchOpen && (
              <div className="absolute left-0 mt-1.5 w-full bg-[#161f2e] border border-[#2b3a50] rounded-lg shadow-2xl py-2 z-50">
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
                    <span>Tasks & Triage Stream</span>
                    <span className="text-[10px] text-blue-400">CloudWatch</span>
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
                    <span className="text-[10px] text-orange-400">ECR</span>
                  </div>
                  <div
                    onClick={() => {
                      setActiveTab('gateway');
                      setSelectedTaskId(null);
                      setSearchOpen(false);
                    }}
                    className="px-3 py-1.5 hover:bg-slate-800 text-xs text-slate-200 cursor-pointer flex items-center justify-between"
                  >
                    <span>Active Gateway Routes & API Keys</span>
                    <span className="text-[10px] text-rose-400">Amplify</span>
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
                      <span className="text-[10px] text-emerald-400">Timeline</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Utilities, Bell, Region, Account */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* CloudShell Terminal Icon */}
          <button
            onClick={() => setShowCliModal(true)}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#1e2738] transition-colors"
            title="AWS CloudShell / Gateway CLI"
          >
            <Terminal size={14} />
          </button>

          {/* Notifications Bell with badge 8 */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#1e2738] transition-colors relative"
              title="AWS User Notifications"
            >
              <Bell size={14} />
              <span className="absolute -top-0.5 -right-0.5 bg-[#ec7211] text-white text-[9px] font-bold px-1 rounded-full leading-tight">
                {failedTasks.length > 0 ? failedTasks.length : '8'}
              </span>
            </button>

            {/* Notification Drawer */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-[#161f2e] border border-[#2b3a50] rounded-lg shadow-2xl py-3 px-3 z-50 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="font-bold text-xs text-white">AWS Notifications</span>
                  <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-white">
                    <X size={12} />
                  </button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                      <AlertTriangle size={13} />
                      <span>The 3am Test Alert</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Simulated upstream flaky connection drop detected on route /gw/flaky/.
                    </p>
                    <button
                      onClick={() => {
                        setActiveTab('tasks');
                        setShowNotifications(false);
                      }}
                      className="text-[11px] text-blue-400 hover:underline pt-1 block"
                    >
                      View in Tasks Triage ↗
                    </button>
                  </div>

                  <div className="p-2 rounded bg-slate-900/40 border border-slate-800/80 text-xs space-y-0.5">
                    <div className="text-slate-300 font-medium">A2A Gateway Live</div>
                    <p className="text-[11px] text-slate-400">WebSocket pub/sub stream connected to Redis.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Help Question Mark */}
          <button
            onClick={() => window.open('https://github.com', '_blank')}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#1e2738] transition-colors"
            title="Help"
          >
            <HelpCircle size={14} />
          </button>

          {/* Settings Gear */}
          <button
            onClick={() => setShowKeyModal(true)}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#1e2738] transition-colors"
            title="Gateway Settings & API Key"
          >
            <Settings size={14} />
          </button>

          {/* Region Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowRegionMenu(!showRegionMenu)}
              className="flex items-center gap-1 px-2 py-1 rounded hover:bg-[#1e2738] text-slate-300 hover:text-white transition-colors"
            >
              <span className="text-[11px] hidden sm:inline">{selectedRegion}</span>
              <ChevronDown size={11} className="text-slate-400" />
            </button>

            {showRegionMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-[#161f2e] border border-[#2b3a50] rounded-lg shadow-2xl py-1 z-50 text-xs">
                {['Asia Pacific (Mumbai)', 'US East (N. Virginia)', 'US West (Oregon)', 'Local Docker (macOS)'].map(
                  (reg) => (
                    <button
                      key={reg}
                      onClick={() => {
                        setSelectedRegion(reg);
                        setShowRegionMenu(false);
                      }}
                      className={`w-full px-3 py-1.5 text-left hover:bg-slate-800 transition-colors ${
                        selectedRegion === reg ? 'text-blue-400 font-semibold' : 'text-slate-300'
                      }`}
                    >
                      {reg}
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {/* Account ID / Profile Pill */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[#1e2738] text-slate-300 hover:text-white transition-colors"
            >
              <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-[9px] font-bold text-white">
                L
              </div>
              <span className="text-[11px] font-medium hidden md:inline">Liquidlab_Dev (612662553568)</span>
              <ChevronDown size={11} className="text-slate-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-[#161f2e] border border-[#2b3a50] rounded-lg shadow-2xl py-2 px-3 z-50 text-xs space-y-2">
                <div className="pb-2 border-b border-slate-800">
                  <div className="font-bold text-white">Liquidlab_Dev</div>
                  <div className="text-[11px] text-slate-400 font-mono">Account ID: 612662553568</div>
                  <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>WS Feed: {wsStatus}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    setShowKeyModal(true);
                  }}
                  className="w-full text-left py-1 text-slate-300 hover:text-white"
                >
                  Configure Gateway Key
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. Sub-Header Bar (Amplify Badge + Breadcrumb / Drawer Toggle) */}
      <div className="h-9 bg-[#101622] border-b border-[#1f293d] px-3 flex items-center justify-between text-xs select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
            title="Toggle Sidebar Navigation"
          >
            <Menu size={14} />
          </button>

          {/* Service Badge & Breadcrumbs */}
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-rose-600 flex items-center justify-center text-white text-[9px] font-bold">
              <Zap size={10} />
            </div>
            <button
              onClick={() => {
                setSelectedTaskId(null);
                setActiveTab('home');
              }}
              className="font-bold text-white hover:text-slate-200 transition-colors"
            >
              AWS Amplify
            </button>
            <span className="text-slate-600">/</span>
            <span className="text-slate-300 capitalize">
              {selectedTaskId ? `Task ${selectedTaskId.slice(0, 8)}...` : activeTab === 'home' ? 'Console Home' : activeTab}
            </span>
          </div>
        </div>

        {/* Quick Nav Tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setSelectedTaskId(null);
              setActiveTab('home');
            }}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              activeTab === 'home' && !selectedTaskId ? 'bg-[#1e2738] text-white' : 'text-slate-400 hover:text-white'
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
              activeTab === 'tasks' && !selectedTaskId ? 'bg-[#1e2738] text-white' : 'text-slate-400 hover:text-white'
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
              activeTab === 'agents' ? 'bg-[#1e2738] text-white' : 'text-slate-400 hover:text-white'
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
              activeTab === 'gateway' ? 'bg-[#1e2738] text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Gateway
          </button>
        </div>
      </div>

      {/* 3. Collapsible Navigation Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div className="w-64 bg-[#141b27] border-r border-[#222e42] p-4 flex flex-col justify-between shadow-2xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="font-bold text-sm text-white">AWS & A2A Services</span>
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
                    activeTab === 'home' && !selectedTaskId ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
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
                    activeTab === 'tasks' && !selectedTaskId ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Activity size={14} />
                  <span>Tasks (CloudWatch Triage)</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('agents');
                    setSelectedTaskId(null);
                    setSidebarOpen(false);
                  }}
                  className={`w-full px-3 py-2 rounded text-left font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'agents' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Boxes size={14} />
                  <span>Registered Agents (ECR)</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('gateway');
                    setSelectedTaskId(null);
                    setSidebarOpen(false);
                  }}
                  className={`w-full px-3 py-2 rounded text-left font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'gateway' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Zap size={14} />
                  <span>Amplify Routes & IAM Keys</span>
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500">
              A2A Gateway v0.1 • AWS Inspired Edition
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
          <div className="bg-[#121824] border border-[#2b3a50] rounded-lg max-w-2xl w-full p-4 space-y-3 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-bold">
                <Terminal size={14} className="text-blue-400" />
                <span>AWS CloudShell — A2A Gateway CLI</span>
              </div>
              <button onClick={() => setShowCliModal(false)} className="text-slate-400 hover:text-white">
                <X size={14} />
              </button>
            </div>
            <div className="bg-[#0b0f17] p-3 rounded border border-slate-800/80 text-slate-300 space-y-2 leading-relaxed">
              <p className="text-slate-400"># 1. Health check</p>
              <p className="text-emerald-400 font-bold">$ curl http://localhost:8000/healthz</p>
              <p className="text-slate-400"># 2. Trigger the 3am Test (flaky:die mid-stream drop)</p>
              <p className="text-amber-400 font-bold">
                $ curl -X POST http://localhost:8000/gw/flaky/ \<br />
                &nbsp;&nbsp;-H "Authorization: Bearer dev-only-do-not-use-in-prod" \<br />
                &nbsp;&nbsp;-d '&#123;"jsonrpc":"2.0","method":"message/stream","params":&#123;"message":&#123;"parts":[&#123;"kind":"text","text":"directive flaky:die"&#125;]&#125;&#125;&#125;'
              </p>
              <p className="text-slate-400"># 3. Stream research report</p>
              <p className="text-blue-400 font-bold">
                $ curl -N -X POST http://localhost:8000/gw/research/ \<br />
                &nbsp;&nbsp;-H "Authorization: Bearer dev-only-do-not-use-in-prod" \<br />
                &nbsp;&nbsp;-d '&#123;"jsonrpc":"2.0","method":"message/stream","params":&#123;"message":&#123;"parts":[&#123;"kind":"text","text":"analyze telemetry"&#125;]&#125;&#125;&#125;'
              </p>
            </div>
            <div className="flex justify-end pt-1">
              <button
                onClick={() => setShowCliModal(false)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium"
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
          <div className="bg-[#141b27] border border-[#2b3a50] rounded-lg max-w-sm w-full p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white">Gateway API Key (IAM)</h3>
            <p className="text-xs text-slate-400">
              Control plane endpoints require a valid gateway key. Paste your bootstrap admin key or issued key below:
            </p>

            <form onSubmit={handleSaveKey} className="space-y-3">
              <input
                type="password"
                placeholder="dev-only-do-not-use-in-prod"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3 py-2 bg-[#0d121b] border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
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
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium"
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
