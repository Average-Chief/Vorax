import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_control_key, generate_api_key, invalidate_key_cache
from app.database import get_db
from app.models import ApiKey

router = APIRouter(prefix="/control/keys", tags=["keys"], dependencies=[Depends(require_control_key)])

class KeyCreateRequest(BaseModel):
    name: str

class KeyCreateResponse(BaseModel):
    id: uuid.UUID
    name: str
    prefix: str
    key: str
    created_at: datetime

class KeyListItem(BaseModel):
    id: uuid.UUID
    name: str
    key_prefix: str
    is_active: bool
    created_at: datetime

@router.post("", response_model=KeyCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_key(
    payload: KeyCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    raw_key, prefix, hashed = generate_api_key()
    api_key = ApiKey(
        id=uuid.uuid4(),
        name=payload.name,
        key_hash=hashed,
        key_prefix=prefix,
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )
    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)
    invalidate_key_cache()

    return KeyCreateResponse(
        id=api_key.id,
        name=api_key.name,
        prefix=api_key.key_prefix,
        key=raw_key,
        created_at=api_key.created_at,
    )

@router.get("", response_model=list[KeyListItem])
async def list_keys(
    db: AsyncSession = Depends(get_db),
):
    stmt = select(ApiKey).where(ApiKey.is_active == True).order_by(ApiKey.created_at.desc())
    keys = (await db.execute(stmt)).scalars().all()
    return [
        KeyListItem(
            id=k.id,
            name=k.name,
            key_prefix=k.key_prefix,
            is_active=k.is_active,
            created_at=k.created_at,
        )
        for k in keys
    ]

@router.delete("/{key_id}", status_code=status.HTTP_200_OK)
async def delete_key(
    key_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(ApiKey).where(ApiKey.id == key_id)
    key_obj = (await db.execute(stmt)).scalar_one_or_none()
    if not key_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found")

    key_obj.is_active = False
    await db.commit()
    invalidate_key_cache()
    return {"ok": True}
