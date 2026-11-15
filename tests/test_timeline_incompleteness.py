import asyncio
import pytest
from datetime import datetime, timezone
from httpx import AsyncClient
from sqlalchemy import select

from app.database import async_session_maker
from app.models import Task, TaskEvent
from app.proxy.interface import TapEvent
from app.ingest.writer import enqueue_event, process_event, reset_writer_state, get_event_queue

@pytest.mark.asyncio
async def test_tail_drop_backpressure_triggers_incomplete(client: AsyncClient, admin_headers: dict):
    """Test that dropping events due to queue backpressure explicitly marks task as incomplete."""
    reset_writer_state()
    q = get_event_queue()
    # Artificially saturate queue to maxsize
    dummy_event = TapEvent(task_id="dummy", context_id=None, kind="dummy", state=None, is_final=False, raw={})
    while not q.full():
        q.put_nowait(dummy_event)

    task_id = "test-tail-drop-task"
    # Enqueue first event for task (fails due to queue full)
    dropped = enqueue_event(TapEvent(task_id=task_id, context_id=None, kind="status-update", state="working", is_final=False, raw={}))
    assert dropped is False

    # Create task record in DB
    async with async_session_maker() as session:
        async with session.begin():
            t = Task(
                id=task_id,
                current_state="working",
                is_terminal=False,
                started_at=datetime.now(timezone.utc),
                last_event_at=datetime.now(timezone.utc),
            )
            session.add(t)

    # Query timeline
    resp = await client.get(f"/control/tasks/{task_id}/timeline", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_incomplete"] is True
    assert "Tail events were dropped" in data["incompleteness_reason"]

@pytest.mark.asyncio
async def test_stream_truncation_tail_drop(client: AsyncClient, admin_headers: dict):
    """Test that a task marked terminal whose last event is non-terminal triggers incomplete marker."""
    task_id = "test-truncated-stream-task"
    async with async_session_maker() as session:
        async with session.begin():
            t = Task(
                id=task_id,
                current_state="working",
                is_terminal=True,  # e.g., socket closed or stream ended abruptly
                started_at=datetime.now(timezone.utc),
                last_event_at=datetime.now(timezone.utc),
            )
            session.add(t)
            # Add non-terminal event
            e = TaskEvent(
                task_id=task_id,
                seq=1,
                source="upstream",
                kind="status-update",
                state="working",
                is_final=False,
                payload={"status": "working"},
                observed_at=datetime.now(timezone.utc),
            )
            session.add(e)

    resp = await client.get(f"/control/tasks/{task_id}/timeline", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_incomplete"] is True
    assert "final completion event was dropped" in data["incompleteness_reason"]

@pytest.mark.asyncio
async def test_sequence_gap_triggers_incomplete(client: AsyncClient, admin_headers: dict):
    """Test that an interior sequence gap triggers incomplete marker."""
    task_id = "test-seq-gap-task"
    async with async_session_maker() as session:
        async with session.begin():
            t = Task(
                id=task_id,
                current_state="completed",
                is_terminal=True,
                started_at=datetime.now(timezone.utc),
                last_event_at=datetime.now(timezone.utc),
            )
            session.add(t)
            e1 = TaskEvent(
                task_id=task_id,
                seq=1,
                source="upstream",
                kind="task",
                state="working",
                is_final=False,
                payload={},
                observed_at=datetime.now(timezone.utc),
            )
            # Gap: seq jumps from 1 to 3
            e2 = TaskEvent(
                task_id=task_id,
                seq=3,
                source="upstream",
                kind="status-update",
                state="completed",
                is_final=True,
                payload={},
                observed_at=datetime.now(timezone.utc),
            )
            session.add_all([e1, e2])

    resp = await client.get(f"/control/tasks/{task_id}/timeline", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_incomplete"] is True
    assert "gap detected between #1 and #3" in data["incompleteness_reason"]
