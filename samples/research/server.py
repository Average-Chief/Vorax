import asyncio
import json
import uuid
from datetime import datetime, timezone
from typing import AsyncIterator, Any
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, JSONResponse

app = FastAPI(title="Research Agent", version="0.1.0")

AGENT_CARD = {
    "name": "Research Agent",
    "description": "Performs deep multi-step research and generates reports",
    "url": "http://localhost:8102/",
    "version": "0.1.0",
    "protocolVersion": "0.3.0",
    "preferredTransport": "JSONRPC",
    "supportedInterfaces": [{"url": "http://localhost:8102/", "protocolBinding": "JSONRPC"}],
    "capabilities": {"streaming": True, "pushNotifications": False},
    "defaultInputModes": ["text/plain"],
    "defaultOutputModes": ["text/plain"],
    "securitySchemes": {"bearerAuth": {"type": "http", "scheme": "bearer"}},
    "security": [{"bearerAuth": []}],
    "skills": [{"id": "research", "name": "Research", "description": "Researches a topic", "tags": []}],
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

async def generate_research_stream(req_id: Any, task_id: str, context_id: str) -> AsyncIterator[bytes]:
    now = lambda: datetime.now(timezone.utc).isoformat()

    # Event 1: submitted
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
                    "parts": [{"kind": "text", "text": "Research task received"}],
                },
                "timestamp": now(),
            },
            "final": False,
        },
    )
    yield f"data: {json.dumps(ev1)}\n\n".encode("utf-8")

    # Events 2..7: 6 working steps, 500ms apart
    steps = [
        "Analyzing research topic",
        "Searching academic sources",
        "Synthesizing retrieved documents",
        "Formulating analytical model",
        "Drafting key findings and recommendations",
        "Finalizing research summary",
    ]

    for idx, step_desc in enumerate(steps, 1):
        await asyncio.sleep(0.5)
        ev = _rpc_result(
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
                        "parts": [{"kind": "text", "text": f"Step {idx}/6: {step_desc}"}],
                    },
                    "timestamp": now(),
                },
                "final": False,
            },
        )
        yield f"data: {json.dumps(ev)}\n\n".encode("utf-8")

    # Event 8: artifact-update
    await asyncio.sleep(0.5)
    ev_artifact = _rpc_result(
        req_id,
        {
            "taskId": task_id,
            "contextId": context_id,
            "kind": "artifact-update",
            "artifact": {
                "artifactId": f"art-{task_id[:8]}",
                "name": "research_report.md",
                "parts": [
                    {
                        "kind": "text",
                        "text": "# Research Report\n\nAll 6 phases executed successfully with verified references.",
                    }
                ],
            },
            "append": False,
            "lastChunk": True,
            "final": False,
        },
    )
    yield f"data: {json.dumps(ev_artifact)}\n\n".encode("utf-8")

    # Event 9: final completed status-update
    await asyncio.sleep(0.5)
    ev_complete = _rpc_result(
        req_id,
        {
            "taskId": task_id,
            "contextId": context_id,
            "kind": "status-update",
            "status": {
                "state": "completed",
                "message": {
                    "role": "agent",
                    "kind": "message",
                    "messageId": f"msg-{uuid.uuid4().hex[:6]}",
                    "parts": [{"kind": "text", "text": "Research complete."}],
                },
                "timestamp": now(),
            },
            "final": True,
        },
    )
    yield f"data: {json.dumps(ev_complete)}\n\n".encode("utf-8")

@app.post("/")
async def handle_rpc(request: Request):
    try:
        payload = await request.json()
    except Exception:
        return JSONResponse(
            status_code=400,
            content={
                "jsonrpc": "2.0",
                "id": None,
                "error": {"code": -32700, "message": "Parse error: invalid JSON payload"},
            },
        )
    req_id = payload.get("id", 1)
    method = payload.get("method")
    params = payload.get("params", {})

    task_id = params.get("taskId") or str(uuid.uuid4())
    context_id = params.get("contextId") or str(uuid.uuid4())

    if method == "message/stream":
        return StreamingResponse(
            generate_research_stream(req_id, task_id, context_id),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache"},
        )

    if method == "message/send":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "id": task_id,
                "contextId": context_id,
                "kind": "task",
                "status": {"state": "completed", "timestamp": datetime.now(timezone.utc).isoformat()},
                "artifacts": [
                    {
                        "artifactId": f"art-{task_id[:8]}",
                        "name": "research_report.md",
                        "parts": [{"kind": "text", "text": "# Research Report\n\nInstant research summary."}],
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
    uvicorn.run(app, host="0.0.0.0", port=8102)
