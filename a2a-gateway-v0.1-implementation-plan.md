# A2A Gateway — v0.1 Implementation Plan

**Audience:** an autonomous coding agent (Claude Code, Cursor, etc.) executing with a human reviewing between milestones.
**Status gate:** do NOT start until `scorecards/competitor-evaluation.md` (in the bake-off lab repo) records a **BUILD** outcome per the pre-committed decision rule. A plan is not a license to skip the experiment.
**Product sentence (verbatim, use in README):** *The easiest self-hosted way to put all your A2A agents behind one secure, observable endpoint.*

---

## 0. Working agreement for the coding agent

1. Execute milestones **in order** (M1 → M4). After each milestone: run its verification commands, commit with message `M<n>: <summary>`, append a short entry to `PROGRESS.md`, and **stop for human review**.
2. Section 11 (Out of scope) is a hard wall. If a task seems to require anything listed there, stop and flag it in `PROGRESS.md` instead of improvising.
3. The tech stack in section 2 is pinned. No substitutions, no "better alternatives," no new infrastructure dependencies without human approval.
4. Create a fresh repository (`a2a-gateway/`). Do **not** copy code from the bake-off lab (`a2a-gateway-bakeoff/`). The lab is experiment apparatus and stays independent; you may *read* its `agents/*.py` as executable examples of the A2A wire subset in Appendix A.
5. Every protocol detail is in Appendix A. Use exactly those shapes. Do not "improve" the wire format. If Appendix A conflicts with something you remember about A2A, follow Appendix A and note the discrepancy in `PROGRESS.md`.
6. Tests are part of each milestone's definition of done, not a follow-up.

---

## 1. Mission

A self-hosted control plane and reverse-proxy gateway for A2A agents:

- Register agents (agent cards) → get stable gateway routes.
- Callers send A2A JSON-RPC tasks to **one URL** with **one key**; the gateway routes to the right agent and records everything.
- The dashboard shows, per task, its **full lifecycle**: state transitions, streaming events as they arrived, artifacts, and — when things die — exactly where and why.

Two acceptance lenses; every design decision is judged against them:

1. **The 3am test** — "My agent task failed midway. Can I see exactly where and why in under 2 minutes, without touching the agent's logs?"
2. **The five-minute test** — `docker compose up` → register an agent → watch a live task timeline. Under 5 minutes, no YAML PhD, no Kubernetes.

## 2. Pinned stack and constraints

| Concern | Choice |
|---|---|
| Runtime | Python 3.12 |
| API / proxy | FastAPI + `httpx` (async streaming client) |
| DB | PostgreSQL 16, SQLAlchemy 2 (async) + Alembic |
| Cache/pubsub | Redis 7 (WS fanout only in v0.1; all durable state in Postgres) |
| Tests | pytest + pytest-asyncio + httpx ASGI |
| Dashboard | React 18 + Vite + TypeScript + Tailwind + shadcn/ui, dark mode default |
| Deployment | Docker Compose only (api, worker-less, postgres, redis, dashboard static served by FastAPI) |
| License | Apache-2.0 |

Non-negotiable constraints:

- **Standalone-first.** Zero mandatory cloud dependency. No telemetry home, no license server, no accounts.
- **Honest ceiling.** The README states: designed for teams (hundreds–low-thousands of tasks/min), not hyperscale. Do not optimize prematurely.
- **Python is the v0.1 data plane**, but ALL proxying lives behind one module (`app/proxy/`) with a narrow interface (section 6) so a Rust/Envoy plane can replace it later without touching the control plane.

## 3. Architecture

One FastAPI process, two planes inside it:

```
Caller ──▶ /gw/{route}  ──▶ PROXY PATH (hot, lean):
                              1. bearer key check (cached in-memory)
                              2. route → registered agent lookup
                              3. upstream credential attach
                              4. httpx streaming pass-through
                              5. SSE event tap ──▶ asyncio.Queue(maxsize=10_000)
                              6. bytes forwarded untouched to caller
                            WRITER TASK (single, background):
                              queue ──▶ persist event (INSERT) ──▶ update task row
Control plane (cold, rich):
  /control/* REST, dashboard static, WS /ws (reads a Redis pub/sub channel
  that the writer task also publishes to)
```

Hard rules:

