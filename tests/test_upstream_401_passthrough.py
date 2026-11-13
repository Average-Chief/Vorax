import asyncio
import json
import pytest
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from httpx import AsyncClient
from sqlalchemy import select

from app.models import TaskEvent
from app.proxy.httpx_backend import register_test_mount
from tests.conftest import StreamingASGITransport, async_session_factory

# Auth-protected upstream test agent
auth_upstream_app = FastAPI()

AUTH_AGENT_CARD = {
    "name": "Secure Agent",
    "description": "Requires bearer authentication",
    "url": "http://localhost:8104/",
    "version": "0.1.0",
    "protocolVersion": "0.3.0",
    "preferredTransport": "JSONRPC",
    "supportedInterfaces": [{"url": "http://localhost:8104/", "protocolBinding": "JSONRPC"}],
    "capabilities": {"streaming": False, "pushNotifications": False},
    "defaultInputModes": ["text/plain"],
    "defaultOutputModes": ["text/plain"],
    "securitySchemes": {"bearerAuth": {"type": "http", "scheme": "bearer"}},
    "security": [{"bearerAuth": []}],
    "skills": [],
}

@auth_upstream_app.get("/.well-known/agent-card.json")
async def get_card():
    return AUTH_AGENT_CARD

@auth_upstream_app.post("/")
async def handle_rpc(request: Request):
    auth_header = request.headers.get("authorization")
    body = await request.json()
    req_id = body.get("id", 1)

    if auth_header != "Bearer correct_token":
        return JSONResponse(
            status_code=401,
            content={
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -32001, "message": "Upstream unauthorized: invalid agent credential"},
            },
        )

    return {
        "jsonrpc": "2.0",
        "id": req_id,
        "result": {
            "id": "task-secure-1",
            "kind": "task",
            "status": {"state": "completed"},
        },
    }

@pytest.mark.asyncio
async def test_upstream_401_passthrough(client: AsyncClient, admin_headers: dict):
    # 1. Mount auth upstream agent
    register_test_mount("http://localhost:8104", StreamingASGITransport(app=auth_upstream_app))

    # 2. Register agent with deliberately wrong credential
    reg_resp = await client.post(
        "/control/agents",
        json={
            "name": "secure-agent",
            "endpoint_url": "http://localhost:8104",
            "upstream_credential": "Bearer WRONG_TOKEN_123",
        },
        headers=admin_headers,
    )
    assert reg_resp.status_code == 201
    agent_id = reg_resp.json()["id"]

    route_resp = await client.post(
        "/control/routes",
        json={"path_segment": "secure", "agent_id": agent_id},
        headers=admin_headers,
    )
    assert route_resp.status_code == 201

    # 3. Caller sends RPC request through gateway with valid gateway bearer key
    caller_req = {
        "jsonrpc": "2.0",
        "id": 99,
        "method": "message/send",
        "params": {
            "message": {
                "role": "user",
                "kind": "message",
                "parts": [{"kind": "text", "text": "hello"}],
            }
        },
    }

    resp = await client.post("/gw/secure/", json=caller_req, headers=admin_headers)

    # 4. Assert caller got upstream's 401 verbatim
    assert resp.status_code == 401
    body = resp.json()
    assert body["jsonrpc"] == "2.0"
    assert body["id"] == 99
    assert body["error"]["code"] == -32001
    assert "Upstream unauthorized: invalid agent credential" in body["error"]["message"]

    # 5. Assert synthetic gateway.note event "upstream rejected credential" was persisted
    await asyncio.sleep(0.3)

    async with async_session_factory() as session:
        stmt = select(TaskEvent).where(
            TaskEvent.source == "gateway",
            TaskEvent.kind == "gateway.note",
        )
        events = (await session.execute(stmt)).scalars().all()
        assert len(events) >= 1
        note_event = events[-1]
        assert note_event.payload.get("detail") == "upstream rejected credential"
