# Configuration Reference

A2A Gateway is configured through environment variables. All variables can be defined in a `.env` file or passed through Docker Compose and container runtime environments.

---

## Environment Variables

### `DATABASE_URL`
- **Default:** `postgresql+asyncpg://a2a:a2a@postgres:5432/a2a`
- **Description:** Async database connection string for PostgreSQL. SQLAlchemy 2.0 uses this URI to manage persistent storage for registered agents, gateway routes, API key hashes, tasks, and task event logs.
- **When to adjust:** Change this when connecting to an external or managed PostgreSQL instance, or when switching credentials and hostnames. For local testing, SQLite via `sqlite+aiosqlite:///./path.db` is also supported.

### `REDIS_URL`
- **Default:** `redis://redis:6379/0`
- **Description:** Connection URL for Redis 7. In v0.1, Redis is used strictly for low-latency WebSocket live event fanout on the `a2a:events` pub/sub channel. Durable state remains exclusively in PostgreSQL.
- **When to adjust:** Change when routing to a dedicated Redis cluster, password-protected Redis, or different database index.

### `ADMIN_KEY`
- **Default:** Automatically generated on first boot if not set
- **Description:** Bootstrap administrative bearer API key used to access control plane endpoints (`/control/*`).
- **When to adjust:** Set to a secure random string (e.g., `a2a_...`) in production environments before exposing gateway ports.

### `EVENT_QUEUE_MAXSIZE`
- **Default:** `10000`
- **Description:** Maximum capacity of the bounded in-memory `asyncio.Queue` connecting the real-time SSE stream tap to the background event persistence writer.
- **When to adjust:** Increase if operating with very high burst task volumes where the database write throughput temporarily lags behind incoming stream events. If exceeded, dropped events are counted in `/control/stats` to protect streaming throughput.

### `UPSTREAM_CONNECT_TIMEOUT_S`
- **Default:** `5.0`
- **Description:** Maximum timeout in seconds allowed for the gateway to establish a TCP and TLS connection to an upstream A2A agent endpoint.
- **When to adjust:** Increase if upstream agents reside in high-latency network environments or require extra time during cold starts.

### `UPSTREAM_IDLE_TIMEOUT_S`
- **Default:** `120.0`
- **Description:** Maximum read idle timeout in seconds between successive streaming chunks received from an upstream agent.
- **When to adjust:** Increase if your agents perform long-running blocking thinking or computation steps that do not emit intermediate status updates for more than 2 minutes.

### `CARD_CACHE_TTL_S`
- **Default:** `5.0`
- **Description:** Time-to-live in seconds for cached agent route resolutions and agent discovery cards (`/.well-known/agent-card.json`).
- **When to adjust:** Keeps the hot proxy data path lean without querying the database for every single request. Lower for rapid agent updates or raise to further reduce database lookups.

### `LOG_LEVEL`
- **Default:** `info`
- **Description:** Application logging level (`debug`, `info`, `warning`, `error`).
- **When to adjust:** Set to `debug` during development or troubleshooting, and `warning` or `info` in production.

---

## First Boot Guide

When starting A2A Gateway for the first time without an explicit `ADMIN_KEY` configured:
1. The gateway checks the database for active API keys.
2. If none exist and `ADMIN_KEY` is not provided in the environment, the gateway generates a secure bootstrap admin key and prints it once to standard output:
   ```text
   ============================================================
   A2A Gateway Bootstrap Admin Key: a2a_...
   Use this key with 'Authorization: Bearer <key>' to access control plane.
   ============================================================
   ```
3. Copy this key immediately. Use it to log in to the dashboard or configure `ADMIN_KEY` in your `.env` or `docker-compose.yml` for subsequent restarts.