- **The proxy path never touches the control plane's code path.** No DB reads on the hot path except the route+key lookup, which must be cached in-memory with a 5s TTL (per-process dict is fine; no distributed cache in v0.1).
- **Acknowledgment semantics (agreed design decision):** the writer task **persists an event BEFORE it can be considered acknowledged**, and the docs state plainly: persisted ≠ delivered to the caller, and delivered ≠ persisted is impossible by construction *only* for events the tap observed — the tap observes bytes as they pass, so the rule is: **tap → enqueue → writer persists → only then does the gateway consider the event recorded.** The tap must never delay the stream by more than the enqueue operation (non-blocking `put_nowait`; on queue overflow, drop the *record* and increment a dropped-events counter — never block the stream).
- **Task state is derived from events.** `task_events` is append-only and the source of truth. A `tasks` row holds the denormalized current state, updated by the writer in the same transaction as the event insert. The timeline endpoint reconstructs purely from events — this is what makes history survive gateway restarts *by design*.
- **The gateway never injects JSON-RPC frames into a proxied stream.** If upstream dies mid-stream, the client sees what upstream sent (i.e., a truncated stream) — and the gateway records a synthetic `gateway.note` event with the transport error evidence. Protocol fidelity is sacred; forensics live in the control plane, not in the wire.

### Repository layout (target)

```
a2a-gateway/
├── docker-compose.yml            # api + postgres + redis (+ profile: demo)
├── Dockerfile
├── pyproject.toml
├── alembic/                      # migrations
├── app/
│   ├── main.py                   # app factory, router mounting, lifespan (writer task)
│   ├── config.py                 # pydantic-settings, env vars (Appendix B)
│   ├── control/
│   │   ├── agents.py             # register/list/get agents (control plane)
│   │   ├── routes_api.py         # gateway route CRUD
│   │   ├── keys.py               # API key issue/revoke
│   │   ├── tasks_api.py          # task list + /tasks/{id}/timeline
│   │   └── ws.py                 # /ws live feed (Redis pub/sub → WS)
│   ├── proxy/
│   │   ├── interface.py          # ProxyBackend protocol (see section 6)
│   │   ├── httpx_backend.py      # v0.1 implementation
│   │   ├── tap.py                # SSE frame parser + event tap
│   │   └── deps.py               # key/route resolution (cached)
│   ├── ingest/
│   │   ├── writer.py             # queue consumer: persist events, update tasks
│   │   └── events.py             # event schema + synthetic gateway.note
│   ├── models.py                 # SQLAlchemy models (section 4)
│   └── auth.py                   # bearer key check + upstream credential attach
├── dashboard/                    # React app (section 8); built dist served by FastAPI
├── samples/                      # demo fleet (section 9)
├── tests/
│   ├── test_proxy_streaming.py
│   ├── test_auth.py
│   ├── test_timeline_persistence.py   # includes the kill-mid-stream restart test
│   └── conftest.py
└── README.md
```

## 4. Data model

Postgres DDL intent (implement as SQLAlchemy models + Alembic migration):

```sql
registered_agents (
  id UUID PK, name TEXT UNIQUE NOT NULL,
  endpoint_url TEXT NOT NULL,               -- direct A2A agent URL
  agent_card JSONB NOT NULL,                -- fetched at registration, refreshed on demand
  upstream_credential TEXT,                 -- static credential the gateway attaches (gateway-issued identity model)
  created_at TIMESTAMPTZ DEFAULT now()
);

gateway_routes (
  id UUID PK, path_segment TEXT UNIQUE NOT NULL,   -- e.g. "research" → /gw/research
  agent_id UUID REFERENCES registered_agents(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

api_keys (
  id UUID PK, name TEXT NOT NULL,
  key_hash TEXT NOT NULL,                   -- bcrypt
  key_prefix TEXT NOT NULL,                 -- first 8 chars, shown in UI
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

tasks (
  id UUID PK,                               -- = A2A task id
  route_id UUID REFERENCES gateway_routes(id),
  context_id TEXT,
  current_state TEXT,                       -- denormalized; derived from events
  is_terminal BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ, last_event_at TIMESTAMPTZ,
  error_summary TEXT
);

task_events (
  id BIGSERIAL PK,
  task_id UUID REFERENCES tasks(id),
  seq INT NOT NULL,                         -- per-task monotonic
  source TEXT NOT NULL,                     -- 'upstream' | 'gateway'
  kind TEXT,                                -- status-update | artifact-update | gateway.note | message
  state TEXT,                               -- submitted/working/input-required/completed/failed/canceled
  is_final BOOLEAN,
  payload JSONB NOT NULL,                   -- the full frame (or note for gateway events)
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  latency_ms INT                            -- ms since task start, computed by writer
);
CREATE INDEX ON task_events (task_id, seq);
CREATE INDEX ON tasks (current_state, last_event_at DESC);
```

