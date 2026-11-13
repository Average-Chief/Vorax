import secrets
import logging
from typing import Optional
import bcrypt
from fastapi import Request, HTTPException, Security, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models import ApiKey

logger = logging.getLogger("a2a.auth")

security_bearer = HTTPBearer(auto_error=False)

# In-memory token cache: raw_token -> bool
_key_validation_cache: dict[str, bool] = {}

def invalidate_key_cache() -> None:
    _key_validation_cache.clear()

def generate_api_key() -> tuple[str, str, str]:
    """Generates (raw_key, prefix, key_hash)"""
    token_suffix = secrets.token_urlsafe(32)
    raw_key = f"a2a_{token_suffix}"
    prefix = raw_key[:8]
    hashed = bcrypt.hashpw(raw_key.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    return raw_key, prefix, hashed

def hash_key(key: str) -> str:
    return bcrypt.hashpw(key.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def check_key(raw_key: str, key_hash: str) -> bool:
    try:
        return bcrypt.checkpw(raw_key.encode("utf-8"), key_hash.encode("utf-8"))
    except Exception:
        return False

async def verify_gateway_key(token: Optional[str], db: AsyncSession) -> bool:
    if not token:
        return False

    # Check ADMIN_KEY
    if settings.ADMIN_KEY and token == settings.ADMIN_KEY:
        return True

    # Check in-memory cache
    if token in _key_validation_cache:
        return _key_validation_cache[token]

    # Query active keys
    stmt = select(ApiKey).where(ApiKey.is_active == True)
    result = await db.execute(stmt)
    active_keys = result.scalars().all()

    for key_obj in active_keys:
        if check_key(token, key_obj.key_hash):
            _key_validation_cache[token] = True
            return True

    _key_validation_cache[token] = False
    return False

async def require_control_key(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer),
    db: AsyncSession = Depends(get_db),
) -> str:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: invalid gateway key",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    is_valid = await verify_gateway_key(token, db)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: invalid gateway key",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return token

