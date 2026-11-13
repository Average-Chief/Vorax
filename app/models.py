import uuid
from datetime import datetime, timezone
from typing import Any, Optional
from sqlalchemy import (
    String,
    Text,
    Boolean,
    Integer,
    BigInteger,
    DateTime,
    ForeignKey,
    Index,
    JSON,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

def utcnow() -> datetime:
    return datetime.now(timezone.utc)

class RegisteredAgent(Base):
    __tablename__ = "registered_agents"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    endpoint_url: Mapped[str] = mapped_column(Text, nullable=False)
    agent_card: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    upstream_credential: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    routes: Mapped[list["GatewayRoute"]] = relationship("GatewayRoute", back_populates="agent", cascade="all, delete-orphan")

class GatewayRoute(Base):
    __tablename__ = "gateway_routes"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    path_segment: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    agent_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("registered_agents.id", ondelete="CASCADE"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    agent: Mapped["RegisteredAgent"] = relationship("RegisteredAgent", back_populates="routes")
    tasks: Mapped[list["Task"]] = relationship("Task", back_populates="route")

class ApiKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    key_hash: Mapped[str] = mapped_column(Text, nullable=False)
    key_prefix: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    route_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid(as_uuid=True), ForeignKey("gateway_routes.id", ondelete="SET NULL"), nullable=True)
    context_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    current_state: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_terminal: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_event_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    error_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    route: Mapped[Optional["GatewayRoute"]] = relationship("GatewayRoute", back_populates="tasks")
    events: Mapped[list["TaskEvent"]] = relationship("TaskEvent", back_populates="task", order_by="TaskEvent.seq")

    __table_args__ = (
        Index("ix_tasks_current_state_last_event_at", "current_state", last_event_at.desc()),
    )

class TaskEvent(Base):
    __tablename__ = "task_events"

    id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    task_id: Mapped[str] = mapped_column(Text, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    seq: Mapped[int] = mapped_column(Integer, nullable=False)
    source: Mapped[str] = mapped_column(Text, nullable=False)  # 'upstream' | 'gateway'
    kind: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # status-update | artifact-update | gateway.note | message
    state: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # submitted/working/input-required/completed/failed/canceled
    is_final: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    latency_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    task: Mapped["Task"] = relationship("Task", back_populates="events")

    __table_args__ = (
        Index("ix_task_events_task_id_seq", "task_id", "seq"),
    )

