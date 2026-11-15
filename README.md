# A2A Gateway

*The easiest self-hosted way to put all your A2A agents behind one secure, observable endpoint.*

A2A Gateway is a self-hosted control plane and reverse proxy engineered for Agent-to-Agent (A2A) JSON-RPC protocol communication. Callers send tasks to a single endpoint using one gateway API key, and the gateway proxies requests directly to upstream agents without buffering streaming chunks. Every status transition, streaming SSE event, artifact, and connection failure is recorded and displayed on an integrated live dashboard.

> **The gateway doesn't just tell you that an agent failed. It shows you what happened before it failed.**

```text
14:32:01.102  TASK SUBMITTED
14:32:01.245  AGENT ACCEPTED TASK
14:32:02.010  STATUS: WORKING
14:32:03.418  STATUS: WORKING
14:32:04.201  ARTIFACT RECEIVED
14:32:05.008  UPSTREAM CONNECTION RESET
14:32:05.013  GATEWAY NOTE: Connection lost after 5 events
```
*(Illustrative trace demonstrating partial event retention prior to connection drop)*

<p align="center">
  <img src="docs/assets/hero.gif" alt="A2A Gateway Demo" width="800" />
</p>

---

## Why does this exist?

The A2A protocol provides a standard for interoperable agent communication, but running agents in production surfaces operational challenges. Teams typically deploy multiple specialized agents across internal microservices or external endpoints. Pointing callers directly at individual agent endpoints distributes credentials, fragments route management, and scatters logs across independent processes.

When a multi-step agent task fails midway, diagnosing the root cause is difficult. Inspecting what went wrong usually requires SSH access, manual log grep commands across disparate services, or reconstructing sequences from unstructured text output. If an upstream agent process crashes mid-stream or resets a socket, traditional proxies record only an HTTP 502 Bad Gateway with no record of intermediate steps or partial progress.

A2A Gateway resolves this by placing your agents behind a single managed gateway. Callers authenticate with one gateway key, and the gateway attaches upstream credentials automatically. As streaming chunks pass through, an incremental event tap records every event into an append-only store. If an agent dies mid-stream, the gateway preserves all preceding progress and appends a synthetic forensic note detailing exactly where and why the failure occurred.

---

## The 60-second quickstart

Run the bundled demo fleet to inspect live agent traffic:

```bash
git clone https://github.com/a2a-gateway/a2a-gateway && cd a2a-gateway
docker compose --profile demo up
```

Open http://localhost:8000 in your browser.
Sign in with the default administrator credentials:
- **Username:** `admin`
- **Password:** `admin`

*(On your first login, the console will prompt you to set a custom administrator password).*

*First run after cloning takes 1–3 minutes due to initial Docker image build (compiling Python dependencies and building the React dashboard). Subsequent runs with cached images take ~7 seconds to start and show active tasks.*

The demo profile automatically spins up PostgreSQL, Redis, the gateway API, three demo agents (echo, research, flaky), and a background traffic generator.

To use the gateway with your own upstream agent:

1. **Start the base gateway:**
   ```bash
   docker compose up
   ```
2. **Register your agent:**
   ```bash
   curl -X POST http://localhost:8000/control/agents \
     -H "Authorization: Bearer dev-only-do-not-use-in-prod" \
     -H "Content-Type: application/json" \
     -d '{"name": "my-agent", "endpoint_url": "http://host.docker.internal:8102"}'
   ```
3. **Bind a gateway route:**
   ```bash
   curl -X POST http://localhost:8000/control/routes \
     -H "Authorization: Bearer dev-only-do-not-use-in-prod" \
     -H "Content-Type: application/json" \
     -d '{"path_segment": "my-agent", "agent_id": "<AGENT_ID>"}'
   ```
4. **Call your agent and view the timeline:**
   ```bash
   curl -X POST http://localhost:8000/gw/my-agent/ \
     -H "Authorization: Bearer dev-only-do-not-use-in-prod" \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc": "2.0", "id": 1, "method": "message/stream", "params": {"message": {"role": "user", "parts": [{"kind": "text", "text": "start task"}]}}}'
   ```
   Open http://localhost:8000 to watch the live timeline reconstruct in real time.

### How callers connect (Python, TypeScript, or any A2A client)

Because A2A Gateway proxies standard A2A JSON-RPC protocol frames, **no proprietary gateway client or custom SDK is required**. Any standard HTTP client, agent framework, or official `a2a-sdk` can talk to the gateway by simply pointing its base URL to `http://localhost:8000/gw/{route}/`:

#### Python (Official `a2a-sdk` or `httpx`)
```python
import httpx

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
    "params": {"message": {"role": "user", "parts": [{"kind": "text", "text": "Hello agent!"}]}},
}

with httpx.stream("POST", GATEWAY_URL, json=payload, headers=headers, timeout=60.0) as response:
    for line in response.iter_lines():
        if line.startswith("data:"):
            print("Received event:", line[5:].strip())
```

