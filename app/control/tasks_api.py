import time
import uuid
from datetime import datetime
from typing import Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_control_key
from app.database import get_db
from app.ingest.writer import stats, is_task_tail_dropped
from app.models import Task, TaskEvent

router = APIRouter(prefix="/control", tags=["tasks"], dependencies=[Depends(require_control_key)])

class TaskSummary(BaseModel):
    id: str
    route_id: Optional[uuid.UUID] = None
    context_id: Optional[str] = None
    current_state: Optional[str] = None
    is_terminal: bool
    started_at: Optional[datetime] = None
    last_event_at: Optional[datetime] = None
    error_summary: Optional[str] = None
    is_incomplete: bool = False
    incompleteness_reason: Optional[str] = None

class EventDetail(BaseModel):
    id: int
    seq: int
    source: str
    kind: Optional[str] = None
    state: Optional[str] = None
    is_final: Optional[bool] = None
    payload: dict[str, Any]
    observed_at: datetime
    latency_ms: Optional[int] = None

class TaskTimeline(BaseModel):
    task: TaskSummary
    events: list[EventDetail]
    is_incomplete: bool = False
    incompleteness_reason: Optional[str] = None

class StatsResponse(BaseModel):
    tasks_by_state: dict[str, int]
    events_per_sec: float
    total_events: int
    dropped_events: int
    orphan_errors: int
    uptime_seconds: float

@router.get("/tasks", response_model=list[TaskSummary])
async def list_tasks(
    state: Optional[str] = Query(None, description="Filter by task state"),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    # Triage ordering:
    # 1: failed, rejected, input-required (needs immediate attention)
    # 2: in-flight (is_terminal == False)
    # 3: terminal (completed, canceled, etc.)
    triage_priority = case(
        (Task.current_state.in_(["failed", "rejected", "input-required"]), 1),
        (Task.is_terminal == False, 2),
        else_=3,
    )

    query = select(Task)
    if state:
        if state == "failed":
            query = query.where(Task.current_state.in_(["failed", "rejected"]))
        else:
            query = query.where(Task.current_state == state)

    query = query.order_by(triage_priority.asc(), Task.last_event_at.desc().nullslast()).limit(limit)
    result = await db.execute(query)
    tasks = result.scalars().all()

    tasks_res = []
    for t in tasks:
        is_inc = False
        inc_reason = None
        if is_task_tail_dropped(t.id):
            is_inc = True
            inc_reason = "Tail events were dropped due to queue backpressure"
        elif t.error_summary and any(kw in t.error_summary.lower() for kw in ("reset", "lost", "dropped", "disconnect", "abnormal")):
            is_inc = True
            inc_reason = t.error_summary
        tasks_res.append(
            TaskSummary(
                id=t.id,
                route_id=t.route_id,
                context_id=t.context_id,
                current_state=t.current_state,
                is_terminal=t.is_terminal,
                started_at=t.started_at,
                last_event_at=t.last_event_at,
                error_summary=t.error_summary,
                is_incomplete=is_inc,
                incompleteness_reason=inc_reason,
            )
        )
    return tasks_res

@router.get("/tasks/{task_id}/timeline", response_model=TaskTimeline)
async def get_task_timeline(
    task_id: str,
    db: AsyncSession = Depends(get_db),
):
    # Get task
    stmt_task = select(Task).where(Task.id == task_id)
    task = (await db.execute(stmt_task)).scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task '{task_id}' not found")

    # Get events ordered by seq
    stmt_events = select(TaskEvent).where(TaskEvent.task_id == task_id).order_by(TaskEvent.seq.asc())
    events = (await db.execute(stmt_events)).scalars().all()

    # Check for timeline incompleteness:
    # 1. Tail drop explicitly tracked under queue backpressure
    # 2. First event sequence > 1 (head drop under backpressure)
    # 3. Sequence gap between consecutive events (interior drop)
    # 4. Stream truncation: task marked terminal but last event is non-terminal (tail drop)
    # 5. Connection reset or dropped without normal terminal event
    is_incomplete = False
    incompleteness_reason = None

    if is_task_tail_dropped(task_id):
        is_incomplete = True
        incompleteness_reason = "Tail events were dropped due to queue backpressure"

    if not is_incomplete and events:
        if events[0].seq > 1:
            is_incomplete = True
            incompleteness_reason = f"Timeline begins at sequence #{events[0].seq} (earlier events dropped under queue backpressure)"
        else:
            for i in range(1, len(events)):
                if events[i].seq != events[i-1].seq + 1:
                    is_incomplete = True
                    incompleteness_reason = f"Event sequence gap detected between #{events[i-1].seq} and #{events[i].seq} (dropped under queue backpressure)"
                    break

    if not is_incomplete and events:
        last_e = events[-1]
        is_last_terminal = (last_e.is_final is True) or (last_e.state in ("completed", "canceled", "failed", "rejected"))
        if task.is_terminal and not is_last_terminal:
            is_incomplete = True
            incompleteness_reason = f"Stream ended abruptly at seq #{last_e.seq} ({last_e.state or 'working'}); final completion event was dropped"

    if not is_incomplete and events:
        note_event = next((e for e in events if e.kind == "gateway.note"), None)
        if note_event:
            is_incomplete = True
            incompleteness_reason = (note_event.payload or {}).get("message") or (note_event.payload or {}).get("detail") or "Upstream connection terminated unexpectedly"

    if not is_incomplete and task.current_state in ("failed", "rejected") and not any(e.is_final for e in events):
        is_incomplete = True
        incompleteness_reason = task.error_summary or "Task terminated without final terminal status frame"

    return TaskTimeline(
        task=TaskSummary(
            id=task.id,
            route_id=task.route_id,
            context_id=task.context_id,
            current_state=task.current_state,
            is_terminal=task.is_terminal,
            started_at=task.started_at,
            last_event_at=task.last_event_at,
            error_summary=task.error_summary,
            is_incomplete=is_incomplete,
            incompleteness_reason=incompleteness_reason,
        ),
        events=[
            EventDetail(
                id=e.id,
                seq=e.seq,
                source=e.source,
                kind=e.kind,
                state=e.state,
                is_final=e.is_final,
                payload=e.payload,
                observed_at=e.observed_at,
                latency_ms=e.latency_ms,
            )
            for e in events
        ],
        is_incomplete=is_incomplete,
        incompleteness_reason=incompleteness_reason,
    )

@router.get("/stats", response_model=StatsResponse)
async def get_stats(
    db: AsyncSession = Depends(get_db),
):
    # Count tasks by state
    stmt = select(Task.current_state, func.count(Task.id)).group_by(Task.current_state)
    result = await db.execute(stmt)
    tasks_by_state = {str(state or "unknown"): count for state, count in result.all()}

    now = time.time()
    uptime = max(0.001, now - stats["start_time"])
    events_per_sec = round(stats["total_events"] / uptime, 2)

    return StatsResponse(
        tasks_by_state=tasks_by_state,
        events_per_sec=events_per_sec,
        total_events=stats["total_events"],
        dropped_events=stats["dropped_events"],
        orphan_errors=stats["orphan_errors"],
        uptime_seconds=round(uptime, 1),
    )

