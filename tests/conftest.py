import asyncio
import os
import uuid
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# Configure test environment before importing app
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test.db"
os.environ["ADMIN_KEY"] = "a2a_testadminkey1234567890abcdef"

from app.config import settings
from app.database import Base, get_db
import app.models  # ensure models loaded
from app.auth import generate_api_key, invalidate_key_cache
from app.proxy.deps import invalidate_route_cache
from app.main import create_app

test_engine = create_async_engine("sqlite+aiosqlite:///./test.db", echo=False)
test_session_maker = async_sessionmaker(test_engine, expire_on_commit=False, class_=AsyncSession)

@pytest_asyncio.fixture(autouse=True)
async def init_test_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest_asyncio.fixture(autouse=True)
async def reset_state():
    invalidate_key_cache()
    invalidate_route_cache()
    yield
    invalidate_key_cache()
    invalidate_route_cache()

@pytest_asyncio.fixture
async def db_session():
    async with test_session_maker() as session:
        yield session

@pytest_asyncio.fixture
async def app_instance(db_session):
    app = create_app()

    async def override_get_db():
        async with test_session_maker() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    return app

@pytest_asyncio.fixture
async def client(app_instance):
    transport = ASGITransport(app=app_instance)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c

@pytest_asyncio.fixture
def admin_headers():
    return {"Authorization": f"Bearer {settings.ADMIN_KEY}"}
