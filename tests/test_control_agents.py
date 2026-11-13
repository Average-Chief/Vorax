import pytest
from httpx import AsyncClient
from unittest.mock import patch

SAMPLE_CARD = {
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

@pytest.mark.asyncio
async def test_register_agent_unreachable(client: AsyncClient, admin_headers: dict):
    resp = await client.post(
        "/control/agents",
        json={"name": "unreachable-agent", "endpoint_url": "http://127.0.0.1:54321"},
        headers=admin_headers,
    )
    assert resp.status_code == 502
    assert "Failed to fetch agent card" in resp.json()["detail"]

@pytest.mark.asyncio
async def test_register_agent_success_and_lifecycle(client: AsyncClient, admin_headers: dict):
    with patch("app.control.agents.fetch_upstream_card", return_value=SAMPLE_CARD):
        # 1. Register agent
        resp = await client.post(
            "/control/agents",
            json={
                "name": "echo",
                "endpoint_url": "http://localhost:8101",
                "upstream_credential": "Bearer agent_secret",
            },
            headers=admin_headers,
        )
        assert resp.status_code == 201
        agent_data = resp.json()
        agent_id = agent_data["id"]
        assert agent_data["name"] == "echo"
        assert agent_data["agent_card"]["name"] == "Echo Agent"

        # 2. Duplicate name returns 409
        dup_resp = await client.post(
            "/control/agents",
            json={"name": "echo", "endpoint_url": "http://localhost:8101"},
            headers=admin_headers,
        )
        assert dup_resp.status_code == 409

    # 3. List agents
    list_resp = await client.get("/control/agents", headers=admin_headers)
    assert list_resp.status_code == 200
    agents = list_resp.json()
    assert len(agents) >= 1
    found = next(a for a in agents if a["id"] == agent_id)
    assert found["card_summary"]["name"] == "Echo Agent"
    assert found["health"] == "healthy"

    # 4. Get single agent
    get_resp = await client.get(f"/control/agents/{agent_id}", headers=admin_headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == agent_id

    # 5. Create route
    route_resp = await client.post(
        "/control/routes",
        json={"path_segment": "echo", "agent_id": agent_id},
        headers=admin_headers,
    )
    assert route_resp.status_code == 201
    assert route_resp.json()["path_segment"] == "echo"

    # 6. Duplicate route returns 409
    dup_route = await client.post(
        "/control/routes",
        json={"path_segment": "echo", "agent_id": agent_id},
        headers=admin_headers,
    )
    assert dup_route.status_code == 409

    # 7. List routes
    routes_list_resp = await client.get("/control/routes", headers=admin_headers)
    assert routes_list_resp.status_code == 200
    assert any(r["path_segment"] == "echo" for r in routes_list_resp.json())

    # 8. Fetch card through proxy route: /gw/echo/.well-known/agent-card.json
    # Stored card should be returned when upstream is not reached or directly
    card_resp = await client.get("/gw/echo/.well-known/agent-card.json")
    assert card_resp.status_code == 200
    assert card_resp.json()["name"] == "Echo Agent"

    # Second fetch should hit the in-memory cache directly
    card_resp2 = await client.get("/gw/echo/.well-known/agent-card.json")
    assert card_resp2.status_code == 200
    assert card_resp2.json()["name"] == "Echo Agent"

    # 9. Unknown route returns 404
    not_found_resp = await client.get("/gw/nonexistent/.well-known/agent-card.json")
    assert not_found_resp.status_code == 404
