import asyncio
import json
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import redis.asyncio as aioredis

from app.config import settings

logger = logging.getLogger("a2a.ws")
router = APIRouter(tags=["ws"])

@router.websocket("/ws")
async def ws_endpoint(websocket: WebSocket):
    await websocket.accept()
    # On connect: send {type: "hello", server_time: now}
    hello_msg = {
        "type": "hello",
        "server_time": datetime.now(timezone.utc).isoformat(),
    }
    await websocket.send_text(json.dumps(hello_msg))

    r: aioredis.Redis | None = None
    pubsub = None
    try:
        r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        pubsub = r.pubsub()
        await pubsub.subscribe("a2a:events")

        async for message in pubsub.listen():
            if message and message.get("type") == "message":
                data = message.get("data")
                if data:
                    try:
                        await websocket.send_text(data)
                    except Exception:
                        break
    except WebSocketDisconnect:
        logger.debug("WS client disconnected normally")
    except asyncio.CancelledError:
        pass
    except Exception as e:
        logger.warning("WS pubsub error: %s", e)
    finally:
        if pubsub is not None:
            try:
                await pubsub.unsubscribe("a2a:events")
                await pubsub.aclose()
            except Exception:
                pass
        if r is not None:
            try:
                await r.aclose()
            except Exception:
                pass
        try:
            await websocket.close()
        except Exception:
            pass
