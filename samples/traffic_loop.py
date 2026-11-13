import asyncio
import json
import logging
import os
import random
import time
import httpx

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("traffic_loop")

GATEWAY_URL = os.environ.get("GATEWAY_URL", "http://localhost:8000").rstrip("/")
ADMIN_KEY = os.environ.get("ADMIN_KEY", "dev-only-do-not-use-in-prod")

ECHO_URL = os.environ.get("ECHO_URL", "http://localhost:8101").rstrip("/")
RESEARCH_URL = os.environ.get("RESEARCH_URL", "http://localhost:8102").rstrip("/")
FLAKY_URL = os.environ.get("FLAKY_URL", "http://localhost:8103").rstrip("/")

HEADERS = {
    "Authorization": f"Bearer {ADMIN_KEY}",
    "Content-Type": "application/json",
}

RESEARCH_TOPICS = [
    "Analyze Byzantine fault tolerance in decentralized gateways",
    "Survey streaming telemetry architectures for LLM swarms",
    "Evaluate zero-copy JSON-RPC SSE frame parsers",
    "Benchmark in-memory SQLite projections vs Postgres",
    "Assess backpressure propagation in async streaming clients",
]

async def wait_for_gateway(client: httpx.AsyncClient) -> None:
    logger.info("Waiting for Gateway at %s to become ready...", GATEWAY_URL)
    for attempt in range(1, 31):
        try:
            r = await client.get(f"{GATEWAY_URL}/healthz", timeout=2.0)
            if r.status_code == 200:
                logger.info("Gateway is healthy!")
                return
        except Exception:
            pass
        await asyncio.sleep(1.0)
    logger.warning("Gateway health check timed out. Proceeding anyway.")

async def setup_agent_and_route(
    client: httpx.AsyncClient, name: str, endpoint_url: str
) -> None:
    logger.info("Registering agent '%s' at %s...", name, endpoint_url)
    agent_id = None

    # 1. Register agent
    try:
        r = await client.post(
            f"{GATEWAY_URL}/control/agents",
            json={"name": name, "endpoint_url": endpoint_url},
            headers=HEADERS,
            timeout=5.0,
        )
        if r.status_code == 201:
            agent_id = r.json()["id"]
        elif r.status_code == 409:
            # Look up existing agent
            list_r = await client.get(f"{GATEWAY_URL}/control/agents", headers=HEADERS)
            for a in list_r.json():
                if a["name"] == name:
                    agent_id = a["id"]
                    break
    except Exception as e:
        logger.error("Failed to register agent '%s': %s", name, e)

    if not agent_id:
        return

    # 2. Bind route /gw/{name}
    try:
        r = await client.post(
            f"{GATEWAY_URL}/control/routes",
            json={"path_segment": name, "agent_id": agent_id},
            headers=HEADERS,
            timeout=5.0,
        )
        if r.status_code == 201:
            logger.info("Created route /gw/%s -> agent %s", name, agent_id)
    except Exception as e:
        logger.debug("Route creation notice for '%s': %s", name, e)

async def main():
    async with httpx.AsyncClient() as client:
        await wait_for_gateway(client)

        # Register fleet
        await setup_agent_and_route(client, "echo", ECHO_URL)
        await setup_agent_and_route(client, "research", RESEARCH_URL)
        await setup_agent_and_route(client, "flaky", FLAKY_URL)

        logger.info("Demo fleet registration complete. Starting traffic generator...")
        seq = 0

        while True:
            seq += 1
            roll = random.random()
            delay = random.uniform(2.0, 4.0)

            try:
                if roll < 0.70:
                    # 70%: Echo (message/send)
                    msg_text = f"Echo ping task #{seq}"
                    logger.info("Submitting /gw/echo [message/send]: %s", msg_text[:60])
                    payload = {
                        "jsonrpc": "2.0",
                        "id": seq,
                        "method": "message/send",
                        "params": {
                            "message": {
                                "role": "user",
                                "kind": "message",
                                "parts": [{"kind": "text", "text": msg_text}],
                            }
                        },
                    }
                    await client.post(
                        f"{GATEWAY_URL}/gw/echo/",
                        json=payload,
                        headers=HEADERS,
                        timeout=5.0,
                    )

                elif roll < 0.90:
                    # 20%: Research (message/stream)
                    topic = random.choice(RESEARCH_TOPICS)
                    msg_text = f"{topic} (task #{seq})"
                    logger.info("Submitting /gw/research [message/stream]: %s", msg_text[:60])
                    payload = {
                        "jsonrpc": "2.0",
                        "id": seq,
                        "method": "message/stream",
                        "params": {
                            "message": {
                                "role": "user",
                                "kind": "message",
                                "parts": [{"kind": "text", "text": msg_text}],
                            }
                        },
                    }
                    # Consume stream
                    async with client.stream(
                        "POST",
                        f"{GATEWAY_URL}/gw/research/",
                        json=payload,
                        headers=HEADERS,
                        timeout=10.0,
                    ) as resp:
                        async for _ in resp.aiter_lines():
                            pass

                elif roll < 0.98:
                    # 8%: Flaky:die (message/stream connection drop)
                    msg_text = f"Simulate failure with directive flaky:die (task #{seq})"
                    logger.info("Submitting /gw/flaky [message/stream]: %s", msg_text[:60])
                    payload = {
                        "jsonrpc": "2.0",
                        "id": seq,
                        "method": "message/stream",
                        "params": {
                            "message": {
                                "role": "user",
                                "kind": "message",
                                "parts": [{"kind": "text", "text": "directive flaky:die"}],
                            }
                        },
                    }
                    try:
                        async with client.stream(
                            "POST",
                            f"{GATEWAY_URL}/gw/flaky/",
                            json=payload,
                            headers=HEADERS,
                            timeout=5.0,
                        ) as resp:
                            async for _ in resp.aiter_lines():
                                pass
                    except Exception:
                        pass  # Expected connection drop

                else:
                    # 2%: Garbage payload (raw non-JSON bytes)
                    logger.info("Submitting /gw/echo [garbage payload]: raw bytes (protocol check)")
                    await client.post(
                        f"{GATEWAY_URL}/gw/echo/",
                        content=b"CORRUPT_RAW_BYTES_NON_JSON_!#$%",
                        headers={"Authorization": f"Bearer {ADMIN_KEY}", "Content-Type": "application/json"},
                        timeout=5.0,
                    )

            except Exception as e:
                logger.warning("Traffic loop transient error on iteration #%d: %s", seq, e)

            await asyncio.sleep(delay)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logger.info("Traffic loop stopped.")

