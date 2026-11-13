import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import AsyncIterator, Callable, Protocol, Optional, Any

from app.proxy.deps import ResolvedRoute

@dataclass
class TapEvent:
    task_id: Optional[str]
    context_id: Optional[str]
    kind: Optional[str]  # status-update | artifact-update | task | parse_error | gateway.note
    state: Optional[str]  # submitted/working/input-required/completed/failed/canceled
    is_final: Optional[bool]
    raw: dict[str, Any]
    source: str = "upstream"  # 'upstream' | 'gateway'
    route_id: Optional[uuid.UUID] = None
    observed_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    latency_ms: Optional[int] = None

@dataclass
class ProxyResult:
    status_code: int
    content_type: str
    body_stream: AsyncIterator[bytes]
    transport_error: Optional[Exception] = None

class ProxyBackend(Protocol):
    async def forward(
        self,
        route: ResolvedRoute,
        request_headers: dict[str, str],
        body: bytes,
        on_event: Callable[[TapEvent], None],
    ) -> ProxyResult:
        ...
