import os
import sys

# Set DATABASE_URL before any app imports
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./verify_m1.db"
os.environ["ADMIN_KEY"] = "a2a_m1_verify_key_999888777"
sys.path.insert(0, os.path.abspath("."))

import asyncio
from httpx import AsyncClient, ASGITransport
from samples.echo.server import app as echo_app
from app.main import create_app
from app.models import RegisteredAgent, GatewayRoute
from app.proxy.deps import invalidate_route_cache
from app.auth import invalidate_key_cache

async def run_verification():
    print("Initializing verification...")
    from app.database import engine, Base

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    gw_app = create_app()

    # We use ASGI transport for echo app
    echo_transport = ASGITransport(app=echo_app)
    gw_transport = ASGITransport(app=gw_app)

    async with AsyncClient(transport=echo_transport, base_url="http://localhost:8101") as echo_client:
        # Check echo agent is serving card
        echo_card_resp = await echo_client.get("/.well-known/agent-card.json")
        assert echo_card_resp.status_code == 200
        print("Echo agent card verified directly:", echo_card_resp.json()["name"])

    # Patch fetch_upstream_card or route httpx client through echo_transport
    from unittest.mock import patch
    import app.control.agents

    headers = {"Authorization": "Bearer a2a_m1_verify_key_999888777"}

    async with AsyncClient(transport=gw_transport, base_url="http://localhost:8000") as gw_client:
        # 1. Register agent
        print("1. Registering echo agent via /control/agents...")
        with patch.object(
            app.control.agents,
            "fetch_upstream_card",
            return_value=echo_card_resp.json(),
        ):
            reg_res = await gw_client.post(
                "/control/agents",
                json={"name": "echo", "endpoint_url": "http://localhost:8101"},
                headers=headers,
            )
            print("Registration status:", reg_res.status_code, reg_res.json())
            assert reg_res.status_code == 201
            agent_id = reg_res.json()["id"]

        # 2. Create route
        print("2. Creating route /gw/echo...")
        route_res = await gw_client.post(
            "/control/routes",
            json={"path_segment": "echo", "agent_id": agent_id},
            headers=headers,
        )
        print("Route creation status:", route_res.status_code, route_res.json())
        assert route_res.status_code == 201

        # 3. Fetch card through gateway proxy route
        print("3. Fetching card via /gw/echo/.well-known/agent-card.json...")
        card_res = await gw_client.get("/gw/echo/.well-known/agent-card.json")
        print("Card status:", card_res.status_code)
        card_data = card_res.json()
        print("Card name:", card_data.get("name"))
        assert card_res.status_code == 200
        assert card_data.get("name") == "Echo Agent"

        print("\n Milestone 1 Verification SUCCESSFUL!")

if __name__ == "__main__":
    try:
        asyncio.run(run_verification())
    finally:
        if os.path.exists("./verify_m1.db"):
            try:
                os.remove("./verify_m1.db")
            except Exception:
                pass
