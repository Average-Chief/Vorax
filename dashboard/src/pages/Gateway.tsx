import React, { useState, useEffect } from 'react';
import { Route, Key, Activity, Copy, Check, Trash2, Plus, AlertCircle } from 'lucide-react';
import { GatewayRoute, ApiKeyItem, StatsResponse } from '../lib/types';
import { fetchRoutes, fetchKeys, createKey, deleteKey, fetchStats } from '../lib/api';

export function GatewayPage() {
  const [routes, setRoutes] = useState<GatewayRoute[]>([]);
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Key issuance dialog
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [issuedKey, setIssuedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const loadAll = async () => {
    try {
      const [r, k, s] = await Promise.all([fetchRoutes(), fetchKeys(), fetchStats()]);
      setRoutes(r);
      setKeys(k);
      setStats(s);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    const interval = setInterval(async () => {
      try {
        const s = await fetchStats();
        setStats(s);
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleIssueKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    try {
      const res = await createKey(newKeyName.trim());
      setIssuedKey(res.key);
      setNewKeyName('');
      await loadAll();
    } catch (err: any) {
      alert(`Error issuing key: ${err.message}`);
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This cannot be undone.')) return;
    try {
      await deleteKey(id);
      await loadAll();
    } catch (err: any) {
      alert(`Error revoking key: ${err.message}`);
    }
  };

  const handleCopyKey = () => {
    if (issuedKey) {
      navigator.clipboard.writeText(issuedKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Gateway Settings</h1>
        <p className="text-xs text-muted">Active routes, API key issuance, and live traffic stats</p>
      </div>

      {/* 1. Stats Strip */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-card border border-slate-800 space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center space-x-1.5">
              <Activity size={13} className="text-blue-400" />
              <span>Throughput</span>
            </span>
            <div className="text-2xl font-bold text-white font-mono">{stats.events_per_sec} <span className="text-xs font-normal text-slate-400">ev/s</span></div>
            <p className="text-[11px] text-slate-500">Total events: {stats.total_events}</p>
          </div>

          <div className="p-4 rounded-lg bg-card border border-slate-800 space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Active Tasks</span>
            <div className="text-2xl font-bold text-blue-400 font-mono">
              {(stats.tasks_by_state['working'] || 0) + (stats.tasks_by_state['submitted'] || 0)}
            </div>
            <p className="text-[11px] text-slate-500">
              Completed: {stats.tasks_by_state['completed'] || 0}
            </p>
          </div>

          <div className="p-4 rounded-lg bg-card border border-slate-800 space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Failed Tasks</span>
            <div className="text-2xl font-bold text-red-400 font-mono">
              {(stats.tasks_by_state['failed'] || 0) + (stats.tasks_by_state['rejected'] || 0)}
            </div>
            <p className="text-[11px] text-slate-500">Needs attention</p>
          </div>

          <div className="p-4 rounded-lg bg-card border border-slate-800 space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Dropped Events</span>
            <div className={`text-2xl font-bold font-mono ${stats.dropped_events > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
              {stats.dropped_events}
            </div>
            {stats.dropped_events > 0 ? (
              <p
                className="text-[11px] text-amber-400/80 flex items-center space-x-1"
                title="Some events were observed on the wire but not persisted; see logs"
              >
                <AlertCircle size={11} />
                <span>Queue overflow</span>
              </p>
            ) : (
              <p className="text-[11px] text-slate-500">0 dropped (healthy)</p>
            )}
          </div>
        </div>
      )}

      {/* 2. Routes Table */}
      <div className="border border-slate-800 rounded-lg bg-card overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-200 font-semibold text-sm">
            <Route size={16} className="text-blue-400" />
            <span>Gateway Routes</span>
          </div>
          <span className="text-xs text-slate-400">{routes.length} configured</span>
        </div>

        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] text-slate-400 font-medium bg-slate-900/40">
              <th className="py-2.5 px-4">Route Path</th>
              <th className="py-2.5 px-4">Target Agent</th>
              <th className="py-2.5 px-4">Status</th>
              <th className="py-2.5 px-4">Created</th>
            </tr>
          </thead>
          <tbody>
            {routes.map((r) => (
              <tr key={r.id} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                <td className="py-2.5 px-4 font-mono font-medium text-blue-300">/gw/{r.path_segment}</td>
                <td className="py-2.5 px-4 text-slate-300 font-medium">{r.agent_name || 'Agent'}</td>
                <td className="py-2.5 px-4">
                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] ${r.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                    {r.is_active ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className="py-2.5 px-4 text-slate-500">{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 3. API Keys Management */}
      <div className="border border-slate-800 rounded-lg bg-card overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-200 font-semibold text-sm">
            <Key size={16} className="text-amber-400" />
            <span>API Keys</span>
          </div>
          <button
            onClick={() => setShowIssueModal(true)}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
          >
            <Plus size={13} />
            <span>Issue New Key</span>
          </button>
        </div>

        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] text-slate-400 font-medium bg-slate-900/40">
              <th className="py-2.5 px-4">Key Name</th>
              <th className="py-2.5 px-4">Prefix</th>
              <th className="py-2.5 px-4">Created</th>
              <th className="py-2.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                <td className="py-2.5 px-4 font-medium text-slate-200">{k.name}</td>
                <td className="py-2.5 px-4 font-mono text-slate-400">{k.key_prefix}...</td>
                <td className="py-2.5 px-4 text-slate-500">{new Date(k.created_at).toLocaleDateString()}</td>
                <td className="py-2.5 px-4 text-right">
                  <button
                    onClick={() => handleRevokeKey(k.id)}
                    className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                    title="Revoke Key"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Issue Key Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-card border border-slate-800 rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-white">Issue Gateway API Key</h3>

            {!issuedKey ? (
              <form onSubmit={handleIssueKey} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Key Description / Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. production-client"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowIssueModal(false)}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium"
                  >
                    Generate Key
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-amber-950/30 border border-amber-500/40 rounded text-xs text-amber-300">
                  ⚠️ Copy this key now! For security reasons, it will never be displayed again.
                </div>

                <div className="flex items-center space-x-2 bg-slate-950 p-2.5 rounded border border-slate-800">
                  <span className="font-mono text-xs text-emerald-400 select-all break-all flex-1">{issuedKey}</span>
                  <button
                    onClick={handleCopyKey}
                    className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded"
                    title="Copy Key"
                  >
                    {copiedKey ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setIssuedKey(null);
                      setShowIssueModal(false);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium"
                  >
                    I've saved it
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

