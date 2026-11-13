import asyncio
import os
import uuid
import pytest
import pytest_asyncio
from httpx import AsyncClient, AsyncBaseTransport, Response, Request
from httpx._types import AsyncByteStream
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# Configure test environment before importing app
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test.db"
os.environ["ADMIN_KEY"] = "a2a_testadminkey1234567890abcdef"

from app.config import settings
from app.database import Base, get_db
import app.models  # ensure models loaded
from app.auth import generate_api_key, invalidate_key_cache
from app.proxy.deps import invalidate_route_cache
from app.proxy.httpx_backend import clear_test_mounts
from app.ingest.writer import reset_writer_state
from app.main import create_app

test_engine = create_async_engine("sqlite+aiosqlite:///./test.db", echo=False)
async_session_factory = async_sessionmaker(test_engine, expire_on_commit=False, class_=AsyncSession)

class StreamingASGITransport(AsyncBaseTransport):
    """
    Unbuffered streaming ASGI transport for tests.
    Does not buffer StreamingResponse chunks in memory like standard httpx.ASGITransport.
    """
    def __init__(self, app):
        self.app = app

    async def handle_async_request(self, request: Request) -> Response:
        body = await request.aread()
        req_sent = False
        queue = asyncio.Queue()
        response_started = asyncio.Event()
        status_code = None
        response_headers = None

        scope = {
            "type": "http",
            "asgi": {"version": "3.0"},
            "http_version": "1.1",
            "method": request.method,
            "headers": [(k.lower(), v) for (k, v) in request.headers.raw],
            "scheme": request.url.scheme,
            "path": request.url.path,
            "raw_path": request.url.raw_path.split(b"?")[0],
            "query_string": request.url.query,
            "server": (request.url.host, request.url.port or 80),
            "root_path": "",
        }

        async def receive():
            nonlocal req_sent
            if not req_sent:
                req_sent = True
                return {"type": "http.request", "body": body, "more_body": False}
            while True:
                await asyncio.sleep(10)

        async def send(message):
            nonlocal status_code, response_headers
            if message["type"] == "http.response.start":
                status_code = message["status"]
                response_headers = message.get("headers", [])
                response_started.set()
            elif message["type"] == "http.response.body":
                b = message.get("body", b"")
                more = message.get("more_body", False)
                if b:
                    await queue.put(b)
                if not more:
                    await queue.put(None)

        async def run_app():
            try:
                await self.app(scope, receive, send)
            except Exception as e:
                await queue.put(e)
            finally:
                if not response_started.is_set():
                    response_started.set()

        task = asyncio.create_task(run_app())
        await response_started.wait()

        class Stream(AsyncByteStream):
            async def __aiter__(self):
                while True:
                    chunk = await queue.get()
                    if chunk is None:
                        break
                    if isinstance(chunk, Exception):
                        raise chunk
                    yield chunk

            async def aclose(self):
                task.cancel()

        return Response(status_code or 500, headers=response_headers, stream=Stream())

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
    clear_test_mounts()
    reset_writer_state()
    yield
    invalidate_key_cache()
    invalidate_route_cache()
    clear_test_mounts()
    reset_writer_state()

@pytest_asyncio.fixture
async def db_session():
    async with async_session_factory() as session:
        yield session

@pytest_asyncio.fixture
async def app_instance(db_session):
    app = create_app()

    async def override_get_db():
        async with async_session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    async with app.router.lifespan_context(app):
        yield app

@pytest_asyncio.fixture
async def client(app_instance):
    transport = StreamingASGITransport(app=app_instance)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c

@pytest_asyncio.fixture
def admin_headers():
    return {"Authorization": f"Bearer {settings.ADMIN_KEY}"}
