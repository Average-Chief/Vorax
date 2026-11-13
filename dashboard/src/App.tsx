import React, { useState } from 'react';
import { Network, Server, Layers, Settings as SettingsIcon, Key } from 'lucide-react';
import { useWs } from './hooks/useWs';
import { TasksPage } from './pages/Tasks';
import { TimelinePage } from './pages/Timeline';
import { AgentsPage } from './pages/Agents';
import { GatewayPage } from './pages/Gateway';
import { getStoredApiKey, setStoredApiKey } from './lib/api';

type Tab = 'tasks' | 'agents' | 'gateway';

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('tasks');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState(getStoredApiKey());
  const [showKeyModal, setShowKeyModal] = useState(false);
  const { status: wsStatus } = useWs();

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    setStoredApiKey(apiKey);
    setShowKeyModal(false);
    window.location.reload();
  };

  const getWsDot = () => {
    switch (wsStatus) {
      case 'open':
        return <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20" title="Live WS Feed Connected" />;
      case 'reconnecting':
      case 'connecting':
        return <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Connecting WS..." />;
      default:
        return <span className="w-2 h-2 rounded-full bg-red-400" title="Live Feed Disconnected" />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-card/60 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div
              onClick={() => {
                setSelectedTaskId(null);
                setActiveTab('tasks');
              }}
              className="flex items-center space-x-2.5 cursor-pointer group"
            >
              <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center font-bold text-white shadow-sm shadow-blue-500/20 group-hover:bg-blue-500 transition-colors">
                A2A
              </div>
              <span className="font-semibold text-sm tracking-tight text-white">Gateway</span>
            </div>

            <nav className="flex items-center space-x-1">
              <button
                onClick={() => {
                  setSelectedTaskId(null);
                  setActiveTab('tasks');
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-1.5 ${
                  activeTab === 'tasks' && !selectedTaskId
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Layers size={14} />
                <span>Tasks</span>
              </button>

              <button
                onClick={() => {
                  setSelectedTaskId(null);
                  setActiveTab('agents');
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-1.5 ${
                  activeTab === 'agents'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Server size={14} />
                <span>Agents</span>
              </button>

              <button
                onClick={() => {
                  setSelectedTaskId(null);
                  setActiveTab('gateway');
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-1.5 ${
                  activeTab === 'gateway'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Network size={14} />
                <span>Gateway</span>
              </button>
            </nav>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            {/* WS Live status indicator */}
            <div className="flex items-center space-x-2 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">
              {getWsDot()}
              <span className="capitalize text-[11px] font-mono">{wsStatus}</span>
            </div>

            {/* Auth Key Button */}
            <button
              onClick={() => setShowKeyModal(true)}
              className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
              title="Configure API key for control plane access"
            >
              <Key size={13} className={apiKey ? 'text-emerald-400' : 'text-slate-500'} />
              <span>{apiKey ? 'Key Set' : 'Set API Key'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto w-full px-4 py-6 flex-1">
        {selectedTaskId ? (
          <TimelinePage
            taskId={selectedTaskId}
            onBack={() => setSelectedTaskId(null)}
          />
        ) : activeTab === 'tasks' ? (
          <TasksPage onSelectTask={(id) => setSelectedTaskId(id)} />
        ) : activeTab === 'agents' ? (
          <AgentsPage />
        ) : (
          <GatewayPage />
        )}
      </main>

      {/* Set API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-card border border-slate-800 rounded-lg max-w-sm w-full p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white">Gateway API Key</h3>
            <p className="text-xs text-slate-400">
              Control plane endpoints require a valid gateway key. Paste your bootstrap admin key or issued key below:
            </p>

            <form onSubmit={handleSaveKey} className="space-y-3">
              <input
                type="password"
                placeholder="a2a_..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
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
