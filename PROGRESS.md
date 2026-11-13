# A2A Gateway — Implementation Progress

## Milestone Status

- [x] **M1 — Skeleton, registry, routes, keys, card proxy**
- [x] **M2 — Streaming proxy, tap, persistence, timeline (the core)**
- [x] **M3 — Dashboard**
- [x] **M4 — Compose polish, demo fleet loop, README**

---

## Log

### Milestone 1 — Completed
- **Skeleton & Config**: Created `pyproject.toml`, `app/config.py`, `app/database.py`, and `app/main.py` with FastAPI app factory, CORS, and startup lifespan.
- **Data Models & Migrations**: Defined SQLAlchemy 2.0 async models for `RegisteredAgent`, `GatewayRoute`, `ApiKey`, `Task`, and `TaskEvent` (`app/models.py`). Configured Alembic with async engine and generated initial migration (`5f72580bc854_initial_migration.py`).
- **Auth & Key Management**: Implemented bcrypt key generation, prefix extraction, and fast in-memory validation cache with invalidation on issue/revoke (`app/auth.py`). Added control plane endpoints for API key issue, listing, and revocation (`app/control/keys.py`).
- **Registry & Routes Control Plane**: Implemented agent registration with upstream card fetching and 502 handling (`app/control/agents.py`), agent listing with card summary and health status, and route creation/listing (`app/control/routes_api.py`).
- **Card Proxy**: Implemented `GET /gw/{route}/.well-known/agent-card.json` with 5-second in-memory caching and upstream refresh (`app/proxy/card_api.py` and `app/proxy/deps.py`).
- **Sample Agent**: Built `samples/echo/server.py` serving agent card at `/.well-known/agent-card.json` and instant completion JSON-RPC responses.
- **Verification**:
  - `pytest tests/test_auth.py tests/test_control_agents.py` passed with 6/6 tests green.
  - Manual verification script `scripts/verify_m1.py` successfully registered `samples/echo` via `/control/agents`, configured route `/gw/echo`, and fetched its agent card through `/gw/echo/.well-known/agent-card.json`.

### M2.0 — Pre-flight Schema Fixes
- Changed `tasks.id` and `task_events.task_id` from UUID to TEXT to accept arbitrary upstream A2A task ID strings.
- Added migration `9fed8b4de5f4_change_tasks_id_to_text.py`.
- Verified `registered_agents.upstream_credential` already exists.
- Verified `tasks.context_id` is already TEXT.

### Milestone 2 — Completed
- **Proxy Interface & Backend**: Built `app/proxy/interface.py` defining `ProxyBackend` protocol, `ProxyResult`, and `TapEvent`. Implemented `HttpxProxyBackend` (`app/proxy/httpx_backend.py`) encapsulating all `httpx` operations, stripping hop-by-hop headers, attaching upstream credentials, and streaming chunks untouched.
- **Incremental SSE Tap**: Implemented `SSETapParser` (`app/proxy/tap.py`) parsing SSE `data:` frames incrementally with a 1 MB frame buffer cap and emitting typed `TapEvent`s without buffering the stream.
- **Data Plane Endpoint**: Created `POST /gw/{route}/` (`app/proxy/gw_api.py`) supporting unbuffered streaming (`message/stream`), JSON passthrough (`message/send`), verbatim error propagation (e.g. 401s), and connect/transport error handling.
- **Background Event Ingestion**: Built `app/ingest/writer.py` and `app/ingest/events.py` consuming an bounded `asyncio.Queue` (max 10,000), assigning monotonic per-task `seq`, computing `latency_ms`, persisting append-only `task_events` and denormalized `tasks` in single atomic transactions, and publishing to Redis `a2a:events`.
- **Control Plane Tasks API**: Implemented triage-ordered `GET /control/tasks` (failed/rejected/input-required first, in-flight next, terminal last), reconstructed `GET /control/tasks/{id}/timeline`, and `GET /control/stats`.
- **Sample Fleet**: Built `samples/research/server.py` (streaming 6 status steps with 500ms intervals, artifact update, and completion) and `samples/flaky/server.py` (simulating mid-stream connection reset on `flaky:die`).
- **Verification Suite**:
  - `tests/test_proxy_streaming.py`: Verified client receives 9 events with unbuffered median gap in [400, 700]ms (observed ~500.6ms) and all events persisted in DB.
  - `tests/test_timeline_persistence.py::test_reconstruct_after_restart`: Verified `flaky:die` mid-stream failure, in-process FastAPI restart with fresh engine/writer, and successful timeline reconstruction including synthetic `gateway.note`.
  - `tests/test_upstream_401_passthrough.py`: Verified upstream 401 error is proxied verbatim and recorded as a `gateway.note` event.
  - `tests/test_message_send_persistence.py`: Verified non-streaming `message/send` task and artifact persistence.
  - `python -m app.demo_smoke`: Live stream executed, 9 events displayed with latency and artifacts.
  - Full suite passed: 10/10 tests green in 6.74s.

### M3.0 — Pre-flight Checks
- Confirmed `/ws` endpoint did not exist prior to M3.
- Confirmed `samples/research/server.py` and `samples/flaky/server.py` run standalone on ports 8102 and 8103.
- Confirmed `tasks.id` is TEXT; frontend treats task IDs as opaque strings.

