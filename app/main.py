import logging
import uuid
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.config import settings
from app.database import engine, Base, async_session_maker
from app.models import ApiKey
from app.auth import generate_api_key
from app.control.agents import router as agents_router
from app.control.routes_api import router as routes_router
from app.control.keys import router as keys_router
from app.proxy.card_api import router as proxy_card_router

logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))
logger = logging.getLogger("a2a.gateway")

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("Initializing A2A Gateway...")
    # Create tables if not exist (ensures startup even before alembic run in tests)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Check for bootstrap key
    async with async_session_maker() as session:
        stmt = select(ApiKey).where(ApiKey.is_active == True)
        existing_keys = (await session.execute(stmt)).scalars().all()
        if not existing_keys and not settings.ADMIN_KEY:
            raw_key, prefix, hashed = generate_api_key()
            admin_key = ApiKey(
                id=uuid.uuid4(),
                name="bootstrap-admin",
                key_hash=hashed,
                key_prefix=prefix,
                is_active=True,
            )
            session.add(admin_key)
            await session.commit()
            logger.info("============================================================")
            logger.info("A2A Gateway Bootstrap Admin Key: %s", raw_key)
            logger.info("Use this key with 'Authorization: Bearer <key>' to access control plane.")
            logger.info("============================================================")

    yield
    logger.info("Shutting down A2A Gateway...")
    await engine.dispose()

def create_app() -> FastAPI:
    app = FastAPI(
        title="A2A Gateway",
        description="The easiest self-hosted way to put all your A2A agents behind one secure, observable endpoint.",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Mount control plane routers
    app.include_router(agents_router)
    app.include_router(routes_router)
    app.include_router(keys_router)

    # Mount proxy routers
    app.include_router(proxy_card_router)

    @app.get("/healthz", tags=["health"])
    async def healthz():
        return {"status": "ok"}

    return app

app = create_app()
