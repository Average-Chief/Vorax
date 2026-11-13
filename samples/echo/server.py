import uuid
from datetime import datetime, timezone
from typing import Any, Dict
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI(title="Echo Agent", version="0.1.0")

AGENT_CARD = {
    "name": "Echo Agent",
    "description": "Echoes back input instantly",
    "url": "http://localhost:8101/",
    "version": "0.1.0",
    "protocolVersion": "0.3.0",
    "preferredTransport": "JSONRPC",
    "supportedInterfaces": [{"url": "http://localhost:8101/", "protocolBinding": "JSONRPC"}],
    "capabilities": {"streaming": False, "pushNotifications": False},
    "defaultInputModes": ["text/plain"],
    "defaultOutputModes": ["text/plain"],
    "securitySchemes": {"bearerAuth": {"type": "http", "scheme": "bearer"}},
    "security": [{"bearerAuth": []}],
    "skills": [{"id": "echo", "name": "Echo", "description": "Echoes back inputs", "tags": []}],
}

@app.get("/.well-known/agent-card.json")
@app.get("/.well-known/agent.json")
async def get_card():
    return AGENT_CARD

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

    if method == "message/send":
        message = params.get("message", {})
        parts = message.get("parts", [])
        text_content = ""
        for p in parts:
            if p.get("kind") == "text":
                text_content += p.get("text", "")

        task_id = str(uuid.uuid4())
        context_id = str(uuid.uuid4())
        now_iso = datetime.now(timezone.utc).isoformat()

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
    uvicorn.run(app, host="0.0.0.0", port=8101)

