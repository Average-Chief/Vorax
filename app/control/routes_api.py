import uuid
import re
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_control_key
from app.database import get_db
from app.models import GatewayRoute, RegisteredAgent
from app.proxy.deps import invalidate_route_cache

router = APIRouter(prefix="/control/routes", tags=["routes"], dependencies=[Depends(require_control_key)])

PATH_REGEX = re.compile(r"^[a-zA-Z0-9_\-]+$")

class RouteCreateRequest(BaseModel):
    path_segment: str
    agent_id: uuid.UUID

    @field_validator("path_segment")
    @classmethod
    def validate_segment(cls, v: str) -> str:
        s = v.strip().strip("/")
        if not s or not PATH_REGEX.match(s):
            raise ValueError("path_segment must be alphanumeric and may contain hyphens and underscores")
        return s

class RouteResponse(BaseModel):
    id: uuid.UUID
    path_segment: str
    agent_id: uuid.UUID
    agent_name: Optional[str] = None
    is_active: bool
    created_at: datetime

@router.post("", response_model=RouteResponse, status_code=status.HTTP_201_CREATED)
async def create_route(
    payload: RouteCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    # Check if agent exists
    agent_stmt = select(RegisteredAgent).where(RegisteredAgent.id == payload.agent_id)
    agent = (await db.execute(agent_stmt)).scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")

    # Check if path_segment is taken
    route_stmt = select(GatewayRoute).where(GatewayRoute.path_segment == payload.path_segment)
    existing_route = (await db.execute(route_stmt)).scalar_one_or_none()
    if existing_route:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Route path_segment already exists")

    route = GatewayRoute(
        id=uuid.uuid4(),
        path_segment=payload.path_segment,
        agent_id=payload.agent_id,
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )
    db.add(route)
    await db.commit()
    await db.refresh(route)
    invalidate_route_cache()

    return RouteResponse(
        id=route.id,
        path_segment=route.path_segment,
        agent_id=route.agent_id,
        agent_name=agent.name,
        is_active=route.is_active,
        created_at=route.created_at,
    )

@router.get("", response_model=list[RouteResponse])
async def list_routes(
    db: AsyncSession = Depends(get_db),
):
    stmt = select(GatewayRoute).options(selectinload(GatewayRoute.agent)).order_by(GatewayRoute.created_at.desc())
    routes = (await db.execute(stmt)).scalars().all()
    return [
        RouteResponse(
            id=r.id,
            path_segment=r.path_segment,
            agent_id=r.agent_id,
            agent_name=r.agent.name if r.agent else None,
            is_active=r.is_active,
            created_at=r.created_at,
        )
        for r in routes
    ]
