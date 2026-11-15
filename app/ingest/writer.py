import asyncio
import json
import logging
import time
from datetime import datetime, timezone
from typing import Optional, Any
import redis.asyncio as aioredis
from sqlalchemy import select

from app.config import settings
from app.database import async_session_maker
from app.models import Task, TaskEvent
from app.proxy.interface import TapEvent

logger = logging.getLogger("a2a.writer")

# Counters for /control/stats
stats = {
    "dropped_events": 0,
    "orphan_errors": 0,
    "total_events": 0,
    "start_time": time.time(),
}

event_queue: Optional[asyncio.Queue[TapEvent]] = None
writer_task: Optional[asyncio.Task] = None
redis_client: Optional[aioredis.Redis] = None

# In-memory maps for monotonic seq and started_at
_task_seq: dict[str, int] = {}
_task_started_at: dict[str, datetime] = {}

def get_event_queue() -> asyncio.Queue[TapEvent]:
    global event_queue
    if event_queue is None:
        event_queue = asyncio.Queue(maxsize=settings.EVENT_QUEUE_MAXSIZE)
    return event_queue

def reset_writer_state() -> None:
    global event_queue, _task_seq, _task_started_at, redis_client
    event_queue = None
    _task_seq.clear()
    _task_started_at.clear()
    redis_client = None

def enqueue_event(event: TapEvent) -> bool:
    q = get_event_queue()
    try:
        q.put_nowait(event)
        return True
    except asyncio.QueueFull:
        stats["dropped_events"] += 1
        # Forensic failure notes have priority: evict an older streaming event to guarantee persistence
        if settings.SYNC_PERSIST_GATEWAY_NOTES and event.kind == "gateway.note":
            try:
                _ = q.get_nowait()
                q.put_nowait(event)
                logger.warning("Event queue full: evicted older event to persist forensic gateway.note")
                return True
            except Exception:
                pass
        logger.warning("Event queue full (dropped_events=%d). Dropping record.", stats["dropped_events"])
        return False

async def get_redis() -> Optional[aioredis.Redis]:
    global redis_client
    if redis_client is None:
        try:
            redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        except Exception as e:
            logger.warning("Redis client initialization failed: %s", e)
            return None
    return redis_client

def check_terminal_state(event: TapEvent) -> bool:
    if event.is_final is True:
        return True
    if event.state in ("completed", "failed", "canceled", "rejected"):
        return True
    return False

def extract_error_summary(event: TapEvent) -> Optional[str]:
    if event.kind == "gateway.note":
        return event.raw.get("detail") or event.raw.get("message")
    if event.state in ("failed", "rejected"):
        if "error" in event.raw:
            err = event.raw["error"]
            if isinstance(err, dict):
                return err.get("message") or str(err)
            return str(err)
        return f"Task ended with state: {event.state}"
    return None

async def process_event(event: TapEvent) -> None:
    task_id = event.task_id
    if not task_id:
        stats["orphan_errors"] += 1
        logger.warning("Orphan event dropped (no task_id): kind=%s raw=%s", event.kind, event.raw)
        return

    # Monotonic seq
    seq = _task_seq.get(task_id, 0) + 1
    _task_seq[task_id] = seq

    # Latency computation
    started_at = _task_started_at.get(task_id)
    if started_at is None:
        started_at = event.observed_at
        _task_started_at[task_id] = started_at
        latency_ms = 0
    else:
        latency_ms = max(0, int((event.observed_at - started_at).total_seconds() * 1000))

    event.latency_ms = latency_ms
    is_terminal = check_terminal_state(event)
    error_summary = extract_error_summary(event)

    # Persist in DB
    async with async_session_maker() as session:
        async with session.begin():
            # Query task
            stmt = select(Task).where(Task.id == task_id)
            task = (await session.execute(stmt)).scalar_one_or_none()

            if task is None:
                task = Task(
                    id=task_id,
                    route_id=event.route_id,
                    context_id=event.context_id,
                    current_state=event.state or "working",
                    is_terminal=is_terminal,
                    started_at=started_at,
                    last_event_at=event.observed_at,
                    error_summary=error_summary,
                )
                session.add(task)
            else:
                if event.state:
                    task.current_state = event.state

                if event.context_id and not task.context_id:
                    task.context_id = event.context_id

                task.last_event_at = event.observed_at

                if is_terminal:
                    task.is_terminal = True
                if error_summary and not task.error_summary:
                    task.error_summary = error_summary

            # Insert task_event
            task_event = TaskEvent(
                task_id=task_id,
                seq=seq,
                source=event.source,
                kind=event.kind,
                state=event.state,
                is_final=event.is_final,
                payload=event.raw,
                observed_at=event.observed_at,
                latency_ms=latency_ms,
            )
            session.add(task_event)

    stats["total_events"] += 1

    # Prune in-memory state on terminal
    if is_terminal:
        _task_seq.pop(task_id, None)
        _task_started_at.pop(task_id, None)

    # Publish to Redis
    r = await get_redis()
    if r:
        try:
            pub_data = {
                "type": "task_event",
                "task_id": task_id,
                "kind": event.kind,
                "state": event.state,
                "is_final": event.is_final,
                "seq": seq,
                "latency_ms": latency_ms,
            }
            await r.publish("a2a:events", json.dumps(pub_data))
        except Exception as e:
            logger.debug("Failed publishing event to Redis: %s", e)

async def writer_loop() -> None:
    logger.info("Writer task started.")
    q = get_event_queue()
    while True:
        try:
            event = await q.get()
            await process_event(event)
            q.task_done()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error("Error processing event in writer loop: %s", e, exc_info=True)

def start_writer_task() -> asyncio.Task:
    global writer_task, event_queue
    event_queue = asyncio.Queue(maxsize=settings.EVENT_QUEUE_MAXSIZE)
    writer_task = asyncio.create_task(writer_loop())
    return writer_task

async def stop_writer_task() -> None:
    global writer_task, redis_client, event_queue
    logger.info("Stopping writer task...")

    # Cancel background writer first so only one consumer drains
    if writer_task:
        writer_task.cancel()
        try:
            await writer_task
        except asyncio.CancelledError:
            pass
        writer_task = None

    q = get_event_queue()
    # Drain remaining queue with 5s timeout
    try:
        start_drain = time.monotonic()
        while not q.empty() and time.monotonic() - start_drain < 5.0:
            try:
                event = q.get_nowait()
                await process_event(event)
                q.task_done()
            except asyncio.QueueEmpty:
                break
    except Exception as e:
        logger.error("Error draining event queue on shutdown: %s", e)

    if redis_client:
        try:
            await redis_client.aclose()
        except Exception:
            pass
        redis_client = None

    event_queue = None
    logger.info("Writer task stopped.")