Terminal states: `completed`, `failed`, `canceled` (+ `rejected` accepted on input). `input-required` is non-terminal and sorts with "needs attention" in the UI.

## 5. API surface

All control-plane routes require a gateway API key except where noted. Content type for A2A endpoints is JSON; errors are JSON-RPC error objects where the caller spoke JSON-RPC, plain JSON `{detail: ...}` on control routes.

### Control plane

```
POST /control/agents          {name, endpoint_url, upstream_credential?} → fetches card from endpoint_url, stores both. 502 if card unreachable.
GET  /control/agents          → [{id, name, endpoint_url, health, card_summary}]
GET  /control/agents/{id}     → full record incl. card
POST /control/routes          {path_segment, agent_id} → creates /gw/{path_segment}
GET  /control/routes
POST /control/keys            {name} → {key: "a2a_...", prefix}  (key shown ONCE; only hash stored)
DELETE /control/keys/{id}
GET  /control/tasks?state=&limit=100   → triage list (failed & input-required first, then in-flight by last_event_at desc, then terminal)
GET  /control/tasks/{id}/timeline       → {task, events: [...]}  ← reconstructed purely from task_events
GET  /control/stats                     → counters (tasks by state, events/sec, dropped_events)
WS   /ws                                → live feed: {type: "task_event", task_id, kind, state, ...}
```

### Gateway proxy (the data plane)

```
GET  /gw/{route}/.well-known/agent-card.json   → card of the routed agent (5s in-memory cache)
POST /gw/{route}/                              → JSON-RPC passthrough:
      - Authorization: Bearer <GATEWAY key> required
      - body forwarded verbatim to agent endpoint (plus upstream credential header if configured)
      - response passed through: JSON (message/send, tasks/get) or text/event-stream (message/stream)
```

There is deliberately no `/gw/.../tasks/{id}` REST alias — the gateway proxies JSON-RPC, and its own task history is served from the control plane timeline endpoint. Do not blur the two.

## 6. Proxy interface (the swap point)

```python
class ProxyBackend(Protocol):
    async def forward(
        self,
        route: ResolvedRoute,          # agent endpoint + upstream credential
        request_headers: dict,         # caller headers minus hop-by-hop
        body: bytes,                   # raw JSON-RPC request
        on_event: Callable[[TapEvent], None],   # tap callback (non-blocking)
    ) -> ProxyResult: ...
        # ProxyResult: status_code, content_type, byte-stream (async iterator),
        # and for streams: the transport error, if the upstream died mid-stream
```

`httpx_backend.py` implements this with `httpx.AsyncClient.stream`. The tap (`tap.py`) parses `data:` frames *from the byte stream as it passes* — it never buffers the whole response, never mutates it. `TapEvent` = `{task_id?, context_id?, kind, state, is_final, raw}` (task_id extracted from frames; synthetic `gateway.note` events generated by the backend on connect errors / mid-stream death).

## 7. Auth model (v0.1)

