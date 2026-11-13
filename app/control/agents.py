import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, HttpUrl
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_control_key
from app.config import settings
from app.database import get_db
from app.models import RegisteredAgent
from app.proxy.httpx_backend import fetch_upstream_card

router = APIRouter(prefix="/control/agents", tags=["agents"], dependencies=[Depends(require_control_key)])

class AgentCreateRequest(BaseModel):
    name: str
    endpoint_url: str
    upstream_credential: Optional[str] = None

class CardSummary(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    version: Optional[str] = None
    capabilities: Optional[dict[str, Any]] = None

class AgentListItem(BaseModel):
    id: uuid.UUID
    name: str
    endpoint_url: str
    health: str
    card_summary: CardSummary
    created_at: datetime

class AgentDetail(BaseModel):
    id: uuid.UUID
    name: str
    endpoint_url: str
    agent_card: dict[str, Any]
    upstream_credential: Optional[str] = None
    created_at: datetime

async def get_agent_card_safe(endpoint_url: str) -> dict[str, Any]:
    try:
        return await fetch_upstream_card(endpoint_url)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch agent card from upstream: {e}",
        )

@router.post("", response_model=AgentDetail, status_code=status.HTTP_201_CREATED)
async def register_agent(
    payload: AgentCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    # Check if name is taken
    stmt = select(RegisteredAgent).where(RegisteredAgent.name == payload.name)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Agent with this name already exists")

    # Fetch agent card
    card = await get_agent_card_safe(payload.endpoint_url)

    agent = RegisteredAgent(
        id=uuid.uuid4(),
        name=payload.name,
        endpoint_url=payload.endpoint_url,
        agent_card=card,
        upstream_credential=payload.upstream_credential,
        created_at=datetime.now(timezone.utc),
    )
    db.add(agent)
    await db.commit()
    await db.refresh(agent)
    return agent

@router.get("", response_model=list[AgentListItem])
async def list_agents(
    db: AsyncSession = Depends(get_db),
):
    stmt = select(RegisteredAgent).order_by(RegisteredAgent.created_at.desc())
    agents = (await db.execute(stmt)).scalars().all()
    now = datetime.now(timezone.utc)
    res = []
    for a in agents:
        card = a.agent_card or {}
        summary = CardSummary(
            name=card.get("name"),
            description=card.get("description"),
            version=card.get("version"),
            capabilities=card.get("capabilities"),
        )
        # Health is healthy if created within 60s or agent is present
        # More nuanced proxy health will update when proxy requests are tracked
        is_recent = (now - a.created_at.replace(tzinfo=timezone.utc if a.created_at.tzinfo is None else a.created_at.tzinfo)) < timedelta(seconds=60)
        res.append(
            AgentListItem(
                id=a.id,
                name=a.name,
                endpoint_url=a.endpoint_url,
                health="healthy" if is_recent else "gray",
                card_summary=summary,
                created_at=a.created_at,
            )
        )
    return res

@router.get("/{agent_id}", response_model=AgentDetail)
async def get_agent(
    agent_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(RegisteredAgent).where(RegisteredAgent.id == agent_id)
    agent = (await db.execute(stmt)).scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
    return agent