#### TypeScript / Node.js
```typescript
const response = await fetch("http://localhost:8000/gw/my-agent/", {
  method: "POST",
  headers: {
    "Authorization": "Bearer dev-only-do-not-use-in-prod",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "message/stream",
    params: { message: { role: "user", parts: [{ kind: "text", text: "Hello agent!" }] } },
  }),
});

const reader = response.body?.getReader();
const decoder = new TextDecoder();
while (reader) {
  const { done, value } = await reader.read();
  if (done) break;
  console.log(decoder.decode(value));
}
```

---

## What makes this different?

Per-task observability and transport failure recovery are fundamentally distinct from API gateways (such as Kong or Envoy) which route raw bytes, and agent frameworks (such as LangGraph or CrewAI) which orchestrate internal logic. A2A Gateway operates at the boundary where autonomous agents communicate with each other over unpredictable networks.

The closest direct competitor is **agentgateway**, which routes A2A protocol frames. This project's bet is that **per-task observability is the empty lane**: when an autonomous agent dies midway through a multi-step streaming task, operations teams need an append-only forensic event store and a triage timeline, not just an API routing table. We have not yet benchmarked head-to-head against agentgateway; that empirical comparison is on the v0.2 roadmap once our data plane abstraction stabilizes.

Standard HTTP proxies route bytes, but they are unaware of task lifecycles or state transitions:

| Concern | HTTP-Grade Proxy (Nginx, Traefik, Envoy) | A2A Gateway |
|---|---|---|
| Routing abstraction | URL paths and HTTP verbs | A2A tasks and registered agent routes |
| Observability | Access logs (status codes, bytes sent) | Task lifecycle timeline (states, events, latency, artifacts) |
| Streaming handling | Byte stream pass-through without parsing | Incremental tap parses SSE frames without buffering |
| Process failure | Logs a 502; all intermediate event history is lost | Preserves in-flight events and logs synthetic `gateway.note` |
| Gateway restart | Drops in-flight state | Fully reconstructs timelines from event-sourced DB tables |

Test persistence is the proof point: if an upstream drops mid-stream, the gateway must record forensic evidence that neither the caller nor the callee can record. This architectural guarantee is verified in our automated test suite by `test_timeline_persistence.py::test_reconstruct_after_restart`. When an upstream agent drops a TCP connection midway through a task, restarting the gateway process in-process produces zero data loss: querying `/control/tasks/{id}/timeline` returns the full chronological sequence of upstream steps plus the synthetic gateway forensic note.

*(Deferred to v0.2 milestone: head-to-head latency and throughput bake-off against agentgateway and Envoy + ext-proc).*

For comprehensive technical specifications, read [docs/architecture.md](docs/architecture.md).

---

## Features

- **Low-Latency Streaming Proxy:** Forwards SSE events incrementally without buffering the complete response. Upstream chunk timing is preserved within minimal frame parsing overhead (automated tests verify median chunk arrival gaps remain within ~500 ms).
- **Per-Task Event Timeline:** Displays chronological status updates, latency in milliseconds per event, expandable message previews, and client-side artifact inspection.
- **Forensic `gateway.note` Events:** Generates synthetic forensic events when upstream connections reset or reject credentials, allowing diagnosis without accessing remote agent logs.
- **3-Column Tasks Triage Board:** Organizes tasks side-by-side into *Needs Attention* (failures/rejected/input-required), *In Flight* (active running streams), and *Recent Terminal* (completed/canceled) with independent pagination and page-size selector.
- **Built-in Console Authentication:** Secure password-gated web console with default `admin`/`admin` credentials and mandatory first-login password rotation.
- **Zero-SDK Transparent Protocol:** No proprietary client libraries required; compatible with Google's official `a2a-sdk` (v0.3 and v1.0), LangGraph, CrewAI, or raw HTTP/SSE.
- **API Key Management:** Issues hashed bearer keys (bcrypt) with prefix tracking (`a2a_live_...`) and fast in-memory validation caching.
- **Agent Card Discovery:** Serves cached agent discovery cards at `/gw/{route}/.well-known/agent-card.json`.
- **Event-Sourced Persistence:** Stores append-only events in PostgreSQL with an in-memory queue to maintain hot-path throughput.

### Screenshots

| Tasks Triage Feed | Task Timeline (Forensic View) |
|---|---|
| ![Tasks Triage](docs/assets/triage.png) | ![Task Timeline](docs/assets/timeline.png) |

| Upstream Agent Registry | Gateway Routes and Stats |
|---|---|
| ![Agents](docs/assets/agents.png) | ![Gateway](docs/assets/gateway.png) |

---

## Architecture

The gateway runs a single process containing two planes:
1. **Hot Data Plane:** Validates keys against a 5-second in-memory cache, forwards bytes directly to upstream agents via `httpx`, and emits events non-blockingly into an in-memory queue to maintain low-latency streaming without waiting on disk writes.
2. **Cold Control Plane:** Consumes queued events in a background worker, commits atomic updates to PostgreSQL, publishes ephemeral deltas to Redis, and serves the REST API, WebSocket feed, and static React dashboard.

All forwarding logic is encapsulated behind the `ProxyBackend` protocol in `app/proxy/interface.py`, enabling future data plane implementations (such as Rust or Envoy) without modifying the control plane. For details, read [docs/architecture.md](docs/architecture.md).

