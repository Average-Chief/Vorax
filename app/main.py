import logging
import uuid
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional
from fastapi import FastAPI, Request, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import engine, Base, async_session_maker, get_db

from app.config import settings
from app.database import engine, Base, async_session_maker
from app.models import ApiKey
from app.auth import generate_api_key
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.control.agents import router as agents_router
from app.control.routes_api import router as routes_router
from app.control.keys import router as keys_router
from app.control.tasks_api import router as tasks_router
from app.control.ws import router as ws_router
from app.proxy.card_api import router as proxy_card_router
from app.proxy.gw_api import router as proxy_gw_router
from app.ingest.writer import start_writer_task, stop_writer_task

logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))
logger = logging.getLogger("a2a.gateway")

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("Initializing A2A Gateway...")

    # Enforce non-loopback security check if using default development key
    if settings.ADMIN_KEY == "dev-only-do-not-use-in-prod":
        host = os.environ.get("HOST", "0.0.0.0")
        is_loopback = host in ("127.0.0.1", "localhost", "::1")
        if not is_loopback and not settings.ALLOW_INSECURE_DEV_KEY:
            logger.critical(
                "CRITICAL SECURITY CHECK: Refusing to start on non-loopback interface '%s' with default development "
                "ADMIN_KEY ('dev-only-do-not-use-in-prod'). Set a secure ADMIN_KEY environment variable, or set "
                "ALLOW_INSECURE_DEV_KEY=true to acknowledge the risk for local development.",
                host,
            )
            raise RuntimeError(
                "Refusing to bind on non-loopback interface with default development ADMIN_KEY. "
                "Set a custom ADMIN_KEY or set ALLOW_INSECURE_DEV_KEY=true."
            )

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

    # Start ingest writer task
    writer_task = start_writer_task()

    yield

    logger.info("Shutting down A2A Gateway...")
    await stop_writer_task()
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
    app.include_router(tasks_router)
    app.include_router(ws_router)

    # Mount proxy routers
    app.include_router(proxy_card_router)
    app.include_router(proxy_gw_router)

    @app.get("/healthz", tags=["health"])
    async def healthz():
        return {"status": "ok"}

    @app.get("/ready", tags=["health"])
    async def ready():
        return {"status": "ready"}

    @app.get("/tasks")
    async def get_tasks_alias(
        request: Request,
        state: Optional[str] = Query(None),
        limit: int = Query(100, ge=1, le=500),
        db: AsyncSession = Depends(get_db),
    ):
        accept = request.headers.get("accept", "")
        if "text/html" in accept and not request.query_params.get("limit"):
            index_file = os.path.join(dist_dir, "index.html")
            if os.path.isfile(index_file):
                return FileResponse(index_file)
        from app.control.tasks_api import list_tasks
        return await list_tasks(state=state, limit=limit, db=db)

    # Mount dashboard static files if dist exists
    dist_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "dashboard", "dist")
    assets_dir = os.path.join(dist_dir, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        if full_path:
            target_file = os.path.join(dist_dir, full_path)
            if os.path.isfile(target_file):
                return FileResponse(target_file)
        index_file = os.path.join(dist_dir, "index.html")
        if os.path.isfile(index_file):
            return FileResponse(index_file)
        return {"message": "A2A Gateway API is running. Build dashboard with 'npm run build' in dashboard/ to serve UI."}

    return app

app = create_app()

