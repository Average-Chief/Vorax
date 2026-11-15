import asyncio
import json
import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.database import get_db
from app.models import Task
from app.proxy.httpx_backend import register_test_mount
from tests.conftest import StreamingASGITransport, async_session_factory
from samples.flaky.server import app as flaky_app
from app.main import create_app

@pytest.mark.asyncio
async def test_reconstruct_after_restart(client: AsyncClient, admin_headers: dict):
    # 1. Mount flaky agent and register route
    register_test_mount("http://localhost:8103", StreamingASGITransport(app=flaky_app))

    reg_resp = await client.post(
        "/control/agents",
        json={"name": "flaky", "endpoint_url": "http://localhost:8103"},
        headers=admin_headers,
    )
    assert reg_resp.status_code == 201
    agent_id = reg_resp.json()["id"]

    route_resp = await client.post(
        "/control/routes",
        json={"path_segment": "flaky", "agent_id": agent_id},
        headers=admin_headers,
    )
    assert route_resp.status_code == 201

    # 2. Submit flaky:die stream request
    req_body = {
        "jsonrpc": "2.0",
        "id": 42,
        "method": "message/stream",
        "params": {
            "message": {
                "role": "user",
                "kind": "message",
                "messageId": "m-flaky-1",
                "parts": [{"kind": "text", "text": "run task with directive flaky:die"}],
            }
        },
    }

    task_id = None
    stream_ended_with_error = False

    try:
        async with client.stream(
            "POST",
            "/gw/flaky/",
            json=req_body,
            headers=admin_headers,
        ) as stream_resp:
            assert stream_resp.status_code == 200
            async for line in stream_resp.aiter_lines():
                if line.startswith("data:"):
                    payload_str = line[5:].strip()
                    if payload_str:
                        data = json.loads(payload_str)
                        res = data.get("result", {})
                        if not task_id:
                            task_id = res.get("taskId")
    except Exception:
        stream_ended_with_error = True

    assert task_id is not None, "Did not receive task_id before upstream stream died"

    # Wait for writer to persist synthetic gateway.note event
    await asyncio.sleep(0.3)

    # 3. Assert tasks row state before restart
    async with async_session_factory() as session:
        stmt = select(Task).where(Task.id == task_id)
        task_row = (await session.execute(stmt)).scalar_one_or_none()
        assert task_row is not None
        assert task_row.current_state == "working"
        assert task_row.is_terminal is False

    # 4. In-process restart of FastAPI app (new engine/writer, same DB)
    new_app = create_app()

    async def override_get_db():
        async with async_session_factory() as s:
            yield s

    new_app.dependency_overrides[get_db] = override_get_db

    async with new_app.router.lifespan_context(new_app):
        new_transport = StreamingASGITransport(app=new_app)
        async with AsyncClient(transport=new_transport, base_url="http://test") as new_client:
            # 5. GET timeline from newly restarted gateway app
            timeline_resp = await new_client.get(
                f"/control/tasks/{task_id}/timeline",
                headers=admin_headers,
            )
            assert timeline_resp.status_code == 200
            data = timeline_resp.json()

            task_info = data["task"]
            events = data["events"]

            assert task_info["id"] == task_id
            # Post-restart startup sweep marks orphaned in-flight tasks as terminal failed
            assert task_info["current_state"] == "failed"
            assert task_info["is_terminal"] is True
            assert "stream interrupted" in task_info["error_summary"]

            # Verify events list contains the 3 upstream events plus the synthetic gateway.note
            assert len(events) >= 4

            # Upstream events
            upstream_events = [e for e in events if e["source"] == "upstream"]
            assert len(upstream_events) == 3

            # Synthetic gateway.note event
            gateway_notes = [e for e in events if e["source"] == "gateway" and e["kind"] == "gateway.note"]
            assert len(gateway_notes) >= 1
            note = gateway_notes[0]
            assert "error_type" in note["payload"]
            assert len(note["payload"]["error_type"]) > 0

            # Contiguous seq check
            seqs = [e["seq"] for e in events]
            assert seqs == list(range(1, len(events) + 1))
