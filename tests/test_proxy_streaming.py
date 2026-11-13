import asyncio
import json
import statistics
import time
import pytest
from httpx import AsyncClient, ASGITransport

from app.proxy.httpx_backend import register_test_mount
from tests.conftest import StreamingASGITransport
from samples.research.server import app as research_app

@pytest.mark.asyncio
async def test_proxy_streaming_gap_timing_and_persistence(client: AsyncClient, admin_headers: dict):
    # 1. Register test mount for research agent
    register_test_mount("http://localhost:8102", StreamingASGITransport(app=research_app))

    # 2. Register agent and create route
    reg_resp = await client.post(
        "/control/agents",
        json={"name": "research", "endpoint_url": "http://localhost:8102"},
        headers=admin_headers,
    )
    assert reg_resp.status_code == 201
    agent_id = reg_resp.json()["id"]

    route_resp = await client.post(
        "/control/routes",
        json={"path_segment": "research", "agent_id": agent_id},
        headers=admin_headers,
    )
    assert route_resp.status_code == 201

    # 3. Stream request through gateway
    req_body = {
        "jsonrpc": "2.0",
        "id": 100,
        "method": "message/stream",
        "params": {
            "message": {
                "role": "user",
                "kind": "message",
                "messageId": "m-client-1",
                "parts": [{"kind": "text", "text": "perform research on quantum computing"}],
            }
        },
    }

    arrival_times = []
    events_received = []
    task_id = None

    async with client.stream(
        "POST",
        "/gw/research/",
        json=req_body,
        headers=admin_headers,
    ) as stream_resp:
        assert stream_resp.status_code == 200
        assert "text/event-stream" in stream_resp.headers["content-type"]

        async for line in stream_resp.aiter_lines():
            if line.startswith("data:"):
                now = time.monotonic()
                payload_str = line[5:].strip()
                if payload_str:
                    data = json.loads(payload_str)
                    arrival_times.append(now)
                    events_received.append(data)
                    result = data.get("result", {})
                    if not task_id:
                        task_id = result.get("taskId")

    # Assert client receives >= 9 events
    assert len(events_received) >= 9, f"Expected >= 9 events, got {len(events_received)}"
    assert task_id is not None

    # Assert inter-event arrival gaps
    # Gaps between arrivals (event 1 is initial, events 2..9 have 500ms sleep)
    gaps_ms = [
        (arrival_times[i] - arrival_times[i - 1]) * 1000
        for i in range(1, len(arrival_times))
    ]
    median_gap = statistics.median(gaps_ms)
    print(f"Gaps (ms): {gaps_ms}, Median gap: {median_gap:.1f}ms")

    # Median inter-event arrival gap must be in 400-700ms (proving unbuffered stream)
    assert 400 <= median_gap <= 700, f"Expected median gap in [400, 700]ms, got {median_gap}ms"

    # Final event state must be completed
    final_ev = events_received[-1]["result"]
    assert final_ev["kind"] == "status-update"
    assert final_ev["status"]["state"] == "completed"
    assert final_ev["final"] is True

    # 4. Wait for queue persistence and verify timeline
    # Give writer brief moment to flush
    await asyncio.sleep(0.3)

    timeline_resp = await client.get(f"/control/tasks/{task_id}/timeline", headers=admin_headers)
    assert timeline_resp.status_code == 200
    timeline = timeline_resp.json()

    assert timeline["task"]["id"] == task_id
    assert timeline["task"]["current_state"] == "completed"
    assert timeline["task"]["is_terminal"] is True

    persisted_events = timeline["events"]
    assert len(persisted_events) == len(events_received)

    # Verify contiguous seq starting at 1
    seqs = [e["seq"] for e in persisted_events]
    assert seqs == list(range(1, len(persisted_events) + 1))
