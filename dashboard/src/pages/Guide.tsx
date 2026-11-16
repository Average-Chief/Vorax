import React, { useState } from 'react';
import {
  BookOpen,
  Activity,
  Terminal,
  Shield,
  Layers,
  ArrowUpRight,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Clock,
  Key,
  ExternalLink,
} from 'lucide-react';

interface GuidePageProps {
  onNavigate: (tab: 'home' | 'tasks' | 'agents' | 'gateway') => void;
  onOpenCli: () => void;
}

export function GuidePage({ onNavigate, onOpenCli }: GuidePageProps) {
  const [activeSection, setActiveSection] = useState<'all' | 'overview' | 'timeline' | 'routing' | 'code'>('all');
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const navItems = [
    { id: 'all', label: 'All Sections' },
    { id: 'overview', label: '1. Overview & Triage' },
    { id: 'timeline', label: '2. Forensic Timeline' },
    { id: 'routing', label: '3. Agents & Routing' },
    { id: 'code', label: '4. Caller Integration' },
  ];

  return (
    <div className="space-y-6 text-slate-200 font-sans pb-16 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-[#080808] border border-neutral-800 p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <BookOpen className="text-blue-400" size={17} />
              <h1 className="text-sm font-bold text-white tracking-tight">
                A2A Gateway Operator Guide
              </h1>
              <span className="text-[10px] bg-neutral-900 border border-neutral-800 text-slate-400 px-1.5 py-0.5 font-mono">
                v0.1.0
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
              Minimal guide to managing agent streams, reading forensic failure timelines, and routing traffic.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenCli}
              className="px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs border border-neutral-700 transition-colors flex items-center gap-1.5 font-medium cursor-pointer"
            >
              <Terminal size={12} className="text-indigo-400" />
              <span>Gateway Shell</span>
            </button>
            <button
              onClick={() => onNavigate('home')}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold transition-colors cursor-pointer"
            >
              Back to Console
            </button>
          </div>
        </div>

        {/* Section Pills */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-neutral-800/80 overflow-x-auto text-xs">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as any)}
              className={`px-2.5 py-1 transition-colors whitespace-nowrap cursor-pointer text-[11px] font-medium border ${
                activeSection === item.id
                  ? 'bg-neutral-900 text-white border-neutral-700'
                  : 'text-slate-400 hover:text-white border-transparent'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. Core Architecture & Triage */}
      {(activeSection === 'all' || activeSection === 'overview') && (
        <section className="bg-[#080808] border border-neutral-800 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Layers className="text-indigo-400" size={15} />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                1. Architecture & Triage Queue
              </h2>
            </div>
            <button
              onClick={() => onNavigate('tasks')}
              className="text-xs text-blue-400 hover:text-orange-400 flex items-center gap-1 cursor-pointer"
            >
              <span>View Tasks Queue</span>
              <ArrowUpRight size={11} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-neutral-950 border border-neutral-800/80 space-y-1">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-400" />
                <span>Zero-Copy Stream Tap</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Inbound SSE streams pass straight to the caller without buffer latency while tapping events asynchronously into PostgreSQL.
              </p>
            </div>
            <div className="p-3 bg-neutral-950 border border-neutral-800/80 space-y-1">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <Activity size={13} className="text-rose-400" />
                <span>Urgency Triage Sorting</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Tasks needing attention (failed, rejected) always sit at the top of the queue for immediate 3 AM incident discovery.
              </p>
            </div>
            <div className="p-3 bg-neutral-950 border border-neutral-800/80 space-y-1">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <Shield size={13} className="text-blue-400" />
                <span>Encrypted Upstream Vault</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Upstream tokens are encrypted at rest with Fernet. Callers use one unified gateway key; upstream secrets remain hidden.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 2. Forensic Timeline (Single Required Screenshot) */}
      {(activeSection === 'all' || activeSection === 'timeline') && (
        <section className="bg-[#080808] border border-neutral-800 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Clock className="text-amber-400" size={15} />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                2. Forensic Timeline & Crash Diagnostics
              </h2>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Stream Diagnostic View</span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            When an upstream agent crashes mid-stream or resets a socket, traditional proxies emit an unhelpful <code>502 Bad Gateway</code>.
            A2A Gateway preserves every event before the crash and appends a synthetic <code>gateway.note</code> detailing the failure:
          </p>

          {/* Screenshot: Forensic Timeline */}
          <div className="border border-neutral-800 bg-black overflow-hidden shadow-2xl relative">
            <img
              src="/docs/timeline.png"
              alt="A2A Forensic Task Timeline"
              className="w-full h-auto max-h-[420px] object-cover mx-auto"
              loading="lazy"
            />
            <div className="p-2.5 bg-neutral-950 border-t border-neutral-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Chronological event log with state transitions, partial artifacts, and formatted raw payloads.</span>
              <span className="font-mono text-emerald-400">Append-Only Store</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
            <div className="p-2.5 bg-neutral-950 border border-neutral-800 space-y-1">
              <span className="font-semibold text-white">Event Sequence</span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Click any row in the timeline to inspect raw JSON-RPC frame payloads, timestamps, sequence numbers, and token counts.
              </p>
            </div>
            <div className="p-2.5 bg-neutral-950 border border-neutral-800 space-y-1">
              <span className="font-semibold text-white">Timeline Incomplete Badge</span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                If the gateway is killed with <code>SIGKILL</code> or experiences backpressure tail-drops, the affected task is explicitly flagged.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 3. Agents & Gateway Routing */}
      {(activeSection === 'all' || activeSection === 'routing') && (
        <section className="bg-[#080808] border border-neutral-800 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Radio className="text-emerald-400" size={15} />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                3. Agents Fleet & Route Provisioning
              </h2>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <button
                onClick={() => onNavigate('agents')}
                className="text-blue-400 hover:text-orange-400 flex items-center gap-1 cursor-pointer"
              >
                <span>Agents</span>
                <ArrowUpRight size={11} />
              </button>
              <button
                onClick={() => onNavigate('gateway')}
                className="text-blue-400 hover:text-orange-400 flex items-center gap-1 cursor-pointer"
              >
                <span>Routes</span>
                <ArrowUpRight size={11} />
              </button>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="p-3 bg-neutral-950 border border-neutral-800 space-y-1">
                <span className="font-bold text-white font-mono text-[11px]">Step 1: Register Agent</span>
                <p className="text-[11px] text-slate-400">
                  Register upstream microservice base URLs with bearer or basic auth tokens at <code>/agents</code>.
                </p>
              </div>
              <div className="p-3 bg-neutral-950 border border-neutral-800 space-y-1">
                <span className="font-bold text-white font-mono text-[11px]">Step 2: Bind Route</span>
                <p className="text-[11px] text-slate-400">
                  Map a public path prefix (e.g. <code>/gw/researcher/</code>) to your registered agent with an optional RPM limit.
                </p>
              </div>
              <div className="p-3 bg-neutral-950 border border-neutral-800 space-y-1">
                <span className="font-bold text-white font-mono text-[11px]">Step 3: Call & Stream</span>
                <p className="text-[11px] text-slate-400">
                  Point clients to the gateway endpoint. The gateway injects upstream credentials automatically.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4. Code Integration */}
      {(activeSection === 'all' || activeSection === 'code') && (
        <section className="bg-[#080808] border border-neutral-800 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Terminal className="text-blue-400" size={15} />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                4. Caller Integration (cURL & Python)
              </h2>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">No Custom SDK Required</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* cURL */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">cURL (Streaming SSE Task)</span>
                <button
                  onClick={() =>
                    copyCode(
                      `curl -N -X POST http://localhost:8000/gw/my-agent/ \\
  -H "Authorization: Bearer dev-only-do-not-use-in-prod" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc": "2.0", "id": 1, "method": "message/stream", "params": {"message": {"role": "user", "parts": [{"kind": "text", "text": "start task"}]}}}'`,
                      'curl'
                    )
                  }
                  className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
                >
                  {copiedSnippet === 'curl' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                  <span>{copiedSnippet === 'curl' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-3 bg-neutral-950 border border-neutral-800 font-mono text-[10.5px] text-slate-300 overflow-x-auto leading-relaxed">
{`curl -N -X POST http://localhost:8000/gw/my-agent/ \\
  -H "Authorization: Bearer dev-only-do-not-use-in-prod" \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "message/stream",
    "params": {
      "message": {
        "role": "user",
        "parts": [{"kind": "text", "text": "start task"}]
      }
    }
  }'`}
              </pre>
            </div>

            {/* Python */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">Python (httpx / a2a-sdk)</span>
                <button
                  onClick={() =>
                    copyCode(
                      `import httpx

headers = {"Authorization": "Bearer dev-only-do-not-use-in-prod"}
payload = {
    "jsonrpc": "2.0", "id": 1, "method": "message/stream",
    "params": {"message": {"role": "user", "parts": [{"kind": "text", "text": "hello"}]}}
}

with httpx.stream("POST", "http://localhost:8000/gw/my-agent/", json=payload, headers=headers) as resp:
    for line in resp.iter_lines():
        if line.startswith("data:"):
            print("Stream Event:", line[5:].strip())`,
                      'py'
                    )
                  }
                  className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
                >
                  {copiedSnippet === 'py' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                  <span>{copiedSnippet === 'py' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-3 bg-neutral-950 border border-neutral-800 font-mono text-[10.5px] text-slate-300 overflow-x-auto leading-relaxed">
{`import httpx

headers = {"Authorization": "Bearer dev-only-do-not-use-in-prod"}
payload = {
    "jsonrpc": "2.0", "id": 1, "method": "message/stream",
    "params": {"message": {"role": "user", "parts": [{"kind": "text", "text": "hello"}]}}
}

with httpx.stream("POST", "http://localhost:8000/gw/my-agent/", json=payload, headers=headers) as resp:
    for line in resp.iter_lines():
        if line.startswith("data:"):
            print("Stream Event:", line[5:].strip())`}
              </pre>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
