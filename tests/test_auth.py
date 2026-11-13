import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_auth_missing_header(client: AsyncClient):
    resp = await client.get("/control/agents")
    assert resp.status_code == 401
    assert "Unauthorized" in resp.json()["detail"]

@pytest.mark.asyncio
async def test_auth_invalid_token(client: AsyncClient):
    resp = await client.get("/control/agents", headers={"Authorization": "Bearer invalid_key"})
    assert resp.status_code == 401
    assert "Unauthorized" in resp.json()["detail"]

@pytest.mark.asyncio
async def test_auth_admin_key(client: AsyncClient, admin_headers: dict):
    resp = await client.get("/control/agents", headers=admin_headers)
    assert resp.status_code == 200

@pytest.mark.asyncio
async def test_auth_issued_key_and_revocation(client: AsyncClient, admin_headers: dict):
    # Issue a new key via admin
    create_resp = await client.post(
        "/control/keys",
        json={"name": "test-client-key"},
        headers=admin_headers,
    )
    assert create_resp.status_code == 201
    data = create_resp.json()
    new_key = data["key"]
    key_id = data["id"]
    prefix = data["prefix"]

    assert new_key.startswith("a2a_")
    assert prefix == new_key[:8]

    # Test using the new key
    client_headers = {"Authorization": f"Bearer {new_key}"}
    resp = await client.get("/control/agents", headers=client_headers)
    assert resp.status_code == 200

    # Fast-path cache test (hit again)
    resp2 = await client.get("/control/agents", headers=client_headers)
    assert resp2.status_code == 200

    # Revoke key
    del_resp = await client.delete(f"/control/keys/{key_id}", headers=admin_headers)
    assert del_resp.status_code == 200

    # Verify revoked key fails immediately
    resp_after = await client.get("/control/agents", headers=client_headers)
    assert resp_after.status_code == 401

