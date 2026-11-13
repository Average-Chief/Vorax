import asyncio
import os
import sys
import time

sys.path.insert(0, os.path.abspath("."))
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_3am.db"
os.environ["ADMIN_KEY"] = "a2a_3am_test_key_12345"

from httpx import AsyncClient
from app.config import settings
from app.main import create_app
from samples.flaky.server import app as flaky_app
from tests.conftest import StreamingASGITransport
from app.proxy.httpx_backend import register_test_mount

async def run_3am_test():
    print("=" * 60)
    print("3AM TEST: Failure Diagnosis in Under 2 Minutes")
    print("=" * 60)

    # 1. Mount flaky agent
    register_test_mount("http://localhost:8103", StreamingASGITransport(app=flaky_app))

    app = create_app()
    admin_headers = {"Authorization": f"Bearer {settings.ADMIN_KEY}"}

    async with app.router.lifespan_context(app):
        transport = StreamingASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://localhost:8000") as client:
            # Setup agent and route
            reg = await client.post(
                "/control/agents",
                json={"name": "flaky", "endpoint_url": "http://localhost:8103"},
                headers=admin_headers,
            )
            agent_id = reg.json()["id"]
            await client.post(
                "/control/routes",
                json={"path_segment": "flaky", "agent_id": agent_id},
                headers=admin_headers,
            )

            print("\n1. Simulating mid-stream failure with flaky:die...")
            req_body = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "message/stream",
                "params": {
                    "message": {
                        "role": "user",
                        "parts": [{"kind": "text", "text": "directive flaky:die"}],
                    }
                },
            }

            task_id = None
            try:
                async with client.stream(
                    "POST",
                    "/gw/flaky/",
                    json=req_body,
                    headers=admin_headers,
                ) as stream_resp:
                    async for line in stream_resp.aiter_lines():
                        if line.startswith("data:"):
                            payload_str = line[5:].strip()
                            if payload_str:
                                import json
                                d = json.loads(payload_str)
                                if not task_id:
                                    task_id = d.get("result", {}).get("taskId")
            except Exception:
                pass

            assert task_id is not None
            print(f"   Task {task_id} failed mid-stream as expected.")

            # START 3AM TIMER
            print("\n2. Starting 3am Test Diagnostic Timer...")
            t0 = time.perf_counter()

            # Step 1: Open dashboard / triage view
            triage_resp = await client.get("/control/tasks", headers=admin_headers)
            assert triage_resp.status_code == 200
            tasks = triage_resp.json()

            # Find the task - should be in triage immediately
            target_task = next((t for t in tasks if t["id"] == task_id), None)
            assert target_task is not None
            t_triage = time.perf_counter() - t0
            print(f"   Step A: Located task in triage within {t_triage * 1000:.2f} ms")

            # Step 2: One-click into Timeline detail
            timeline_resp = await client.get(f"/control/tasks/{task_id}/timeline", headers=admin_headers)
            assert timeline_resp.status_code == 200
            timeline = timeline_resp.json()
            t_timeline = time.perf_counter() - t0

            # Step 3: Identify exactly where and why it failed
            events = timeline["events"]
            note = next((e for e in events if e["kind"] == "gateway.note"), None)
            assert note is not None
            evidence = note["payload"].get("message") or note["payload"].get("detail")
            t_evidence = time.perf_counter() - t0

            print(f"   Step B: Opened timeline within {t_timeline * 1000:.2f} ms")
            print(f"   Step C: Forensics identified at {t_evidence * 1000:.2f} ms:")
            print(f"           Evidence: \"{evidence}\"")

            total_sec = t_evidence
            print(f"\n3AM Test Elapsed Time: {total_sec:.3f} seconds (Target: < 120s)")
            assert total_sec < 120.0
            print(" PASSED: The 3am test passed in under 2 minutes!")

if __name__ == "__main__":
    try:
        asyncio.run(run_3am_test())
    finally:
        if os.path.exists("./test_3am.db"):
            try:
                os.remove("./test_3am.db")
            except Exception:
                pass