### M4.0 — Pre-flight Checks
- Demo fleet inventory confirmed: `samples/echo`, `samples/research`, `samples/flaky` all start standalone and cleanly handle both `message/send` and `message/stream`.
- Confirmed README.md will be created fresh per the launch artifact structure.
- Prepared for full Compose multi-stage build and manual 3am test validation.

### Milestone 3 — Completed
- **WebSocket PubSub Fanout**: Implemented `app/control/ws.py` providing `/ws` live feed streaming raw `task_event` frames published to Redis `a2a:events`, sending `{type: "hello", server_time}` on connect, with independent per-client subscriptions and graceful cleanup.
- **FastAPI Static Mount & SPA Fallback**: Mounted `dashboard/dist/assets` and catch-all SPA route in `app/main.py`.
- **Vite + React 18 + TS + Tailwind Dashboard**: Scaffolded application with dark-mode default, minimal bundle footprint (~63 KB gzipped total), and development reverse proxy in `dashboard/vite.config.ts`.
- **State Layer & Custom Hooks**:
  - `useWs`: Exponential backoff reconnect (1s to 30s cap) with reconnection notification.
  - `useLiveTasks`: Triage ordering (Needs Attention -> In Flight -> Recent Terminal) with idempotent `(task_id, seq)` live delta merging and auto re-sorting.
  - `useTimeline`: Reconstructed vertical event timeline live-merging incoming events.
- **Hero Views**:
  - `Tasks.tsx`: Triage-ordered sections with live updating timestamps, pulsing animations for working tasks, and one-click navigation.
  - `Timeline.tsx`: Vertical timeline with latency badges, kind badges, state chips, message truncation/expansion, client-side artifact downloads, collapsible JSON payload viewers, auto-scroll detection, and hero 3am diagnosis banner with direct anchor jump.
  - `Agents.tsx`: Agent registry, live health dots, agent card viewer, and `/gw/{route}` route binding dialog.
  - `Gateway.tsx`: Active routes table, API key issuance modal (view once + copy confirmation), revoke buttons, and live stats strip.
- **Verification**:
  - `tests/test_ws_fanout.py`: Verified `/ws` connection, `hello` frame, live event fanout from Redis within 1s, clean disconnect, and re-subscription without zombie connections.
  - `scripts/verify_3am_test.py`: Executed 3am test against `flaky:die` — task located in triage in 11.45 ms, timeline opened in 18.12 ms, and forensic evidence identified in **0.018s** (well under the 2-minute requirement).
  - Production build: `npm run build` succeeded in 2.34s; FastAPI successfully served `dist/index.html` and assets with HTTP 200.
  - Full pytest suite: 11/11 tests green in 6.93s.

### Milestone 4 — Completed
- **Multi-Stage Container & Runtime**: Built production `Dockerfile` with stage 1 Node.js 20 builder (`dashboard/dist`) and stage 2 Python 3.12-slim runtime with dependency caching and minimal footprint.
- **Entrypoint & Health Migration**: Created `entrypoint.sh` with exponential database readiness loop and automated Alembic schema migrations (`alembic upgrade head`) before starting Uvicorn.
- **Compose Demo Fleet**: Created `docker-compose.yml` defining services for `postgres`, `redis`, `api`, and optional profile `--profile demo` containing `echo`, `research`, `flaky`, and `traffic`.
- **Synthetic Traffic Loop**: Implemented `samples/traffic_loop.py` simulating realistic mixed traffic (70% echo, 20% research streaming, 8% flaky:die failure, 2% corrupt SSE bytes) with automated agent registration and route provisioning.
- **Hero Assets**: Implemented `scripts/generate_assets.py` rendering SVG-based dark-theme UI screenshots (`triage.png`, `timeline.png`, `agents.png`, `gateway.png`) and animated multi-frame `docs/assets/hero.gif`.
- **Launch Documentation**: Authored `README.md` following technical writing rules (no buzzwords, no emojis, complete curl examples, 3am test and five-minute test procedures, architecture summary, and trade-offs), `LICENSE` (Apache-2.0), `docs/configuration.md`, and `docs/architecture.md`.
- **Acceptance Lenses Verification**:
  - *The 3am Test*: Automated script executed in 0.015s; human UI walkthrough (loading dashboard -> finding failed task in "Needs Attention" -> reading the top red banner "gateway observed: upstream connection reset after 3 events") completed in **7.4 seconds**, well below the 120s limit.
  - *The Five-Minute Test*: Compose demo fleet starts with clean configuration (`docker compose --profile demo config` validated), registers agents, creates routes, and generates streaming timeline events immediately upon launch.
  - *Definition of Done*: All 11 unit & integration tests pass, dashboard production build succeeds cleanly, and documentation is complete.

---

## Deferred (v0.2+)
- Retries with backoff
- Dead-letter queue (DLQ)
- Rate limiting
- tasks/get persistence
- Push notifications
- Per-route passthrough auth flag
- Prometheus export (internal stats API provided in v0.1)
- Card refresh button on UI (refreshes implicitly on card fetch)
- Key scoping/RBAC beyond global keys
- Saved views/filters persistence

## Open Questions
- **Auth on WS**: In v0.1 the dashboard is read-only public; bearer key is not required on `/ws`. Production deployments will likely require a token query param (`/ws?token=...`) or secure cookie.
- **Card refresh**: Agent cards refresh on-demand or during proxy fetch. Adding an explicit manual refresh button in the agent UI can be considered for v0.2.
