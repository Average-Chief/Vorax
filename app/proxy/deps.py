import time
import uuid
from dataclasses import dataclass
from typing import Optional, Any
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import GatewayRoute, RegisteredAgent

@dataclass
class ResolvedRoute:
    route_id: uuid.UUID
    path_segment: str
    agent_id: uuid.UUID
    endpoint_url: str
    upstream_credential: Optional[str]
    agent_card: dict[str, Any]

# Cache: path_segment -> (expire_time, Optional[ResolvedRoute])
_route_cache: dict[str, tuple[float, Optional[ResolvedRoute]]] = {}

# Card cache: route_or_agent -> (expire_time, card_dict)
_card_cache: dict[str, tuple[float, dict[str, Any]]] = {}

def invalidate_route_cache() -> None:
    _route_cache.clear()
    _card_cache.clear()

async def resolve_route(path_segment: str, db: AsyncSession) -> Optional[ResolvedRoute]:
    now = time.monotonic()
    if path_segment in _route_cache:
        expire_at, cached = _route_cache[path_segment]
        if now < expire_at:
            return cached

    stmt = (
        select(GatewayRoute)
        .options(selectinload(GatewayRoute.agent))
        .where(GatewayRoute.path_segment == path_segment, GatewayRoute.is_active == True)
    )
    result = await db.execute(stmt)
    route = result.scalar_one_or_none()

    if not route or not route.agent:
        _route_cache[path_segment] = (now + settings.CARD_CACHE_TTL_S, None)
        return None

    resolved = ResolvedRoute(
        route_id=route.id,
        path_segment=route.path_segment,
        agent_id=route.agent.id,
        endpoint_url=route.agent.endpoint_url,
        upstream_credential=route.agent.upstream_credential,
        agent_card=route.agent.agent_card,
    )
    _route_cache[path_segment] = (now + settings.CARD_CACHE_TTL_S, resolved)
    return resolved

def get_cached_agent_card(key: str) -> Optional[dict[str, Any]]:
    now = time.monotonic()
    if key in _card_cache:
        expire_at, card = _card_cache[key]
        if now < expire_at:
            return card
    return None

def set_cached_agent_card(key: str, card: dict[str, Any]) -> None:
    now = time.monotonic()
    _card_cache[key] = (now + settings.CARD_CACHE_TTL_S, card)

