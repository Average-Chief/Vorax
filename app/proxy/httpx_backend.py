import json
import logging
from typing import AsyncIterator, Callable, Optional, Any
import httpx

from app.config import settings
from app.proxy.deps import ResolvedRoute
from app.proxy.interface import ProxyBackend, ProxyResult, TapEvent
from app.proxy.tap import SSETapParser, parse_rpc_payload

logger = logging.getLogger("a2a.httpx_backend")

HOP_BY_HOP_HEADERS = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
    "host",
    "content-length",
}

# Test mounts for in-process ASGI testing
_test_mounts: dict[str, httpx.AsyncBaseTransport] = {}

def register_test_mount(prefix: str, transport: httpx.AsyncBaseTransport) -> None:
    _test_mounts[prefix] = transport

def clear_test_mounts() -> None:
    _test_mounts.clear()

class HttpxProxyBackend(ProxyBackend):
    def __init__(self):
        pass

    async def forward(
        self,
        route: ResolvedRoute,
        request_headers: dict[str, str],
        body: bytes,
        on_event: Callable[[TapEvent], None],
    ) -> ProxyResult:
        # Strip hop-by-hop headers
        forward_headers = {
            k: v for k, v in request_headers.items() if k.lower() not in HOP_BY_HOP_HEADERS
        }

        # Attach upstream credential if configured
        if route.upstream_credential:
            forward_headers["authorization"] = route.upstream_credential

        target_url = route.endpoint_url.rstrip("/") + "/"

        timeout = httpx.Timeout(
            connect=settings.UPSTREAM_CONNECT_TIMEOUT_S,
            read=settings.UPSTREAM_IDLE_TIMEOUT_S,
            write=settings.UPSTREAM_IDLE_TIMEOUT_S,
            pool=settings.UPSTREAM_CONNECT_TIMEOUT_S,
        )

        client = httpx.AsyncClient(timeout=timeout, mounts=_test_mounts if _test_mounts else None)
        try:
            req = client.build_request("POST", target_url, headers=forward_headers, content=body)
            resp = await client.send(req, stream=True)
        except Exception as e:
            await client.aclose()
            logger.error("Upstream connection error to %s: %s", target_url, e)
            raise e

        status_code = resp.status_code
        content_type = resp.headers.get("content-type", "application/json")
        is_sse = "text/event-stream" in content_type.lower()

        # Shared tracking state for mid-stream error reporting
        last_task_id: Optional[str] = None
        last_context_id: Optional[str] = None
        events_seen = 0

        def wrapped_on_event(event: TapEvent) -> None:
            nonlocal last_task_id, last_context_id, events_seen
            if event.task_id:
                last_task_id = event.task_id
            if event.context_id:
                last_context_id = event.context_id
            if event.kind != "gateway.note":
                events_seen += 1
            on_event(event)

        proxy_res = ProxyResult(
            status_code=status_code,
            content_type=content_type,
            body_stream=None,  # set below
            transport_error=None,
        )

        # Handle 401 upstream rejection
        if status_code == 401:
            logger.warning("Upstream returned 401 for route %s", route.path_segment)

        async def byte_generator() -> AsyncIterator[bytes]:
            nonlocal proxy_res
            parser = SSETapParser(wrapped_on_event) if is_sse else None
            non_sse_buf = bytearray() if not is_sse else None

            try:
                async for chunk in resp.aiter_raw():
                    if is_sse:
                        parser.feed(chunk)
                    else:
                        non_sse_buf.extend(chunk)
                    yield chunk

                # If non-SSE response completed normally, parse response payload
                if not is_sse and non_sse_buf:
                    try:
                        raw_json = json.loads(non_sse_buf.decode("utf-8"))
                        if isinstance(raw_json, dict):
                            event = parse_rpc_payload(raw_json)
                            wrapped_on_event(event)
                    except Exception:
                        pass

                # If 401 from upstream, record synthetic note
                if status_code == 401:
                    wrapped_on_event(
                        TapEvent(
                            task_id=last_task_id,
                            context_id=last_context_id,
                            kind="gateway.note",
                            state="failed",
                            is_final=False,
                            raw={
                                "error_type": "UpstreamAuthenticationError",
                                "detail": "upstream rejected credential",
                                "status_code": 401,
                            },
                            source="gateway",
                        )
                    )

            except Exception as exc:
                logger.error("Mid-stream transport error from %s: %s", target_url, exc)
                proxy_res.transport_error = exc
                # Emit synthetic gateway.note
                wrapped_on_event(
                    TapEvent(
                        task_id=last_task_id,
                        context_id=last_context_id,
                        kind="gateway.note",
                        state=None,
                        is_final=False,
                        raw={
                            "error_type": exc.__class__.__name__,
                            "detail": str(exc),
                            "message": f"gateway observed: upstream connection reset after {events_seen} events",
                        },
                        source="gateway",
                    )
                )
            finally:
                await resp.aclose()
                await client.aclose()

        proxy_res.body_stream = byte_generator()
        return proxy_res

async def fetch_upstream_card(endpoint_url: str) -> dict[str, Any]:
    base_url = endpoint_url.rstrip("/")
    candidates = [
        f"{base_url}/.well-known/agent-card.json",
        f"{base_url}/.well-known/agent.json",
    ]
    timeout = httpx.Timeout(settings.UPSTREAM_CONNECT_TIMEOUT_S)
    async with httpx.AsyncClient(timeout=timeout, mounts=_test_mounts if _test_mounts else None) as client:
        last_error = None
        for url in candidates:
            try:
                resp = await client.get(url)
                if resp.status_code == 200:
                    return resp.json()
                elif resp.status_code == 404:
                    last_error = "HTTP 404 (Endpoint not found)"
                else:
                    last_error = f"HTTP {resp.status_code} ({resp.reason_phrase})"
            except Exception as e:
                last_error = e
        raise RuntimeError(f"Failed to fetch card: {last_error or '404 Not Found'}")
