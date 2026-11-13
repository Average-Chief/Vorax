# A2A Gateway

*The easiest self-hosted way to put all your A2A agents behind one secure, observable endpoint.*

A2A Gateway is a self-hosted control plane and reverse proxy engineered for Agent-to-Agent (A2A) JSON-RPC protocol communication. Callers send tasks to a single endpoint using one gateway API key, and the gateway proxies requests directly to upstream agents without buffering streaming chunks. Every status transition, streaming SSE event, artifact, and connection failure is recorded and displayed on an integrated live dashboard.

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

---

## What makes this different from an HTTP reverse proxy?

Standard HTTP proxies route bytes, but they are unaware of task lifecycles or state transitions.

| Concern | HTTP-Grade Proxy (Nginx, Traefik, Caddy) | A2A Gateway |
|---|---|---|
| Routing abstraction | URL paths and HTTP verbs | A2A tasks and registered agent routes |
| Observability | Access logs (status codes, bytes sent) | Task lifecycle timeline (states, events, latency, artifacts) |
| Streaming handling | Byte stream pass-through without parsing | Incremental tap parses SSE frames without buffering |
| Process failure | Logs a 502; all intermediate event history is lost | Preserves in-flight events and logs synthetic `gateway.note` |
| Gateway restart | Drops in-flight state | Fully reconstructs timelines from event-sourced DB tables |

This architectural distinction is proven in our automated test suite by `test_timeline_persistence.py::test_reconstruct_after_restart`. When an upstream agent drops a TCP connection midway through a task, restarting the gateway process in-process produces zero data loss: querying `/control/tasks/{id}/timeline` returns the full chronological sequence of upstream steps plus the synthetic gateway forensic note.

For comprehensive technical specifications, read [docs/architecture.md](docs/architecture.md).

---

## Features

- **Unbuffered Streaming Proxy:** Passes `message/stream` SSE events through to the caller with zero buffer delays. Automated tests verify median chunk arrival gaps remain intact (~500 ms).
- **Per-Task Event Timeline:** Displays chronological status updates, latency in milliseconds per event, and expandable message text previews.
- **Forensic `gateway.note` Events:** Generates synthetic forensic events when upstream connections reset or reject credentials, allowing diagnosis without accessing remote agent logs.
- **Dashboard with Triage Order:** Sorts tasks automatically so failures and input-required states appear first, followed by active in-flight tasks and completed tasks.
- **API Key Management:** Issues hashed bearer keys (bcrypt) with prefix tracking and fast in-memory validation caching.
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
1. **Hot Data Plane:** Validates keys against a 5-second in-memory cache, forwards bytes directly to upstream agents via `httpx`, and emits events non-blockingly into an in-memory queue.
2. **Cold Control Plane:** Consumes queued events in a background worker, commits atomic updates to PostgreSQL, publishes to Redis, and serves the REST API, WebSocket feed, and static React dashboard.

All forwarding logic is encapsulated behind the `ProxyBackend` protocol in `app/proxy/interface.py`, enabling future data plane implementations (such as Rust or Envoy) without modifying the control plane. For details, read [docs/architecture.md](docs/architecture.md).

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

## Roadmap

The following capabilities are deferred for future releases:
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

