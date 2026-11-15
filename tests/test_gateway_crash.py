import pytest
from datetime import datetime, timezone
from httpx import AsyncClient
from sqlalchemy import select

from app.database import async_session_maker
from app.models import Task, TaskEvent
from app.main import lifespan, create_app

@pytest.mark.asyncio
async def test_startup_orphan_sweep_after_crash(client: AsyncClient, admin_headers: dict):
    """Verifies that an in-flight task surviving an abrupt gateway crash is marked as failed

    with a synthetic forensic gateway.note upon gateway reboot.
    """
    task_id = "task-crashed-midstream"

    # 1. Simulate an in-flight task that was running when gateway abruptly died (SIGKILL)
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
            e1 = TaskEvent(
                task_id=task_id,
                seq=1,
                source="upstream",
                kind="task",
                state="working",
                is_final=False,
                payload={"status": "accepted"},
                observed_at=datetime.now(timezone.utc),
            )
            e2 = TaskEvent(
                task_id=task_id,
                seq=2,
                source="upstream",
                kind="status-update",
                state="working",
                is_final=False,
                payload={"status": "step 1 complete"},
                observed_at=datetime.now(timezone.utc),
            )
            session.add_all([e1, e2])

    # 2. Simulate gateway restart (trigger lifespan startup sweep)
    app = create_app()
    async with lifespan(app):
        # 3. Query the task timeline post-reboot
        resp = await client.get(f"/control/tasks/{task_id}/timeline", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()

        # Task state should now be terminal failed (not stuck in flight)
        assert data["task"]["current_state"] == "failed"
        assert data["task"]["is_terminal"] is True
        assert "stream interrupted" in data["task"]["error_summary"]
        assert data["is_incomplete"] is True

        # Pre-crash events must survive
        events = data["events"]
        assert len(events) == 3
        assert events[0]["seq"] == 1
        assert events[1]["seq"] == 2

        # A synthetic gateway.note must be appended at seq 3
        crash_note = events[2]
        assert crash_note["seq"] == 3
        assert crash_note["kind"] == "gateway.note"
        assert crash_note["source"] == "gateway"
        assert "gateway restarted; stream interrupted" in crash_note["payload"]["message"]
