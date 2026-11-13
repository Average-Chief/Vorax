from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.proxy.deps import (
    resolve_route,
    get_cached_agent_card,
    set_cached_agent_card,
)
from app.proxy.httpx_backend import fetch_upstream_card

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
    card = None
    try:
        card = await fetch_upstream_card(resolved.endpoint_url)
    except Exception:
        pass

    if card is not None:
        set_cached_agent_card(route, card)
        return card

    # Fallback to stored card if upstream refresh timed out
    if resolved.agent_card:
        set_cached_agent_card(route, resolved.agent_card)
        return resolved.agent_card

    raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Unable to fetch agent card from upstream")