- **Caller → gateway:** bearer key, hashed (bcrypt), prefix kept for display. Single global scope in v0.1. Keys checked against an in-memory cache populated on issue/revoke.
- **Gateway → agent (the gateway-issued identity model):** each registered agent may carry a static `upstream_credential` (e.g. `Bearer xyz`) that the gateway attaches when forwarding. Callers never hold upstream credentials.
- **Passthrough mode** (forward the caller's own Authorization upstream) is a per-route flag — schema field may exist, behavior ships in v0.2.
- Failure surfaces: gateway key invalid → `401` JSON-RPC error `-32001 "Unauthorized: invalid gateway key"`. Upstream returns 401 → proxied verbatim to caller AND recorded as a `gateway.note` event ("upstream rejected credential"). Never swallow, never rewrite.

## 8. Dashboard (React)

Three primary nav items — Agents, Tasks, Gateway — plus a Task Timeline detail view. Dark mode default. shadcn/ui. No routing library beyond what the template provides.

1. **Agents** — list with health dot (green/gray; health = last card fetch + last successful proxy within 60s), register dialog (paste endpoint URL + optional credential), per-agent card viewer, route assignment.
2. **Tasks** — **triage by default**: failed and `input-required` first (red/amber), then in-flight (pulsing), then recent terminal (dimmed). Live via WS. Row click → Timeline.
3. **Task Timeline (the hero)** — vertical timeline: every `task_event` with `seq`, `latency_ms`, kind badge, state chip, message text preview, artifact listing (name, size, download), raw payload in a collapsible JSON viewer. Synthetic `gateway.note` events render in a distinct style ("gateway observed: upstream connection reset after 3 events").
4. **Gateway** — routes table, keys management (issue once, copy, revoke), stats strip (tasks/min, events/sec, dropped_events — the dropped counter must be visible if > 0).

WS client: single connection, exponential reconnect (1s → 30s cap), refetch triage on reconnect.

## 9. Demo fleet (bundled, separate from the bake-off lab)

`samples/` contains three agents implemented fresh inside this repo (do not import the lab):

| Sample | Behavior |
|---|---|
| `samples/echo/` | instant completion |
| `samples/research/` | ~3s, 1 SSE event/500ms, artifact, complete |
| `samples/flaky/` | mode via input directive `flaky:die` — streams 3 events then drops the connection (process survives) |

`make demo` (compose profile `demo`) starts all three plus a loop script that submits a realistic mix (80% echo/research, 15% flaky:die, 5% garbage payload) so the dashboard is alive within 60 seconds of `docker compose --profile demo up`. The README's hero GIF is recorded from this fleet.

## 10. Milestones, acceptance criteria, verification

### M1 — Skeleton, registry, routes, keys, card proxy
Build: app factory, config, models + initial migration, control-plane agents/routes/keys, `GET /gw/{route}/.well-known/agent-card.json`, key auth middleware with cache, tests.
**Verify:** `pytest tests/test_auth.py tests/test_control_agents.py` green; manual: register a locally running `samples/echo` agent via API, fetch its card through `/gw/echo/.well-known/agent-card.json`.

### M2 — Streaming proxy, tap, persistence, timeline (the core)
Build: `proxy/interface.py`, `httpx_backend.py`, `tap.py`, `ingest/writer.py`, `tasks` + `task_events` tables, `GET /control/tasks/{id}/timeline`, WS publishing from the writer.
Tests (must all exist and pass):
- `test_proxy_streaming.py` — proxy `message/stream` against a local sample agent; assert client receives ≥ 9 events and per-event arrival gaps are ~500ms (proves no buffering); assert every event persisted with correct `seq`.
- `test_timeline_persistence.py::test_reconstruct_after_restart` — start stream against `samples/flaky` (directive `flaky:die`), let it die mid-stream, **restart the FastAPI app in-process, then assert `/control/tasks/{id}/timeline` still returns the full event list including the synthetic gateway.note.** This test is the product thesis in executable form.
- `test_upstream_401_passthrough.py` — auth agent rejects bad credential; assert caller got upstream's 401 verbatim AND a gateway.note exists.
**Verify:** `pytest` green; `python -m app.demo_smoke` (small script submitting one research task) prints a timeline with ≥ 9 events and latency_ms per event.

### M3 — Dashboard
Build: Vite app, Agents / Tasks (triage) / Timeline / Gateway pages, WS client.
**Verify:** `npm run build` succeeds and FastAPI serves `dist/`; manual 3am test: kill `samples/research` mid-task, find the failed task in triage within one click, open timeline, see exactly where it died. Time yourself — under 2 minutes or the UI needs work.

### M4 — Compose polish, demo fleet loop, README
Build: Dockerfiles, `docker-compose.yml` (api, postgres, redis; profile `demo` adds samples + traffic loop), README (hero GIF, 60-second quickstart, honest-ceiling statement, "how this differs from HTTP-grade proxies" section citing the restart test), Apache-2.0 `LICENSE`, `docs/configuration.md` (Appendix B as rendered docs).
**Verify:** fresh-clone test: `docker compose --profile demo up` → open dashboard → live traffic visible in < 60 s. `pytest` green inside the api container.

## 11. Out of scope for v0.1 — hard wall

Retries with backoff · dead-letter queue UI · rate limiting · multi-tenant/orgs/RBAC · MCP federation · Envoy or external data plane · OpenTelemetry export (internal logs only) · gRPC transport bindings · push notifications · task resumability · key scoping beyond global · per-route analytics beyond the stats strip.

If a review request or discovered need falls here: record it in `PROGRESS.md` under "Deferred (v0.2+)" and move on.

## 12. Definition of done (v0.1)

- [ ] All milestone verifications green, including the restart-reconstruction test
- [ ] Fresh `docker compose --profile demo up` passes the five-minute test
- [ ] The 3am test passes by hand (timed, noted in README)
- [ ] README contains the product sentence, quickstart, honest-ceiling paragraph, and links the bake-off findings that motivated the design
- [ ] No deferred-scope features half-sneaked in (review section 11 diff against actual routes/pages)
- [ ] `PROGRESS.md` complete; open questions listed at the bottom

---

## Appendix A — A2A wire subset (authoritative for this repo)

Transport: JSON-RPC 2.0 over HTTP POST to the agent's endpoint URL. Agent card served at `GET /.well-known/agent-card.json` (also accept legacy `/.well-known/agent.json` when fetching upstream).

**Agent card (subset we rely on):**

```json
{
  "name": "Research Agent",
  "description": "...",
  "url": "http://research:8102/",
  "version": "0.1.0",
  "protocolVersion": "0.3.0",
  "preferredTransport": "JSONRPC",
  "supportedInterfaces": [{"url": "http://research:8102/", "protocolBinding": "JSONRPC"}],
  "capabilities": {"streaming": true, "pushNotifications": false},
  "defaultInputModes": ["text/plain"],
  "defaultOutputModes": ["text/plain"],
  "securitySchemes": {"bearerAuth": {"type": "http", "scheme": "bearer"}},
  "security": [{"bearerAuth": []}],
  "skills": [{"id": "research", "name": "Research", "description": "...", "tags": []}]
}
```

**message/send (non-streaming):**

```json
// request
{"jsonrpc": "2.0", "id": 1, "method": "message/send",
 "params": {"message": {"role": "user", "kind": "message", "messageId": "m-1",
           "parts": [{"kind": "text", "text": "hello"}]}}}
// response (result is a Task object)
{"jsonrpc": "2.0", "id": 1,
 "result": {"id": "task-uuid", "contextId": "ctx-uuid", "kind": "task",
            "status": {"state": "completed", "timestamp": "2026-11-13T10:00:00Z"},
            "artifacts": [{"artifactId": "art-1", "name": "echo",
                           "parts": [{"kind": "text", "text": "echo: hello"}]}],
            "history": []}}
```

**message/stream (SSE):** same request shape; response is `text/event-stream`, each frame `data: <one JSON-RPC response>\n\n`, where `result` is one of:

```json
// status-update
{"taskId": "...", "contextId": "...", "kind": "status-update",
 "status": {"state": "working",
            "message": {"role": "agent", "kind": "message", "messageId": "m-2",
                        "parts": [{"kind": "text", "text": "step 1/6"}]},
            "timestamp": "..."},
 "final": false}
// artifact-update
{"taskId": "...", "contextId": "...", "kind": "artifact-update",
 "artifact": {"artifactId": "...", "name": "report",
              "parts": [{"kind": "text", "text": "..."}]},
 "append": false, "lastChunk": true, "final": false}
```

The stream ends with a status-update where `"final": true`. Task states: `submitted`, `working`, `input-required`, `completed`, `failed`, `canceled` (terminal: completed/failed/canceled; `rejected` may appear from upstream — treat as terminal, map to failed in triage).

**tasks/get:**

```json
{"jsonrpc": "2.0", "id": 2, "method": "tasks/get", "params": {"id": "task-uuid"}}
```

**JSON-RPC errors:** `-32601` method not found, `-32602` invalid params, `-32700` parse error, `-32001` unauthorized/task-not-found (gateway convention for auth failures). HTTP status mirrors: 401 for auth, 200 otherwise (JSON-RPC over POST convention), 502 only when the gateway cannot reach upstream at all.

## Appendix B — Environment variables (defaults)

| Var | Default | Meaning |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://a2a:a2a@postgres:5432/a2a` | Postgres DSN |
| `REDIS_URL` | `redis://redis:6379/0` | WS fanout pub/sub |
| `ADMIN_KEY` | generated on first boot, printed once | bootstrap API key |
| `EVENT_QUEUE_MAXSIZE` | `10000` | tap → writer queue bound |
| `UPSTREAM_CONNECT_TIMEOUT_S` | `5` | proxy connect timeout |
| `UPSTREAM_IDLE_TIMEOUT_S` | `120` | proxy read-idle timeout |
| `CARD_CACHE_TTL_S` | `5` | agent card cache |
| `LOG_LEVEL` | `info` | |
