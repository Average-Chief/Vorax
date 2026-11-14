import sys
import os

# Add helloworld to sys.path
sys.path.insert(0, "/tmp/a2a-samples/samples/python/agents/helloworld")

import uvicorn
from starlette.applications import Starlette
from a2a.server.routes import create_agent_card_routes, create_jsonrpc_routes
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.tasks import InMemoryTaskStore
from a2a.types import AgentCard, AgentCapabilities, AgentInterface, AgentSkill
from agent_executor import HelloWorldAgentExecutor

skill = AgentSkill(
    id="echo_bot",
    name="Echo Bot",
    description="Official Google reference agent that responds with Hello World",
    tags=["a2a", "reference", "echo"],
    input_modes=["text/plain"],
    output_modes=["text/plain"],
    examples=["hello world", "test"],
)

public_agent_card = AgentCard(
    name="Official Reference HelloWorld Agent",
    description="Google A2A SDK Official Reference Agent",
    version="1.0.0",
    default_input_modes=["text/plain"],
    default_output_modes=["text/plain"],
    capabilities=AgentCapabilities(streaming=True),
    supported_interfaces=[
        AgentInterface(
            protocol_binding="JSONRPC",
            url="http://host.docker.internal:8105/",
            protocol_version="1.0",
        )
    ],
    skills=[skill],
)

request_handler = DefaultRequestHandler(
    agent_executor=HelloWorldAgentExecutor(),
    task_store=InMemoryTaskStore(),
    agent_card=public_agent_card,
)

routes = []
routes.extend(create_agent_card_routes(public_agent_card))
routes.extend(create_jsonrpc_routes(request_handler, "/", enable_v0_3_compat=True))

app = Starlette(routes=routes)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8105))
    print(f"Starting Official HelloWorld Agent on 0.0.0.0:{port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
