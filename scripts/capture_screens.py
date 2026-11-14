import asyncio
import os
import shutil
import subprocess
import time
import urllib.request
import json
from PIL import Image
from playwright.async_api import async_playwright

BASE_URL = "http://localhost:8000"
ADMIN_KEY = "dev-only-do-not-use-in-prod"
ASSETS_DIR = "docs/assets"
FRAMES_DIR = "docs/assets/frames"

async def trigger_flaky_die():
    print("Ensuring shot-flaky-1 exists...")
    payload = {
        "jsonrpc": "2.0",
        "id": "shot-1",
        "method": "message/stream",
        "params": {
            "message": {
                "role": "user",
                "parts": [{"type": "text", "text": "flaky:die"}]
            },
            "taskId": "shot-flaky-1"
        }
    }
    req = urllib.request.Request(
        f"{BASE_URL}/gw/flaky/",
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {ADMIN_KEY}",
            "Content-Type": "application/json"
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            # Read all streamed chunks until connection drops
            resp.read()
    except Exception as e:
        print(f"flaky:die stream ended as expected: {e}")
    # Wait for ingest worker to write gateway.note
    await asyncio.sleep(2)

async def trigger_research_stream(task_id: str):
    payload = {
        "jsonrpc": "2.0",
        "id": "shot-res-1",
        "method": "message/stream",
        "params": {
            "message": {
                "role": "user",
                "parts": [{"type": "text", "text": "research:long"}]
            },
            "taskId": task_id
        }
    }
    req = urllib.request.Request(
        f"{BASE_URL}/gw/research/",
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {ADMIN_KEY}",
            "Content-Type": "application/json"
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            for line in resp:
                pass
    except Exception as e:
        print(f"Research stream finished: {e}")

async def main():
    os.makedirs(ASSETS_DIR, exist_ok=True)
    os.makedirs(FRAMES_DIR, exist_ok=True)

    # 1. Trigger flaky:die task
    await trigger_flaky_die()

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            device_scale_factor=1.0
        )
        page = await context.new_page()

        # Set localStorage API key
        await page.goto(f"{BASE_URL}/")
        await page.evaluate(f"localStorage.setItem('a2a_api_key', '{ADMIN_KEY}')")

        # 2. Capture docs/assets/triage.png — http://localhost:8000/ (wait 2s for live updates)
        print("Capturing docs/assets/triage.png...")
        await page.goto(f"{BASE_URL}/")
        await asyncio.sleep(2)
        await page.screenshot(path=f"{ASSETS_DIR}/triage.png", full_page=True)

        # 3. Capture docs/assets/timeline.png — http://localhost:8000/tasks/shot-flaky-1
        print("Capturing docs/assets/timeline.png...")
        await page.goto(f"{BASE_URL}/tasks/shot-flaky-1")
        await asyncio.sleep(2)
        await page.screenshot(path=f"{ASSETS_DIR}/timeline.png", full_page=True)

        # 4. Capture docs/assets/agents.png — http://localhost:8000/agents
        print("Capturing docs/assets/agents.png...")
        await page.goto(f"{BASE_URL}/agents")
        await asyncio.sleep(2)
        await page.screenshot(path=f"{ASSETS_DIR}/agents.png", full_page=True)

        # 5. Capture docs/assets/gateway.png — http://localhost:8000/gateway
        print("Capturing docs/assets/gateway.png...")
        await page.goto(f"{BASE_URL}/gateway")
        await asyncio.sleep(2)
        await page.screenshot(path=f"{ASSETS_DIR}/gateway.png", full_page=True)

        # 6. Hero GIF: 6 seconds animated capture of research streaming task in progress
        print("Preparing Hero GIF capture...")
        res_task_id = "shot-research-live"
        # Start research stream in background
        stream_task = asyncio.create_task(asyncio.to_thread(asyncio.run, trigger_research_stream(res_task_id)))
        await asyncio.sleep(0.5)

        # Navigate to the timeline for the live streaming research task
        await page.goto(f"{BASE_URL}/tasks/{res_task_id}")
        await asyncio.sleep(0.5)

        print("Recording 30 frames at 5fps...")
        for i in range(30):
            frame_path = os.path.join(FRAMES_DIR, f"frame_{i:03d}.png")
            await page.screenshot(path=frame_path)
            await asyncio.sleep(0.2)

        await browser.close()

    # 7. Assemble hero.gif with ffmpeg
    print("Assembling hero.gif via ffmpeg...")
    ffmpeg_bin = os.path.abspath(".venv/bin/ffmpeg")
    if not os.path.exists(ffmpeg_bin):
        ffmpeg_bin = "ffmpeg"

    cmd = [
        ffmpeg_bin, "-y",
        "-framerate", "5",
        "-i", f"{FRAMES_DIR}/frame_%03d.png",
        "-vf", "scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse",
        "-loop", "0",
        f"{ASSETS_DIR}/hero.gif"
    ]
    subprocess.run(cmd, check=True)

    # Clean up raw frames
    if os.path.exists(FRAMES_DIR):
        shutil.rmtree(FRAMES_DIR)

    # Verify hero.gif size
    gif_size = os.path.getsize(f"{ASSETS_DIR}/hero.gif")
    print(f"hero.gif size: {gif_size / 1024 / 1024:.2f} MB")
    if gif_size > 3 * 1024 * 1024:
        print("Re-encoding hero.gif at scale=600:-1 to keep under 3MB...")
        cmd_reencode = [
            ffmpeg_bin, "-y",
            "-i", f"{ASSETS_DIR}/hero.gif",
            "-vf", "scale=600:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse",
            "-loop", "0",
            f"{ASSETS_DIR}/hero.gif"
        ]
        subprocess.run(cmd_reencode, check=True)
        print(f"New hero.gif size: {os.path.getsize(f'{ASSETS_DIR}/hero.gif') / 1024 / 1024:.2f} MB")

    # 8. Check non-white ratio with PIL
    print("\n--- Screenshot Verification ---")
    all_valid = True
    for f in ["triage", "timeline", "agents", "gateway"]:
        filepath = f"{ASSETS_DIR}/{f}.png"
        im = Image.open(filepath).convert("L")
        h = im.histogram()
        ratio = 1 - h[255] / sum(h)
        print(f"{f}.png {im.size} non-white ratio: {ratio:.4f}")
        if ratio < 0.5:
            print(f"WARNING: {f}.png non-white ratio is below 0.5!")
            all_valid = False

    if all_valid:
        print("\nAll 4 screenshots and hero.gif successfully captured and verified!")

if __name__ == "__main__":
    asyncio.run(main())

