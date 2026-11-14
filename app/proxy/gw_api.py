import json
import logging
from typing import Optional, Any
from fastapi import APIRouter, Request, Response, Depends, status
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import verify_gateway_key
from app.database import get_db
from app.ingest.writer import enqueue_event
from app.proxy.deps import resolve_route
from app.proxy.httpx_backend import HttpxProxyBackend
from app.proxy.interface import TapEvent

logger = logging.getLogger("a2a.gw_api")

router = APIRouter(prefix="/gw", tags=["data-plane"])
backend = HttpxProxyBackend()

def make_jsonrpc_error(code: int, message: str, req_id: Optional[Any] = None) -> dict:
    return {
        "jsonrpc": "2.0",
        "id": req_id,
        "error": {
            "code": code,
            "message": message,
        },
    }

@router.post("/{route}")
@router.post("/{route}/")
async def proxy_rpc(
    route: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    # Read raw body
    body_bytes = await request.body()
    req_id = None
    method = None

    try:
        req_json = json.loads(body_bytes)
        if isinstance(req_json, dict):
            req_id = req_json.get("id")
            method = req_json.get("method")
    except Exception:
        pass

    # 1. Bearer key check
    auth_header = request.headers.get("authorization", "")
    token = None
    if auth_header.lower().startswith("bearer "):
        token = auth_header[7:].strip()

    is_valid_key = await verify_gateway_key(token, db)
    if not is_valid_key:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content=make_jsonrpc_error(-32001, "Unauthorized: invalid gateway key", req_id),
        )

    # 2. Route lookup (cached in-memory)
    resolved_route = await resolve_route(route, db)
    if not resolved_route:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=make_jsonrpc_error(-32001, f"Route '{route}' not found", req_id),
        )

    # 3. Setup tap callback
    should_tap = method in ("message/send", "message/stream", "SendMessage", "SendStreamingMessage")

    def on_event_callback(event: TapEvent) -> None:
        if not should_tap and event.kind != "gateway.note":
            return
        event.route_id = resolved_route.route_id
        enqueue_event(event)

    # 4. Forward upstream
    request_headers = dict(request.headers)

    try:
        proxy_res = await backend.forward(
            route=resolved_route,
            request_headers=request_headers,
            body=body_bytes,
            on_event=on_event_callback,
        )
    except Exception as e:
        logger.error("Error connecting to upstream for route '%s': %s", route, e)
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content=make_jsonrpc_error(-32001, f"Bad Gateway: upstream connection error: {e}", req_id),
        )

    # 5. Return response
    resp_headers = {}
    content_type = proxy_res.content_type
    if "text/event-stream" in content_type.lower():
        resp_headers["Cache-Control"] = "no-cache"
        resp_headers["X-Accel-Buffering"] = "off"

    return StreamingResponse(
        proxy_res.body_stream,
        status_code=proxy_res.status_code,
        media_type=content_type,
        headers=resp_headers,
    )
