import asyncio
import json
import pytest
from unittest.mock import patch
from starlette.testclient import TestClient

from app.main import create_app
from app.database import get_db
from tests.conftest import async_session_factory

class InMemoryRedisPubSubBroker:
    def __init__(self):
        self.subscribers: dict[str, set[asyncio.Queue]] = {}

    def subscribe(self, channel: str, queue: asyncio.Queue):
        if channel not in self.subscribers:
            self.subscribers[channel] = set()
        self.subscribers[channel].add(queue)

    def unsubscribe(self, channel: str, queue: asyncio.Queue):
        if channel in self.subscribers and queue in self.subscribers[channel]:
            self.subscribers[channel].remove(queue)

    async def publish(self, channel: str, data: str):
        if channel in self.subscribers:
            for q in list(self.subscribers[channel]):
                await q.put({"type": "message", "channel": channel, "data": data})

class MockPubSub:
    def __init__(self, broker: InMemoryRedisPubSubBroker):
        self.broker = broker
        self.queue = asyncio.Queue()

    async def subscribe(self, channel: str):
        self.broker.subscribe(channel, self.queue)

    async def listen(self):
        while True:
            msg = await self.queue.get()
            yield msg

    async def unsubscribe(self, channel: str):
        self.broker.unsubscribe(channel, self.queue)

    async def aclose(self):
        pass

class MockRedisClient:
    def __init__(self, broker: InMemoryRedisPubSubBroker):
        self.broker = broker

    def pubsub(self):
        return MockPubSub(self.broker)

    async def publish(self, channel: str, data: str):
        await self.broker.publish(channel, data)

    async def aclose(self):
        pass

def test_ws_fanout_live_and_reconnect():
    broker = InMemoryRedisPubSubBroker()

    def mock_from_url(*args, **kwargs):
        return MockRedisClient(broker)

    app = create_app()

    async def override_get_db():
        async with async_session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    fake_event_1 = {
        "type": "task_event",
        "task_id": "t-task-1",
        "kind": "status-update",
        "state": "working",
        "is_final": False,
        "seq": 7,
        "latency_ms": 1503,
        "observed_at": "2026-11-13T10:00:00Z",
    }
    fake_raw_1 = json.dumps(fake_event_1)

    fake_event_2 = {
        "type": "task_event",
        "task_id": "t-task-2",
        "kind": "status-update",
        "state": "completed",
        "is_final": True,
        "seq": 8,
        "latency_ms": 2000,
        "observed_at": "2026-11-13T10:00:01Z",
    }
    fake_raw_2 = json.dumps(fake_event_2)

    with patch("redis.asyncio.from_url", side_effect=mock_from_url):
        # 1. Connect first client
        client = TestClient(app)
        with client.websocket_connect("/ws") as ws:
            # Check hello message
            hello_data = ws.receive_json()
            assert hello_data["type"] == "hello"
            assert "server_time" in hello_data

            # Publish event to Redis
            asyncio.run(broker.publish("a2a:events", fake_raw_1))

            # Client receives verbatim JSON within 1s
            received_raw = ws.receive_text()
            assert json.loads(received_raw) == fake_event_1

        # 2. Client has disconnected. Verify no errors when publishing while disconnected
        asyncio.run(broker.publish("a2a:events", json.dumps({"type": "task_event", "task_id": "ignored"})))

        # 3. Reconnect client (simulating reconnect with no zombie subscription)
        with client.websocket_connect("/ws") as ws2:
            hello2 = ws2.receive_json()
            assert hello2["type"] == "hello"

            # Publish event 2
            asyncio.run(broker.publish("a2a:events", fake_raw_2))

            received_raw2 = ws2.receive_text()
            assert json.loads(received_raw2) == fake_event_2

