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
  FileText,
  Radio,
  Clock,
  Key,
} from 'lucide-react';

interface GuidePageProps {
  onNavigate: (tab: 'home' | 'tasks' | 'agents' | 'gateway') => void;
  onOpenCli: () => void;
}

export function GuidePage({ onNavigate, onOpenCli }: GuidePageProps) {
  const [activeSection, setActiveSection] = useState<'all' | 'home' | 'tasks' | 'timeline' | 'agents' | 'gateway' | 'api'>('all');
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const sections = [
    { id: 'all', label: 'Full Guide' },
    { id: 'home', label: '1. Console Home' },
    { id: 'tasks', label: '2. Tasks & Triage' },
    { id: 'timeline', label: '3. Forensic Timeline' },
    { id: 'agents', label: '4. Agents Fleet' },
    { id: 'gateway', label: '5. Gateway Routes' },
    { id: 'api', label: '6. Calling via Code' },
  ];

  return (
    <div className="space-y-8 text-slate-200 font-sans pb-16">
      {/* Guide Header */}
      <div className="bg-[#080808] border border-neutral-800 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <BookOpen className="text-blue-400" size={18} />
              <h1 className="text-base font-bold text-white tracking-tight">
                A2A Gateway Console Guide
              </h1>
              <span className="text-[10px] bg-neutral-900 border border-neutral-800 text-slate-400 px-1.5 py-0.5 font-mono">
                Operator Handbook
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
              Complete reference for monitoring upstream multi-step agent streams, diagnosing 3 AM connection drops,
              registering agent endpoints, and routing traffic without proprietary client SDKs.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenCli}
              className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs border border-neutral-700 transition-colors flex items-center gap-1.5 font-medium cursor-pointer"
            >
              <Terminal size={12} className="text-indigo-400" />
              <span>Open Gateway Shell</span>
            </button>
            <button
              onClick={() => onNavigate('home')}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold transition-colors cursor-pointer"
            >
              Back to Console
            </button>
          </div>
        </div>

        {/* Section Navigation Pills */}
        <div className="flex items-center gap-2 pt-2 border-t border-neutral-800/80 overflow-x-auto text-xs">
          {sections.map((sec) => (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id as any)}
              className={`px-2.5 py-1 transition-colors whitespace-nowrap cursor-pointer text-[11px] font-medium border ${
                activeSection === sec.id
                  ? 'bg-neutral-900 text-white border-neutral-700'
                  : 'text-slate-400 hover:text-white border-transparent'
              }`}
            >
              {sec.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hero Overview */}
      {(activeSection === 'all' || activeSection === 'home') && (
        <section className="space-y-4">
          <div className="border border-neutral-800 bg-[#080808] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="space-y-0.5">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-sm" />
                  <span>Interactive Overview & Walkthrough</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Real-time SSE event tapping, incremental persistence, and live dashboard triage.
                </p>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Walkthrough</span>
            </div>

            {/* Hero GIF Screenshot */}
            <div className="border border-neutral-800 overflow-hidden bg-black shadow-2xl relative group">
              <img
                src="/docs/hero.gif"
                alt="A2A Gateway Console Walkthrough"
                className="w-full h-auto max-h-[480px] object-cover mx-auto"
                loading="lazy"
              />
              <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 text-[10px] text-slate-400 font-mono border border-neutral-800 backdrop-blur-sm">
                Live Console Walkthrough
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="p-3 bg-neutral-950 border border-neutral-800/80 space-y-1">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  <span>Zero-Copy SSE Tap</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  HTTP streaming chunks pass through without memory buffering while writing events asynchronously to PostgreSQL.
                </p>
              </div>
              <div className="p-3 bg-neutral-950 border border-neutral-800/80 space-y-1">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <AlertTriangle size={13} className="text-rose-400" />
                  <span>Synthetic Crash Provenance</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  When an agent drops or the container restarts, a synthetic forensic note details exactly where and why the stream stopped.
                </p>
              </div>
              <div className="p-3 bg-neutral-950 border border-neutral-800/80 space-y-1">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <Shield size={13} className="text-indigo-400" />
                  <span>Encrypted Upstream Vault</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Upstream agent keys are encrypted at rest with Fernet and attached to outbound requests automatically.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Section 1: Console Home */}
      {(activeSection === 'all' || activeSection === 'home') && (
        <section className="space-y-4">
          <div className="border border-neutral-800 bg-[#080808] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="text-indigo-400" size={16} />
                  <span>1. Console Home (Command Center)</span>
                </h2>
                <p className="text-xs text-slate-400">
                  High-level observability overview across fleet agents, operational health, and live streams.
                </p>
              </div>
              <button
                onClick={() => onNavigate('home')}
                className="text-xs text-blue-400 hover:text-orange-400 flex items-center gap-1 group cursor-pointer"
              >
                <span>Go to Console</span>
                <ArrowUpRight size={11} />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              <p>
                The <strong>Console Home</strong> organizes gateway operations into five real-time telemetry widgets:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-neutral-950 border border-neutral-800 space-y-1">
                  <div className="font-bold text-white">Gateway Quickstart</div>
                  <p className="text-[11px] text-slate-400">
                    Quick-action cards to provision new routes, configure API keys, and test endpoints via the CloudShell CLI modal.
                  </p>
                </div>
                <div className="p-3 bg-neutral-950 border border-neutral-800 space-y-1">
                  <div className="font-bold text-white">Registered Agents Fleet</div>
                  <p className="text-[11px] text-slate-400">
                    Displays all upstream agent microservices registered in the gateway with their health status and base URLs.
                  </p>
                </div>
                <div className="p-3 bg-neutral-950 border border-neutral-800 space-y-1">
                  <div className="font-bold text-white">Gateway Health & Triage</div>
                  <p className="text-[11px] text-slate-400">
                    Segmented task counters showing tasks needing immediate attention (failed, rejected), in-flight streams, and completed tasks.
                  </p>
                </div>
                <div className="p-3 bg-neutral-950 border border-neutral-800 space-y-1">
                  <div className="font-bold text-white">Traffic & Telemetry</div>
                  <p className="text-[11px] text-slate-400">
                    Live cumulative task throughput, gateway process uptime, and visual percentage distribution of task outcomes.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-neutral-950 border border-neutral-800 space-y-1.5 mt-2">
                <div className="font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Live Agent Tasks Stream</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  The stream feed dynamically surfaces <strong>only currently active in-flight streams</strong>. If no tasks are running,
                  it displays a clean idle message. When callers send JSON-RPC tasks, they appear in real time with direct links to inspect the streaming timeline.
                </p>
              </div>

              <div className="p-3 bg-blue-950/20 border border-blue-900/60 text-[11px] text-blue-300 space-y-1">
                <strong>💡 Pro Tip: Widget Info Side Panels</strong>
                <p>
                  Every widget header features an <span className="text-blue-400 underline font-mono">Info</span> button.
                  Clicking it opens an AWS-style slide-over drawer from the right edge with detailed architectural background, concept definitions, and direct shortcuts.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Section 2: Tasks & Triage */}
      {(activeSection === 'all' || activeSection === 'tasks') && (
        <section className="space-y-4">
          <div className="border border-neutral-800 bg-[#080808] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="text-rose-400" size={16} />
                  <span>2. Tasks & Operational Triage Table (`/tasks`)</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Priority-ordered task queue designed for 3 AM incident triage and debugging.
                </p>
              </div>
              <button
                onClick={() => onNavigate('tasks')}
                className="text-xs text-blue-400 hover:text-orange-400 flex items-center gap-1 group cursor-pointer"
              >
                <span>Go to Tasks</span>
                <ArrowUpRight size={11} />
              </button>
            </div>

            {/* Screenshot: Triage Table */}
            <div className="border border-neutral-800 overflow-hidden bg-black shadow-2xl relative">
              <img
                src="/docs/triage.png"
                alt="A2A Tasks Triage Table"
                className="w-full h-auto max-h-[460px] object-cover mx-auto"
                loading="lazy"
              />
              <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 text-[10px] text-slate-400 font-mono border border-neutral-800">
                Tasks Triage View
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <h3 className="font-bold text-white text-xs">How Triage Sorting Works</h3>
              <p>
                Unlike generic API logs that sort purely by timestamp, A2A Gateway orders tasks by <strong>triage urgency</strong>:
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400 pl-1">
                <li><strong className="text-rose-300">Priority 1 (Needs Attention):</strong> Tasks in <code>failed</code>, <code>rejected</code>, or <code>input-required</code> states sit at the very top of the table.</li>
                <li><strong className="text-blue-300">Priority 2 (In Flight):</strong> Tasks currently streaming chunks or waiting for upstream agents sit second.</li>
                <li><strong className="text-emerald-300">Priority 3 (Completed):</strong> Cleanly finished tasks sort beneath active work, ordered newest to oldest.</li>
              </ul>

              <div className="p-3 bg-neutral-950 border border-neutral-800 space-y-1 mt-2">
                <span className="font-semibold text-white">Timeline Incomplete Marker</span>
                <p className="text-[11px] text-slate-400">
                  If the gateway is restarted with <code>SIGKILL</code> or a database backpressure event causes tail drops, the task is flagged with a visible
                  <span className="text-rose-400 font-mono ml-1">Timeline Incomplete</span> badge explaining that subsequent events may have been lost.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Section 3: Forensic Timeline */}
      {(activeSection === 'all' || activeSection === 'timeline') && (
        <section className="space-y-4">
          <div className="border border-neutral-800 bg-[#080808] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="text-amber-400" size={16} />
                  <span>3. Forensic Timeline & Crash Diagnostics (`/tasks/:id`)</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Granular chronological event log preserving every state transition and intermediate artifact.
                </p>
              </div>
              <button
                onClick={() => onNavigate('tasks')}
                className="text-xs text-blue-400 hover:text-orange-400 flex items-center gap-1 group cursor-pointer"
              >
                <span>Select a Task</span>
                <ArrowUpRight size={11} />
              </button>
            </div>

            {/* Screenshot: Timeline */}
            <div className="border border-neutral-800 overflow-hidden bg-black shadow-2xl relative">
              <img
                src="/docs/timeline.png"
                alt="A2A Forensic Task Timeline"
                className="w-full h-auto max-h-[460px] object-cover mx-auto"
                loading="lazy"
              />
              <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 text-[10px] text-slate-400 font-mono border border-neutral-800">
                Forensic Timeline View
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <h3 className="font-bold text-white text-xs">Diagnosing What Happened Before an Agent Failed</h3>
              <p>
                Standard reverse proxies return an opaque <code>502 Bad Gateway</code> when an agent crashes.
                A2A Gateway reconstructs the entire sequence leading up to the failure:
              </p>
              <div className="space-y-2">
                <div className="p-2.5 bg-neutral-950 border border-neutral-800 font-mono text-[11px] space-y-1">
                  <div className="text-emerald-400">1. TASK SUBMITTED &bull; Client dispatched JSON-RPC payload</div>
                  <div className="text-blue-400">2. STATUS: WORKING &bull; Upstream agent accepted execution</div>
                  <div className="text-indigo-400">3. ARTIFACT RECEIVED &bull; Partial report / data captured and persisted</div>
                  <div className="text-rose-400">4. UPSTREAM CONNECTION RESET &bull; Remote agent process crashed</div>
                  <div className="text-amber-300">5. GATEWAY NOTE &bull; Synthetic forensic record detailing socket interruption</div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                Clicking on any event in the timeline reveals the exact JSON-RPC payload frames, timestamps, sequence numbers, and raw payloads with full formatting and quick-copy buttons.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Section 4: Agents Fleet */}
      {(activeSection === 'all' || activeSection === 'agents') && (
        <section className="space-y-4">
          <div className="border border-neutral-800 bg-[#080808] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Radio className="text-emerald-400" size={16} />
                  <span>4. Registering Agents Fleet (`/agents`)</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Manage upstream agent targets, base URLs, and encrypted authentication tokens.
                </p>
              </div>
              <button
                onClick={() => onNavigate('agents')}
                className="text-xs text-blue-400 hover:text-orange-400 flex items-center gap-1 group cursor-pointer"
              >
                <span>Manage Agents</span>
                <ArrowUpRight size={11} />
              </button>
            </div>

            {/* Screenshot: Agents */}
            <div className="border border-neutral-800 overflow-hidden bg-black shadow-2xl relative">
              <img
                src="/docs/agents.png"
                alt="A2A Agent Fleet Management"
                className="w-full h-auto max-h-[460px] object-cover mx-auto"
                loading="lazy"
              />
              <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 text-[10px] text-slate-400 font-mono border border-neutral-800">
                Agents Management View
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <h3 className="font-bold text-white text-xs">How to Add a New Upstream Agent</h3>
              <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-400 pl-1">
                <li>Navigate to the <strong>Agents</strong> tab and click <strong>Register Agent</strong>.</li>
                <li>Enter a human-readable <strong>Agent Name</strong> (e.g. <code>Researcher-V2</code>).</li>
                <li>Provide the <strong>Base URL</strong> (e.g. <code>http://host.docker.internal:8102</code> or a public HTTPS URL).</li>
                <li>Select the <strong>Auth Type</strong> (None, Bearer Token, or Basic Auth) and provide the upstream secret.</li>
              </ol>

              <div className="p-3 bg-neutral-950 border border-neutral-800 space-y-1 mt-2">
                <span className="font-semibold text-white">Encryption at Rest</span>
                <p className="text-[11px] text-slate-400">
                  All upstream tokens are encrypted using AES-CBC / Fernet derived from <code>CREDENTIAL_ENCRYPTION_KEY</code> before storage in PostgreSQL.
                  Even with a raw database dump, credentials cannot be decrypted without the host key.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Section 5: Gateway Routes */}
      {(activeSection === 'all' || activeSection === 'gateway') && (
        <section className="space-y-4">
          <div className="border border-neutral-800 bg-[#080808] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Key className="text-purple-400" size={16} />
                  <span>5. Gateway Routes & API Keys (`/gateway`)</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Bind public path prefixes to registered agents, configure rate limits, and issue caller keys.
                </p>
              </div>
              <button
                onClick={() => onNavigate('gateway')}
                className="text-xs text-blue-400 hover:text-orange-400 flex items-center gap-1 group cursor-pointer"
              >
                <span>Manage Gateway</span>
                <ArrowUpRight size={11} />
              </button>
            </div>

            {/* Screenshot: Gateway */}
            <div className="border border-neutral-800 overflow-hidden bg-black shadow-2xl relative">
              <img
                src="/docs/gateway.png"
                alt="A2A Gateway Routing and Keys"
                className="w-full h-auto max-h-[460px] object-cover mx-auto"
                loading="lazy"
              />
              <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 text-[10px] text-slate-400 font-mono border border-neutral-800">
                Gateway Routes & Security View
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <h3 className="font-bold text-white text-xs">Route Binding Architecture</h3>
              <p>
                When an external caller sends requests to:
                <code className="text-indigo-400 bg-neutral-950 px-1 py-0.5 mx-1 font-mono">POST http://localhost:8000/gw/{'{route}'}/</code>
                the gateway automatically:
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400 pl-1">
                <li>Validates the caller's gateway API key or Bearer token.</li>
                <li>Applies the route's configured Rate Limit (Requests Per Minute).</li>
                <li>Looks up the target upstream agent, attaches its decrypted credentials, and streams the JSON-RPC request through.</li>
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Section 6: Calling via Code */}
      {(activeSection === 'all' || activeSection === 'api') && (
        <section className="space-y-4">
          <div className="border border-neutral-800 bg-[#080808] p-5 space-y-4">
            <div className="border-b border-neutral-800 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Terminal className="text-indigo-400" size={16} />
                <span>6. Calling Agents via Code (cURL, Python, TypeScript)</span>
              </h2>
              <p className="text-xs text-slate-400">
                Because A2A Gateway proxies standard JSON-RPC protocol frames, no custom or proprietary SDK is required.
              </p>
            </div>

            {/* cURL Snippet */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200">cURL (Streaming SSE Task)</span>
                <button
                  onClick={() =>
                    copyCode(
                      `curl -N -X POST http://localhost:8000/gw/my-agent/ \\
  -H "Authorization: Bearer dev-only-do-not-use-in-prod" \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "message/stream",
    "params": {
      "message": {
        "role": "user",
        "parts": [{"kind": "text", "text": "Analyze financial report"}]
      }
    }
  }'`,
                      'curl'
                    )
                  }
                  className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
                >
                  {copiedSnippet === 'curl' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copiedSnippet === 'curl' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-3 bg-neutral-950 border border-neutral-800 font-mono text-[11px] text-slate-300 overflow-x-auto leading-relaxed">
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
        "parts": [{"kind": "text", "text": "Analyze financial report"}]
      }
    }
  }'`}
              </pre>
            </div>

            {/* Python Snippet */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200">Python (httpx or official a2a-sdk)</span>
                <button
                  onClick={() =>
                    copyCode(
                      `import httpx

GATEWAY_URL = "http://localhost:8000/gw/my-agent/"
GATEWAY_KEY = "dev-only-do-not-use-in-prod"

headers = {
    "Authorization": f"Bearer {GATEWAY_KEY}",
    "Content-Type": "application/json",
}
payload = {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "message/stream",
    "params": {
        "message": {"role": "user", "parts": [{"kind": "text", "text": "Start task"}]}
    },
}

with httpx.stream("POST", GATEWAY_URL, json=payload, headers=headers, timeout=60.0) as resp:
    for line in resp.iter_lines():
        if line.startswith("data:"):
            print("Received event:", line[5:].strip())`,
                      'py'
                    )
                  }
                  className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
                >
                  {copiedSnippet === 'py' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copiedSnippet === 'py' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-3 bg-neutral-950 border border-neutral-800 font-mono text-[11px] text-slate-300 overflow-x-auto leading-relaxed">
{`import httpx

GATEWAY_URL = "http://localhost:8000/gw/my-agent/"
GATEWAY_KEY = "dev-only-do-not-use-in-prod"

headers = {
    "Authorization": f"Bearer {GATEWAY_KEY}",
    "Content-Type": "application/json",
}
payload = {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "message/stream",
    "params": {
        "message": {"role": "user", "parts": [{"kind": "text", "text": "Start task"}]}
    },
}

with httpx.stream("POST", GATEWAY_URL, json=payload, headers=headers, timeout=60.0) as resp:
    for line in resp.iter_lines():
        if line.startswith("data:"):
            print("Received event:", line[5:].strip())`}
              </pre>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

