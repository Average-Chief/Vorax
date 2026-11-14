import sys
import os
import asyncio

# Add helloworld to sys.path
sys.path.insert(0, "/tmp/a2a-samples/samples/python/agents/helloworld")

import uvicorn
from starlette.applications import Starlette
from a2a.server.routes import create_agent_card_routes, create_jsonrpc_routes
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.tasks import InMemoryTaskStore
from a2a.types import AgentCard, AgentCapabilities, AgentInterface, AgentSkill, TaskState
from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.events import EventQueue
from a2a.server.tasks import TaskUpdater
from a2a.helpers import (
    get_message_text,
    new_task_from_user_message,
    new_text_message,
    new_text_part,
)

class OfficialStreamingProgressExecutor(AgentExecutor):
    async def execute(self, context: RequestContext, event_queue: EventQueue) -> None:
        if context.current_task:
            task = context.current_task
        else:
            task = new_task_from_user_message(context.message)
            await event_queue.enqueue_event(task)

        updater = TaskUpdater(event_queue=event_queue, task_id=task.id, context_id=task.context_id)
        query = get_message_text(context.message) or "Default Task"

        steps = [
            f"Parsing query: '{query}'",
            "Synthesizing references from knowledge base",
            "Validating cross-domain constraints",
            "Compiling final synthesis",
        ]

        for idx, step in enumerate(steps, 1):
            await asyncio.sleep(0.5)
            await updater.update_status(
                state=TaskState.TASK_STATE_WORKING,
                message=new_text_message(f"Step {idx}/{len(steps)}: {step}"),
            )

        await asyncio.sleep(0.4)
        summary = f"Official SDK Streaming Summary for query: {query}"
        await updater.add_artifact(parts=[new_text_part(text=summary, media_type="text/plain")])

        await asyncio.sleep(0.3)
        await updater.update_status(
            state=TaskState.TASK_STATE_COMPLETED,
            message=new_text_message("Streaming analysis completed successfully!"),
        )

    async def cancel(self, context: RequestContext, event_queue: EventQueue) -> None:
        pass

skill = AgentSkill(
    id="streaming_pipeline",
    name="Streaming Pipeline",
    description="Official Google A2A SDK multi-step progress streaming agent",
    tags=["a2a", "reference", "streaming"],
    input_modes=["text/plain"],
    output_modes=["text/plain"],
    examples=["analyze data", "process pipeline"],
)

public_agent_card = AgentCard(
    name="Official Reference Streaming Agent",
    description="Google A2A SDK Official Reference Multi-Step Streaming Agent",
    version="1.0.0",
    default_input_modes=["text/plain"],
    default_output_modes=["text/plain"],
    capabilities=AgentCapabilities(streaming=True),
    supported_interfaces=[
        AgentInterface(
            protocol_binding="JSONRPC",
            url="http://host.docker.internal:8106/",
            protocol_version="1.0",
        )
    ],
    skills=[skill],
)

request_handler = DefaultRequestHandler(
    agent_executor=OfficialStreamingProgressExecutor(),
    task_store=InMemoryTaskStore(),
    agent_card=public_agent_card,
)

routes = []
routes.extend(create_agent_card_routes(public_agent_card))
routes.extend(create_jsonrpc_routes(request_handler, "/", enable_v0_3_compat=True))

app = Starlette(routes=routes)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8106))
    print(f"Starting Official Streaming Agent on 0.0.0.0:{port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
