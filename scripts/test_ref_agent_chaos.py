import asyncio
import httpx
import json
import os
import signal
import sys
import time

async def main():
    gateway_url = "http://localhost:8000/gw/ref-stream/"
    token = "dev-only-do-not-use-in-prod"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    body = {
        "jsonrpc": "2.0",
        "id": "chaos-test-1",
        "method": "message/stream",
        "params": {
            "message": {
                "messageId": "msg-chaos-1",
                "role": "user",
                "parts": [{"kind": "text", "text": "Chaos test abrupt disconnect"}]
            }
        }
    }

    print("Submitting streaming request through gateway...")
    task_id = None
    chunks_received = 0

    # Find the PID of scripts/run_ref_streaming.py
    import subprocess
    ps_out = subprocess.check_output(["pgrep", "-f", "run_ref_streaming.py"]).decode().strip().split()
    print(f"Target streaming agent PIDs: {ps_out}")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            async with client.stream("POST", gateway_url, headers=headers, json=body) as response:
                print(f"Connected to gateway. Status: {response.status_code}")
                async for chunk in response.aiter_lines():
                    if not chunk:
                        continue
                    chunks_received += 1
                    print(f"Received chunk {chunks_received}: {chunk[:80]}...")
                    if "taskId" in chunk or '"id":' in chunk:
                        try:
                            data = json.loads(chunk.replace("data: ", ""))
                            res = data.get("result", {})
                            tid = res.get("id") or res.get("taskId")
                            if tid:
                                task_id = tid
                        except Exception:
                            pass

                    # Kill the streaming agent process after receiving 2 chunks
                    if chunks_received == 2:
                        print(f"--> Abruptly killing agent process(es): {ps_out}")
                        for pid_str in ps_out:
                            try:
                                os.kill(int(pid_str), signal.SIGKILL)
                            except ProcessLookupError:
                                pass
    except Exception as e:
        print(f"Client caught expected disconnect/exception: {e}")

    print(f"\nTask ID tracked: {task_id}")
    time.sleep(1.0)  # Allow gateway writer to finish persisting queue

    # Query gateway timeline
    async with httpx.AsyncClient() as client:
        timeline_url = f"http://localhost:8000/control/tasks/{task_id}/timeline"
        res = await client.get(timeline_url, headers=headers)
        if res.status_code == 200:
            timeline = res.json()
            print("\nTimeline query succeeded:")
            print(f"Task state: {timeline['task']['current_state']}")
            print(f"Is terminal: {timeline['task']['is_terminal']}")
            print(f"Error summary: {timeline['task']['error_summary']}")
            print(f"Events recorded ({len(timeline['events'])}):")
            for e in timeline['events']:
                print(f"  seq={e['seq']} source={e['source']:<10} kind={e['kind']:<15} state={str(e['state']):<10} latency={e['latency_ms']}ms")
        else:
            print(f"Timeline query failed: {res.status_code} {res.text}")

if __name__ == "__main__":
    asyncio.run(main())

