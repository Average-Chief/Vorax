import asyncio
import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.models import Task, TaskEvent
from app.proxy.httpx_backend import register_test_mount
from tests.conftest import StreamingASGITransport, async_session_factory
from samples.echo.server import app as echo_app

@pytest.mark.asyncio
async def test_message_send_persistence(client: AsyncClient, admin_headers: dict):
    # 1. Mount echo agent
    register_test_mount("http://localhost:8101", StreamingASGITransport(app=echo_app))

    # 2. Register agent and create route
    reg_resp = await client.post(
        "/control/agents",
        json={"name": "echo", "endpoint_url": "http://localhost:8101"},
        headers=admin_headers,
    )
    assert reg_resp.status_code == 201
    agent_id = reg_resp.json()["id"]

    route_resp = await client.post(
        "/control/routes",
        json={"path_segment": "echo", "agent_id": agent_id},
        headers=admin_headers,
    )
    assert route_resp.status_code == 201

    # 3. Call message/send
    req_body = {
        "jsonrpc": "2.0",
        "id": 10,
        "method": "message/send",
        "params": {
            "message": {
                "role": "user",
                "kind": "message",
                "messageId": "msg-123",
                "parts": [{"kind": "text", "text": "hello a2a echo"}],
            }
        },
    }

    send_resp = await client.post("/gw/echo/", json=req_body, headers=admin_headers)
    assert send_resp.status_code == 200
    res_data = send_resp.json()

    assert res_data["jsonrpc"] == "2.0"
    assert res_data["id"] == 10
    result = res_data["result"]
    task_id = result["id"]
    assert result["kind"] == "task"
    assert result["status"]["state"] == "completed"
    assert len(result["artifacts"]) >= 1

    # 4. Wait for background writer persistence
    await asyncio.sleep(0.3)

    # 5. Assert tasks row is completed and terminal
    async with async_session_factory() as session:
        stmt_task = select(Task).where(Task.id == task_id)
        task_row = (await session.execute(stmt_task)).scalar_one_or_none()
        assert task_row is not None
        assert task_row.current_state == "completed"
        assert task_row.is_terminal is True

        # 6. Assert exactly one event of kind="task" with artifacts in payload
        stmt_events = select(TaskEvent).where(TaskEvent.task_id == task_id)
        events = (await session.execute(stmt_events)).scalars().all()
        assert len(events) == 1
        ev = events[0]
        assert ev.kind == "task"
        assert ev.seq == 1
        assert ev.is_final is True
        assert "artifacts" in ev.payload["result"]
        assert ev.payload["result"]["artifacts"][0]["name"] == "echo"

