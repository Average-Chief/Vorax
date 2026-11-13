from typing import Any
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.proxy.deps import (
    resolve_route,
    get_cached_agent_card,
    set_cached_agent_card,
)

router = APIRouter(prefix="/gw", tags=["proxy"])

@router.get("/{route}/.well-known/agent-card.json")
async def get_agent_card(
    route: str,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    resolved = await resolve_route(route, db)
    if not resolved:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Route '{route}' not found")

    cached = get_cached_agent_card(route)
    if cached:
        return cached

    # Attempt upstream refresh
    base_url = resolved.endpoint_url.rstrip("/")
    candidates = [
        f"{base_url}/.well-known/agent-card.json",
        f"{base_url}/.well-known/agent.json",
    ]
    card = None
    timeout = httpx.Timeout(settings.UPSTREAM_CONNECT_TIMEOUT_S)
    async with httpx.AsyncClient(timeout=timeout) as client:
        for url in candidates:
            try:
                resp = await client.get(url)
                if resp.status_code == 200:
                    card = resp.json()
                    break
            except Exception:
                continue

    if card is not None:
        set_cached_agent_card(route, card)
        return card

    # Fallback to stored card if upstream refresh timed out
    if resolved.agent_card:
        set_cached_agent_card(route, resolved.agent_card)
        return resolved.agent_card

    raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Unable to fetch agent card from upstream")

