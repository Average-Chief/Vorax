import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional, Any
from app.proxy.interface import TapEvent

def create_gateway_note_event(
    task_id: Optional[str],
    context_id: Optional[str],
    error_type: str,
    detail: str,
    route_id: Optional[uuid.UUID] = None,
    events_seen: int = 0,
) -> TapEvent:
    msg = f"gateway observed: {detail}" if events_seen == 0 else f"gateway observed: upstream connection reset after {events_seen} events"
    return TapEvent(
        task_id=task_id,
        context_id=context_id,
        kind="gateway.note",
        state=None,
        is_final=False,
        raw={
            "error_type": error_type,
            "detail": detail,
            "message": msg,
        },
        source="gateway",
        observed_at=datetime.now(timezone.utc),
    )
