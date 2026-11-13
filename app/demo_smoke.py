import asyncio
import json
import os
import sys
import time

# Ensure database configured
if not os.environ.get("DATABASE_URL"):
    os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./demo_smoke.db"
if not os.environ.get("ADMIN_KEY"):
    os.environ["ADMIN_KEY"] = "a2a_demo_smoke_adminkey_123456789"

from httpx import AsyncClient
from app.config import settings
from app.main import create_app
from samples.research.server import app as research_app
from tests.conftest import StreamingASGITransport
from app.proxy.httpx_backend import register_test_mount

async def run_smoke():
    print("=" * 60)
    print("A2A Gateway — Demo Smoke Test (Milestone 2)")
    print("=" * 60)

    # 1. Mount research agent at http://localhost:8102
    register_test_mount("http://localhost:8102", StreamingASGITransport(app=research_app))

    app = create_app()
    admin_headers = {"Authorization": f"Bearer {settings.ADMIN_KEY}"}

    async with app.router.lifespan_context(app):
        transport = StreamingASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://localhost:8000") as client:
            print("\n1. Registering research agent...")
            reg_resp = await client.post(
                "/control/agents",
                json={"name": "research", "endpoint_url": "http://localhost:8102"},
                headers=admin_headers,
            )
            assert reg_resp.status_code == 201
            agent_data = reg_resp.json()
            print(f"   Registered: {agent_data['name']} (ID: {agent_data['id']})")

            print("\n2. Creating gateway route /gw/research...")
            route_resp = await client.post(
                "/control/routes",
                json={"path_segment": "research", "agent_id": agent_data["id"]},
                headers=admin_headers,
            )
            assert route_resp.status_code == 201
            print("   Route created: /gw/research -> research agent")

            print("\n3. Submitting streaming task to /gw/research/...")
            req_body = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "message/stream",
                "params": {
                    "message": {
                        "role": "user",
                        "kind": "message",
                        "parts": [{"kind": "text", "text": "Synthesize the frontier of LLM gateways"}],
                    }
                },
            }

            task_id = None
            events_wire = []
            t_start = time.monotonic()

            async with client.stream(
                "POST",
                "/gw/research/",
                json=req_body,
                headers=admin_headers,
            ) as stream_resp:
                assert stream_resp.status_code == 200
                print(f"   Connected! Stream status: {stream_resp.status_code} ({stream_resp.headers.get('content-type')})")
                print("   Receiving live SSE frames:\n")

                async for line in stream_resp.aiter_lines():
                    if line.startswith("data:"):
                        payload_str = line[5:].strip()
                        if payload_str:
                            data = json.loads(payload_str)
                            events_wire.append(data)
                            res = data.get("result", {})
                            if not task_id:
                                task_id = res.get("taskId")
                            
                            elapsed = (time.monotonic() - t_start) * 1000
                            kind = res.get("kind", "")
                            status_obj = res.get("status", {})
                            state = status_obj.get("state", "")
                            msg_parts = status_obj.get("message", {}).get("parts", [])
                            msg_text = msg_parts[0].get("text", "") if msg_parts else ""
                            if kind == "artifact-update":
                                msg_text = f"Artifact: {res.get('artifact', {}).get('name')}"

                            print(f"   [+ {elapsed:6.1f} ms] kind={kind:15} state={state:10} | {msg_text}")

            print(f"\n   Total events received over wire: {len(events_wire)}")
            assert task_id is not None
            assert len(events_wire) >= 9

            # Wait for background writer queue drain
            await asyncio.sleep(0.4)

            print("\n4. Fetching reconstructed timeline from /control/tasks/{id}/timeline...")
            timeline_resp = await client.get(f"/control/tasks/{task_id}/timeline", headers=admin_headers)
            assert timeline_resp.status_code == 200
            timeline = timeline_resp.json()
            task = timeline["task"]
            events = timeline["events"]

            print("-" * 75)
            print(f"Task ID:       {task['id']}")
            print(f"State:         {task['current_state']} (Terminal: {task['is_terminal']})")
            print(f"Started At:    {task['started_at']}")
            print(f"Last Event At: {task['last_event_at']}")
            print("-" * 75)
            print(f"{'Seq':<5} | {'Latency':<10} | {'Source':<10} | {'Kind':<16} | {'State':<12} | {'Preview'}")
            print("-" * 75)

            artifact_found = None
            for e in events:
                payload = e["payload"].get("result", e["payload"])
                preview = ""
                if "status" in payload and "message" in payload["status"]:
                    parts = payload["status"]["message"].get("parts", [])
                    if parts:
                        preview = parts[0].get("text", "")
                elif "artifact" in payload:
                    artifact_found = payload["artifact"]
                    preview = f"Artifact '{artifact_found.get('name')}'"

                lat_str = f"{e.get('latency_ms', 0)} ms"
                print(f"{e['seq']:<5} | {lat_str:<10} | {e['source']:<10} | {str(e['kind']):<16} | {str(e['state']):<12} | {preview[:35]}")

            print("-" * 75)
            if artifact_found:
                print(f"\nArtifact Captured: {artifact_found.get('name')}")
                for p in artifact_found.get("parts", []):
                    print(f"   Content preview: {p.get('text', '')[:100]}...")

            assert len(events) >= 9
            print("\n Demo smoke verification successful! All criteria satisfied.")

if __name__ == "__main__":
    try:
        asyncio.run(run_smoke())
    finally:
        if os.path.exists("./demo_smoke.db"):
            try:
                os.remove("./demo_smoke.db")
            except Exception:
                pass