---

## Durability and Failure Semantics

A2A Gateway uses asynchronous write-behind persistence to minimize latency on the streaming hot path:

- **Upstream failures:** When an upstream agent disconnects, resets its connection, or times out, the gateway stops accepting new upstream events, drains previously captured events from the FIFO queue into PostgreSQL, and records a synthetic `gateway.note` describing the failure. This preserves the captured event history, provided PostgreSQL remains available and the gateway process remains alive long enough to complete the drain.
- **Graceful gateway shutdown:** On `SIGTERM`, the gateway stops accepting new inbound work and executes a 5-second drain loop on pending in-memory events before exiting. Note that this 5-second window is an operational timeout to prevent hung processes, not an infinite durability guarantee; if database persistence takes longer than 5 seconds, the process exits and pending events are abandoned.
- **Abrupt gateway termination:** An ungraceful process termination, including `SIGKILL`, can result in the loss of events that have not yet been committed to PostgreSQL.
- **Queue backpressure:** The in-memory buffer is bounded (`EVENT_QUEUE_MAXSIZE=10000`). If saturated under extreme write loads, events are dropped with `stats["dropped_events"]` incremented to prevent stalling upstream HTTP streams.
- **Redis failure:** Redis is used exclusively for ephemeral dashboard event distribution. Its unavailability does not affect PostgreSQL event durability or upstream proxying.
- **Database failure (Degraded mode):** Events awaiting persistence cannot be considered durable. When PostgreSQL is unreachable or failing, the gateway prioritizes caller availability by logging write errors and continuing to stream chunks, but timeline history is not persisted (resulting in partial timelines).
- **Observation boundary:** The gateway reconstructs what it observed over the wire across the A2A JSON-RPC transport. It cannot reconstruct internal agent reasoning, scratchpads, or unexposed tool executions that were never emitted in protocol frames.

PostgreSQL is the durable source of truth. The in-memory queue is a performance optimisation, not a durable message broker.

---

## Security Boundaries & Limitations

- **Gateway Bearer Keys:** Hashed using bcrypt with prefix tracking (`a2a_live_...`) and cached in-memory for 5 seconds. Revocations invalidate the local cache immediately.
- **Upstream Agent Credentials (v0.1 Non-Production Limitation):** Upstream credentials are stored in plaintext in PostgreSQL in v0.1. Envelope encryption (AES-256-GCM + external KMS) is on the v0.2 roadmap. Do not deploy v0.1 with shared or multi-tenant access to the database.
- **Development Key Warning:** The bundled key (`dev-only-do-not-use-in-prod`) is for local testing only. Change `ADMIN_KEY` before exposing the gateway to any non-loopback interface.

---

## Configuration

Configuration is managed via environment variables. Key parameters include `ADMIN_KEY`, `DATABASE_URL`, and `REDIS_URL`, along with four performance tunables:
- `EVENT_QUEUE_MAXSIZE` (default: 10000)
- `UPSTREAM_CONNECT_TIMEOUT_S` (default: 5.0)
- `UPSTREAM_IDLE_TIMEOUT_S` (default: 120.0)
- `CARD_CACHE_TTL_S` (default: 5.0)

For complete descriptions and first-boot instructions, refer to [docs/configuration.md](docs/configuration.md).

---

## Honest ceiling

Designed for teams running hundreds to low-thousands of tasks per minute. Not optimized for hyperscale. If you are routing 100k tasks/sec, this is the wrong tool — use Envoy plus your own observability stack.

---

## Next Milestone — Competitor Bake-Off

**No new product features will be added until this experiment is complete.**

1. **Independent Test Fleet:** Build standardized test agents (instant echo, 6-step streaming, chaos failure, and authenticated).
2. **Standardized Harness:** Run identical test matrices against A2A Gateway, agentgateway, and ContextForge (alongside Envoy with a documented observability setup).
3. **Failure Isolation:** Test upstream connection termination and hard gateway process crashes (`SIGKILL`) independently.
4. **Core Evaluation Metric:** Measure time to reconstruct a failed A2A task from gateway-visible evidence, partial stream retention, failure provenance, and operator effort.
5. **Transparent Reporting:** Publish complete results under `scripts/bench/`, explicitly including areas where A2A Gateway loses or matches competitors.

### Deferred Capabilities (Post-Experiment v0.2+)
- Application-level credential envelope encryption (AES-256-GCM + external KMS)
- Reproducible wrk / k6 benchmark suite under `scripts/bench/`
- Automatic retries with exponential backoff
- Dead-letter queue (DLQ) inspection interface
- Per-route rate limiting
- Per-route passthrough caller authentication
- Role-based access control (RBAC) and key scoping
- Prometheus and OpenTelemetry metrics export
- Push notification bindings

---

## Contributing

This is a v0.1 release with a deliberately focused architecture. Please check the project scope in the implementation plan before proposing major additions. Pull requests addressing bug fixes, documentation clarity, and test coverage are welcome.

---

## License

Apache-2.0. See [LICENSE](LICENSE) for full terms.

