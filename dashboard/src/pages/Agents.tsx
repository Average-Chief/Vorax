import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, ChevronRight, ChevronDown, Check, Globe, Shield, Route as RouteIcon } from 'lucide-react';
import { AgentListItem, GatewayRoute } from '../lib/types';
import { fetchAgents, registerAgent, fetchRoutes, createRoute } from '../lib/api';
import { JsonViewer } from '../components/JsonViewer';

export function AgentsPage() {
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [routes, setRoutes] = useState<GatewayRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [name, setName] = useState('');
  const [endpointUrl, setEndpointUrl] = useState('');
  const [credential, setCredential] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  // Route assignment state
  const [routeSegments, setRouteSegments] = useState<Record<string, string>>({});
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setError(null);
      const [agentList, routeList] = await Promise.all([fetchAgents(), fetchRoutes()]);
      setAgents(agentList);
      setRoutes(routeList);
    } catch (err: any) {
      setError(err.message || 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !endpointUrl) return;

    try {
      setSubmitting(true);
      setDialogError(null);
      await registerAgent({
        name: name.trim(),
        endpoint_url: endpointUrl.trim(),
        upstream_credential: credential.trim() || undefined,
      });
      setShowRegisterDialog(false);
      setName('');
      setEndpointUrl('');
      setCredential('');
      await loadData();
    } catch (err: any) {
      setDialogError(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignRoute = async (agentId: string) => {
    const segment = (routeSegments[agentId] || '').trim().replace(/^\/+|\/+$/g, '');
    if (!segment) return;

    try {
      await createRoute({ path_segment: segment, agent_id: agentId });
      setRouteSegments((prev) => ({ ...prev, [agentId]: '' }));
      await loadData();
    } catch (err: any) {
      alert(`Failed to create route: ${err.message}`);
    }
  };

  const getAgentRoutes = (agentId: string) => {
    return routes.filter((r) => r.agent_id === agentId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Agents</h1>
          <p className="text-xs text-muted">Registered upstream A2A agents and route bindings</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={loadData}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 transition-colors"
          >
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowRegisterDialog(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow transition-colors"
          >
            <Plus size={14} />
            <span>Register Agent</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-950/30 border border-red-500/40 text-red-300 rounded text-xs">
          {error}
        </div>
      )}

      {loading && agents.length === 0 ? (
        <div className="py-16 text-center text-slate-500 text-sm">Loading agents...</div>
      ) : agents.length === 0 ? (
        <div className="border border-slate-800 rounded-lg p-10 bg-card text-center space-y-3">
          <Globe size={32} className="mx-auto text-slate-600" />
          <h3 className="text-base font-medium text-slate-300">No agents registered yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Connect an upstream A2A agent by pasting its endpoint URL. The gateway fetches its agent card automatically.
          </p>
          <button
            onClick={() => setShowRegisterDialog(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition-colors"
          >
            Register Your First Agent
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {agents.map((agent) => {
            const isExpanded = expandedAgentId === agent.id;
            const agentRoutes = getAgentRoutes(agent.id);
            const isHealthy = agent.health === 'healthy';

            return (
              <div
                key={agent.id}
                className="border border-slate-800 rounded-lg bg-card overflow-hidden transition-colors"
              >
                <div
                  onClick={() => setExpandedAgentId(isExpanded ? null : agent.id)}
                  className="p-4 flex items-center justify-between cursor-pointer select-none hover:bg-slate-800/30"
                >
                  <div className="flex items-center space-x-3">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${isHealthy ? 'bg-emerald-400 ring-2 ring-emerald-400/20' : 'bg-slate-600'}`}
                      title={isHealthy ? 'Healthy (active traffic)' : 'Offline / Inactive'}
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-sm text-slate-200">{agent.name}</span>
                        {agent.card_summary.version && (
                          <span className="text-[11px] text-slate-500 font-mono">v{agent.card_summary.version}</span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 font-mono">{agent.endpoint_url}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1.5">
                      {agentRoutes.map((r) => (
                        <span
                          key={r.id}
                          className="px-2 py-0.5 rounded text-[11px] font-mono bg-blue-950/40 border border-blue-500/30 text-blue-300"
                        >
                          /gw/{r.path_segment}
                        </span>
                      ))}
                    </div>
                    {isExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 border-t border-slate-800/80 bg-slate-900/30 space-y-4 text-xs">
                    {/* Route assignment */}
                    <div className="p-3 bg-black/40 rounded-md border border-slate-800 space-y-2">
                      <div className="flex items-center space-x-1.5 text-slate-300 font-semibold">
                        <RouteIcon size={14} className="text-blue-400" />
                        <span>Assign Gateway Route</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-slate-400 font-mono text-xs">/gw/</span>
                        <input
                          type="text"
                          placeholder="e.g. research"
                          value={routeSegments[agent.id] || ''}
                          onChange={(e) => setRouteSegments({ ...routeSegments, [agent.id]: e.target.value })}
                          className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                        />
                        <button
                          onClick={() => handleAssignRoute(agent.id)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition-colors"
                        >
                          Bind Route
                        </button>
                      </div>
                    </div>

                    {/* Agent Card Details */}
                    <div>
                      <span className="text-slate-400 font-medium block mb-1">Agent Card JSON:</span>
                      <JsonViewer data={agent.card_summary} initialExpanded={true} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Registration Dialog */}
      {showRegisterDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-card border border-slate-800 rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-white">Register Upstream Agent</h3>
            <p className="text-xs text-slate-400">
              Provide your agent's direct A2A endpoint. The gateway will fetch its card and register it.
            </p>

            {dialogError && (
              <div className="p-2.5 bg-red-950/40 border border-red-500/30 text-red-300 rounded text-xs">
                {dialogError}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Agent Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. echo-agent"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Endpoint URL</label>
                <input
                  type="url"
                  required
                  placeholder="http://localhost:8102"
                  value={endpointUrl}
                  onChange={(e) => setEndpointUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Upstream Credential (Optional)
                </label>
                <input
                  type="password"
                  placeholder="Bearer your-agent-secret"
                  value={credential}
                  onChange={(e) => setCredential(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  The gateway attaches this static credential when proxying calls upstream.
                </span>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowRegisterDialog(false)}
                  className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Registering...' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

