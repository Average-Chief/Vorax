# A2A Gateway — Implementation Progress

## Milestone Status

- [x] **M1 — Skeleton, registry, routes, keys, card proxy**
- [x] **M2 — Streaming proxy, tap, persistence, timeline (the core)**
- [ ] **M3 — Dashboard**
- [ ] **M4 — Compose polish, demo fleet loop, README**

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

### M3.0 — Pre-flight Checks
- Confirmed `/ws` endpoint does not yet exist (will be implemented in `app/control/ws.py`).
- Confirmed `samples/research/server.py` and `samples/flaky/server.py` run standalone on ports 8102 and 8103.
- Confirmed `tasks.id` is TEXT; frontend will treat task IDs as opaque strings.

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

---

## Deferred (v0.2+)
- Retries with backoff
- Dead-letter queue (DLQ)
- Rate limiting
- tasks/get persistence
- WS endpoint + live dashboard client (WS writer publishing completed; UI in M3)
- Push notifications
- Per-route passthrough auth flag
- Prometheus export (internal stats API provided in v0.1)

## Open Questions
- (None so far)

---

## Deferred (v0.2+)
- (None so far)

## Open Questions
- (None so far)
