# A2A Gateway — Implementation Progress

## Milestone Status

- [x] **M1 — Skeleton, registry, routes, keys, card proxy**
- [ ] **M2 — Streaming proxy, tap, persistence, timeline (the core)**
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

---

## Deferred (v0.2+)
- (None so far)

## Open Questions
- (None so far)
