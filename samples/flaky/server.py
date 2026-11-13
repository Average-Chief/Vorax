import asyncio
import json
import uuid
from datetime import datetime, timezone
from typing import AsyncIterator, Any
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse

app = FastAPI(title="Flaky Agent", version="0.1.0")

AGENT_CARD = {
    "name": "Flaky Agent",
    "description": "Simulates transient failures and connection drops",
    "url": "http://localhost:8103/",
    "version": "0.1.0",
    "protocolVersion": "0.3.0",
    "preferredTransport": "JSONRPC",
    "supportedInterfaces": [{"url": "http://localhost:8103/", "protocolBinding": "JSONRPC"}],
    "capabilities": {"streaming": True, "pushNotifications": False},
    "defaultInputModes": ["text/plain"],
    "defaultOutputModes": ["text/plain"],
    "securitySchemes": {"bearerAuth": {"type": "http", "scheme": "bearer"}},
    "security": [{"bearerAuth": []}],
    "skills": [{"id": "flaky", "name": "Flaky", "description": "Flaky behavior simulation", "tags": []}],
}

@app.get("/.well-known/agent-card.json")
@app.get("/.well-known/agent.json")
async def get_card():
    return AGENT_CARD

def _rpc_result(req_id: Any, result: dict) -> dict:
    return {
        "jsonrpc": "2.0",
        "id": req_id,
        "result": result,
    }

async def generate_flaky_stream(req_id: Any, task_id: str, context_id: str) -> AsyncIterator[bytes]:
    now = lambda: datetime.now(timezone.utc).isoformat()

    # Event 1
    ev1 = _rpc_result(
        req_id,
        {
            "taskId": task_id,
            "contextId": context_id,
            "kind": "status-update",
            "status": {
                "state": "submitted",
                "message": {
                    "role": "agent",
                    "kind": "message",
                    "messageId": f"msg-{uuid.uuid4().hex[:6]}",
                    "parts": [{"kind": "text", "text": "Task submitted"}],
                },
                "timestamp": now(),
            },
            "final": False,
        },
    )
    yield f"data: {json.dumps(ev1)}\n\n".encode("utf-8")
    await asyncio.sleep(0.1)

    # Event 2
    ev2 = _rpc_result(
        req_id,
        {
            "taskId": task_id,
            "contextId": context_id,
            "kind": "status-update",
            "status": {
                "state": "working",
                "message": {
                    "role": "agent",
                    "kind": "message",
                    "messageId": f"msg-{uuid.uuid4().hex[:6]}",
                    "parts": [{"kind": "text", "text": "Step 1 in progress"}],
                },
                "timestamp": now(),
            },
            "final": False,
        },
    )
    yield f"data: {json.dumps(ev2)}\n\n".encode("utf-8")
    await asyncio.sleep(0.1)

    # Event 3
    ev3 = _rpc_result(
        req_id,
        {
            "taskId": task_id,
            "contextId": context_id,
            "kind": "status-update",
            "status": {
                "state": "working",
                "message": {
                    "role": "agent",
                    "kind": "message",
                    "messageId": f"msg-{uuid.uuid4().hex[:6]}",
                    "parts": [{"kind": "text", "text": "Step 2: failure imminent"}],
                },
                "timestamp": now(),
            },
            "final": False,
        },
    )
    yield f"data: {json.dumps(ev3)}\n\n".encode("utf-8")
    await asyncio.sleep(0.1)

    # Abruptly terminate connection
    raise ConnectionResetError("Simulated upstream connection drop mid-stream")

@app.post("/")
async def handle_rpc(request: Request):
    payload = await request.json()
    req_id = payload.get("id", 1)
    method = payload.get("method")
    params = payload.get("params", {})

    message = params.get("message", {})
    parts = message.get("parts", [])
    text_content = ""
    for p in parts:
        if p.get("kind") == "text":
            text_content += p.get("text", "")

    task_id = str(uuid.uuid4())
    context_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    if "flaky:die" in text_content:
        if method == "message/stream":
            return StreamingResponse(
                generate_flaky_stream(req_id, task_id, context_id),
                media_type="text/event-stream",
                headers={"Cache-Control": "no-cache"},
            )
        else:
            raise ConnectionResetError("flaky:die requested")

    # Default echo behavior if not flaky:die
    if method == "message/send":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "id": task_id,
                "contextId": context_id,
                "kind": "task",
                "status": {"state": "completed", "timestamp": now_iso},
                "artifacts": [
                    {
                        "artifactId": f"art-{task_id[:8]}",
                        "name": "echo",
                        "parts": [{"kind": "text", "text": f"echo: {text_content}"}],
                    }
                ],
                "history": [],
            },
        }

    return {
        "jsonrpc": "2.0",
        "id": req_id,
        "error": {"code": -32601, "message": "Method not found"},
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8103)
