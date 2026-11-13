import json
import logging
from typing import Callable, Optional, Any
from app.proxy.interface import TapEvent

logger = logging.getLogger("a2a.tap")

MAX_FRAME_BYTES = 1024 * 1024  # 1 MB
EXCERPT_BYTES = 8192  # 8 KB

def parse_rpc_payload(data_dict: dict[str, Any]) -> TapEvent:
    # If wrapped in JSON-RPC result
    payload = data_dict.get("result") if isinstance(data_dict.get("result"), dict) else data_dict

    task_id = payload.get("taskId") or payload.get("id")
    if task_id is not None:
        task_id = str(task_id)

    context_id = payload.get("contextId")
    if context_id is not None:
        context_id = str(context_id)

    kind = payload.get("kind")
    if not kind and "error" in data_dict:
        kind = "error"

    state: Optional[str] = None
    status_field = payload.get("status")
    if isinstance(status_field, dict):
        state = status_field.get("state")
    elif isinstance(payload.get("state"), str):
        state = payload.get("state")
    elif "error" in data_dict:
        state = "failed"

    is_final = payload.get("final")
    if is_final is None:
        is_final = payload.get("is_final")

    if is_final is None and state in ("completed", "failed", "canceled", "rejected"):
        is_final = True

    return TapEvent(
        task_id=task_id,
        context_id=context_id,
        kind=kind or ("task" if payload.get("kind") == "task" else "unknown"),
        state=state,
        is_final=bool(is_final) if is_final is not None else None,
        raw=data_dict,
        source="upstream",
    )

class SSETapParser:
    """
    Incremental SSE parser.
    Never buffers the whole response. Accumulates incoming chunks and extracts
    SSE frames delimited by double newlines (\n\n or \r\n\r\n).
    """

    def __init__(self, on_event: Callable[[TapEvent], None]):
        self.on_event = on_event
        self.buffer = bytearray()

    def feed(self, chunk: bytes) -> None:
        if not chunk:
            return

        if len(self.buffer) + len(chunk) > MAX_FRAME_BYTES:
            excerpt = (self.buffer + chunk)[:EXCERPT_BYTES].decode("utf-8", errors="replace")
            self.on_event(
                TapEvent(
                    task_id=None,
                    context_id=None,
                    kind="parse_error",
                    state=None,
                    is_final=None,
                    raw={"error": "Oversized SSE frame (>1MB)", "excerpt": excerpt},
                    source="upstream",
                )
            )
            # Find next delimiter to resync
            self.buffer.clear()
            idx = chunk.find(b"\n\n")
            if idx == -1:
                idx = chunk.find(b"\r\n\r\n")
            if idx != -1:
                self.buffer.extend(chunk[idx:])
            return

        self.buffer.extend(chunk)

        while True:
            # Look for double newline
            idx_rn = self.buffer.find(b"\r\n\r\n")
            idx_nn = self.buffer.find(b"\n\n")

            if idx_rn == -1 and idx_nn == -1:
                break

            if idx_rn != -1 and (idx_nn == -1 or idx_rn < idx_nn):
                delim_idx = idx_rn
                delim_len = 4
            else:
                delim_idx = idx_nn
                delim_len = 2

            raw_frame_bytes = bytes(self.buffer[:delim_idx])
            del self.buffer[: delim_idx + delim_len]

            self._process_frame(raw_frame_bytes)

    def _process_frame(self, raw_frame_bytes: bytes) -> None:
        if not raw_frame_bytes:
            return

        try:
            frame_text = raw_frame_bytes.decode("utf-8")
        except UnicodeDecodeError:
            frame_text = raw_frame_bytes.decode("utf-8", errors="replace")

        lines = frame_text.replace("\r\n", "\n").split("\n")
        data_lines = []

        for line in lines:
            if not line or line.startswith(":"):
                continue
            if line.startswith("data:"):
                data_val = line[5:]
                if data_val.startswith(" "):
                    data_val = data_val[1:]
                data_lines.append(data_val)
            # Ignore event:, id:, retry: per spec

        if not data_lines:
            return

        data_content = "\n".join(data_lines)
        try:
            parsed = json.loads(data_content)
        except Exception:
            self.on_event(
                TapEvent(
                    task_id=None,
                    context_id=None,
                    kind="parse_error",
                    state=None,
                    is_final=None,
                    raw={"error": "JSON parse error", "excerpt": data_content[:EXCERPT_BYTES]},
                    source="upstream",
                )
            )
            return

        if isinstance(parsed, dict):
            event = parse_rpc_payload(parsed)
            self.on_event(event)
        else:
            self.on_event(
                TapEvent(
                    task_id=None,
                    context_id=None,
                    kind="parse_error",
                    state=None,
                    is_final=None,
                    raw={"error": "Non-object JSON payload", "excerpt": data_content[:EXCERPT_BYTES]},
                    source="upstream",
                )
            )
