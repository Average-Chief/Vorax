import os
from PIL import Image, ImageDraw, ImageFont

os.makedirs("docs/assets", exist_ok=True)

WIDTH, HEIGHT = 1600, 960
BG_COLOR = (9, 13, 22)
CARD_BG = (17, 23, 38)
BORDER_COLOR = (30, 41, 59)
TEXT_WHITE = (241, 245, 249)
TEXT_MUTED = (148, 163, 184)
TEXT_DIM = (100, 116, 139)
ACCENT_BLUE = (59, 130, 246)
ACCENT_RED = (239, 68, 68)
ACCENT_GREEN = (16, 185, 129)
ACCENT_ORANGE = (249, 115, 22)
ACCENT_PURPLE = (168, 85, 247)

def create_base_canvas(title="A2A Gateway"):
    img = Image.new("RGB", (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # Navbar
    draw.rectangle([0, 0, WIDTH, 70], fill=(15, 23, 42))
    draw.line([0, 70, WIDTH, 70], fill=BORDER_COLOR, width=1)

    # Logo
    draw.rounded_rectangle([40, 18, 76, 54], radius=6, fill=ACCENT_BLUE)
    draw.text((46, 24), "A2A", fill=TEXT_WHITE)
    draw.text((88, 25), "Gateway", fill=TEXT_WHITE)

    # Nav items
    navs = ["Tasks", "Agents", "Gateway"]
    x = 220
    for n in navs:
        is_active = (n.lower() in title.lower()) or (n == "Tasks" and "Timeline" in title)
        if is_active:
            draw.rounded_rectangle([x - 8, 20, x + 65, 50], radius=4, fill=(30, 41, 59))
            draw.text((x, 26), n, fill=TEXT_WHITE)
        else:
            draw.text((x, 26), n, fill=TEXT_MUTED)
        x += 90

    # WS status indicator
    draw.rounded_rectangle([WIDTH - 220, 20, WIDTH - 120, 50], radius=4, fill=(15, 23, 42), outline=BORDER_COLOR)
    draw.ellipse([WIDTH - 205, 31, WIDTH - 195, 41], fill=ACCENT_GREEN)
    draw.text((WIDTH - 185, 26), "Open", fill=TEXT_WHITE)

    # Key status
    draw.rounded_rectangle([WIDTH - 110, 20, WIDTH - 40, 50], radius=4, fill=(15, 23, 42), outline=BORDER_COLOR)
    draw.text((WIDTH - 98, 26), "Key Set", fill=ACCENT_GREEN)

    return img, draw

def generate_triage_screenshot():
    img, draw = create_base_canvas("Tasks")
    # Title
    draw.text((40, 95), "Tasks", fill=TEXT_WHITE)
    draw.text((40, 120), "Triage feed: live tasks ordered by failure and urgency", fill=TEXT_MUTED)

    # Card 1: Needs Attention
    draw.rounded_rectangle([40, 160, WIDTH - 40, 360], radius=8, fill=CARD_BG, outline=BORDER_COLOR)
    draw.rectangle([40, 160, WIDTH - 40, 205], fill=(69, 10, 10))
    draw.line([40, 160, 44, 360], fill=ACCENT_RED, width=4)
    draw.text((60, 172), "NEEDS ATTENTION (2) - Failed & Input Required", fill=(252, 165, 165))

    # Rows
    y = 220
    tasks_fail = [
        ("failed", "task-8f92-die", "upstream connection reset after 3 events", "3s ago", "1.5s"),
        ("input-required", "task-3a1b-prompt", "Awaiting caller feedback on parameter choices", "12s ago", "4.2s"),
    ]
    for state, tid, preview, time_str, dur in tasks_fail:
        color = ACCENT_RED if state == "failed" else ACCENT_ORANGE
        draw.rounded_rectangle([60, y, 150, y + 24], radius=12, fill=(30, 41, 59), outline=color)
        draw.text((70, y + 5), state, fill=color)
        draw.text((170, y + 5), tid, fill=TEXT_WHITE)
        draw.text((380, y + 5), preview, fill=TEXT_MUTED)
        draw.text((1200, y + 5), time_str, fill=TEXT_DIM)
        draw.text((1400, y + 5), dur, fill=TEXT_DIM)
        draw.line([40, y + 35, WIDTH - 40, y + 35], fill=BORDER_COLOR, width=1)
        y += 50

    # Card 2: In Flight
    draw.rounded_rectangle([40, 380, WIDTH - 40, 580], radius=8, fill=CARD_BG, outline=BORDER_COLOR)
    draw.rectangle([40, 380, WIDTH - 40, 425], fill=(15, 23, 42))
    draw.text((60, 392), "IN FLIGHT (2) - Working & Submitted", fill=ACCENT_BLUE)

    y = 440
    tasks_flight = [
        ("working", "task-research-94", "Step 3/6: Synthesizing retrieved documents", "1s ago", "2.1s"),
        ("submitted", "task-echo-12", "Task received by gateway", "just now", "0.2s"),
    ]
    for state, tid, preview, time_str, dur in tasks_flight:
        draw.rounded_rectangle([60, y, 140, y + 24], radius=12, fill=(30, 41, 59), outline=ACCENT_BLUE)
        draw.text((70, y + 5), state, fill=ACCENT_BLUE)
        draw.text((170, y + 5), tid, fill=TEXT_WHITE)
        draw.text((380, y + 5), preview, fill=TEXT_MUTED)
        draw.text((1200, y + 5), time_str, fill=TEXT_DIM)
        draw.text((1400, y + 5), dur, fill=TEXT_DIM)
        draw.line([40, y + 35, WIDTH - 40, y + 35], fill=BORDER_COLOR, width=1)
        y += 50

    # Card 3: Recent Terminal
    draw.rounded_rectangle([40, 600, WIDTH - 40, 840], radius=8, fill=CARD_BG, outline=BORDER_COLOR)
    draw.rectangle([40, 600, WIDTH - 40, 645], fill=(15, 23, 42))
    draw.text((60, 612), "RECENT TERMINAL (3) - Completed & Canceled", fill=TEXT_MUTED)

    y = 660
    tasks_term = [
        ("completed", "task-echo-11", "Instant completion with echo artifact", "25s ago", "0.05s"),
        ("completed", "task-research-93", "Research complete. Artifact report generated.", "52s ago", "4.02s"),
        ("canceled", "task-search-08", "Canceled by client timeout", "1m ago", "1.2s"),
    ]
    for state, tid, preview, time_str, dur in tasks_term:
        color = ACCENT_GREEN if state == "completed" else TEXT_DIM
        draw.rounded_rectangle([60, y, 150, y + 24], radius=12, fill=(30, 41, 59), outline=color)
        draw.text((70, y + 5), state, fill=color)
        draw.text((170, y + 5), tid, fill=TEXT_MUTED)
        draw.text((380, y + 5), preview, fill=TEXT_DIM)
        draw.text((1200, y + 5), time_str, fill=TEXT_DIM)
        draw.text((1400, y + 5), dur, fill=TEXT_DIM)
        draw.line([40, y + 35, WIDTH - 40, y + 35], fill=BORDER_COLOR, width=1)
        y += 50

    img.save("docs/assets/triage.png", "PNG")

def generate_timeline_screenshot():
    img, draw = create_base_canvas("Timeline")

    # Header strip
    draw.rounded_rectangle([40, 95, WIDTH - 40, 200], radius=8, fill=CARD_BG, outline=BORDER_COLOR)
    draw.text((60, 110), "Task: task-8f92-die", fill=TEXT_WHITE)
    draw.rounded_rectangle([250, 108, 320, 128], radius=10, fill=(45, 10, 10), outline=ACCENT_RED)
    draw.text((260, 112), "failed", fill=ACCENT_RED)
    draw.text((1300, 110), "Started: 10:45:00 UTC | Duration: 1.52s", fill=TEXT_MUTED)

    # Hero Alert Banner
    draw.rounded_rectangle([60, 140, WIDTH - 60, 185], radius=6, fill=(67, 20, 7), outline=ACCENT_ORANGE)
    draw.text((75, 152), "Task ended abnormally: gateway observed upstream connection reset after 3 events", fill=(254, 215, 170))
    draw.text((WIDTH - 250, 152), "Jump to event #4", fill=ACCENT_ORANGE)

    # Timeline Area
    draw.rounded_rectangle([40, 220, WIDTH - 40, 920], radius=8, fill=CARD_BG, outline=BORDER_COLOR)
    draw.line([100, 240, 100, 900], fill=BORDER_COLOR, width=2)

    events = [
        ("#1", "0 ms", "status-update", "submitted", "Task submitted to research worker", False),
        ("#2", "+501 ms", "status-update", "working", "Step 1 in progress: querying index", False),
        ("#3", "+1002 ms", "status-update", "working", "Step 2: critical processing imminent", False),
        ("#4", "+1503 ms", "gateway.note", "failed", "gateway observed: upstream connection reset after 3 events", True),
    ]

    y = 250
    for seq, lat, kind, state, msg, is_forensic in events:
        dot_color = ACCENT_ORANGE if is_forensic else (ACCENT_BLUE if kind == "status-update" else ACCENT_GREEN)
        draw.ellipse([94, y + 10, 106, y + 22], fill=dot_color)

        box_color = (45, 15, 5) if is_forensic else (20, 27, 45)
        border_col = ACCENT_ORANGE if is_forensic else BORDER_COLOR
        draw.rounded_rectangle([130, y, WIDTH - 80, y + 130], radius=6, fill=box_color, outline=border_col)

        draw.text((150, y + 12), seq, fill=TEXT_DIM)
        draw.text((190, y + 12), kind, fill=ACCENT_ORANGE if is_forensic else ACCENT_BLUE)
        draw.text((320, y + 12), state, fill=ACCENT_RED if state == "failed" else ACCENT_BLUE)
        draw.text((WIDTH - 200, y + 12), lat, fill=TEXT_MUTED)

        draw.text((150, y + 42), msg, fill=TEXT_WHITE)

        # Raw payload box
        draw.rounded_rectangle([150, y + 70, WIDTH - 100, y + 115], radius=4, fill=(10, 14, 23))
        draw.text((165, y + 85), '{"jsonrpc": "2.0", "result": {"taskId": "task-8f92-die", "kind": "' + kind + '", ...}}', fill=TEXT_DIM)

        y += 160

    img.save("docs/assets/timeline.png", "PNG")

def generate_agents_screenshot():
    img, draw = create_base_canvas("Agents")
    draw.text((40, 95), "Agents", fill=TEXT_WHITE)
    draw.text((40, 120), "Registered upstream A2A agents and route bindings", fill=TEXT_MUTED)

    draw.rounded_rectangle([WIDTH - 200, 95, WIDTH - 40, 135], radius=6, fill=ACCENT_BLUE)
    draw.text((WIDTH - 170, 107), "+ Register Agent", fill=TEXT_WHITE)

    agents = [
        ("Research Agent", "http://research:8102", "v0.1.0", "/gw/research", True),
        ("Echo Agent", "http://echo:8101", "v0.1.0", "/gw/echo", True),
        ("Flaky Agent", "http://flaky:8103", "v0.1.0", "/gw/flaky", True),
    ]

    y = 160
    for name, url, ver, route, healthy in agents:
        draw.rounded_rectangle([40, y, WIDTH - 40, y + 90], radius=8, fill=CARD_BG, outline=BORDER_COLOR)
        draw.ellipse([65, y + 38, 77, y + 50], fill=ACCENT_GREEN if healthy else TEXT_DIM)
        draw.text((95, y + 25), name, fill=TEXT_WHITE)
        draw.text((250, y + 27), ver, fill=TEXT_DIM)
        draw.text((95, y + 52), url, fill=TEXT_MUTED)

        draw.rounded_rectangle([WIDTH - 220, y + 30, WIDTH - 80, y + 60], radius=4, fill=(15, 23, 42), outline=BORDER_COLOR)
        draw.text((WIDTH - 200, y + 38), route, fill=ACCENT_BLUE)
        y += 110

    img.save("docs/assets/agents.png", "PNG")

def generate_gateway_screenshot():
    img, draw = create_base_canvas("Gateway")
    draw.text((40, 95), "Gateway Settings", fill=TEXT_WHITE)
    draw.text((40, 120), "Active routes, API key issuance, and live traffic stats", fill=TEXT_MUTED)

    # Stats strip
    draw.rounded_rectangle([40, 160, 390, 260], radius=8, fill=CARD_BG, outline=BORDER_COLOR)
    draw.text((60, 175), "THROUGHPUT", fill=TEXT_MUTED)
    draw.text((60, 205), "18.4 ev/s", fill=TEXT_WHITE)

    draw.rounded_rectangle([420, 160, 770, 260], radius=8, fill=CARD_BG, outline=BORDER_COLOR)
    draw.text((440, 175), "ACTIVE TASKS", fill=TEXT_MUTED)
    draw.text((440, 205), "4 working", fill=ACCENT_BLUE)

    draw.rounded_rectangle([800, 160, 1150, 260], radius=8, fill=CARD_BG, outline=BORDER_COLOR)
    draw.text((820, 175), "FAILED TASKS", fill=TEXT_MUTED)
    draw.text((820, 205), "1 attention", fill=ACCENT_RED)

    draw.rounded_rectangle([1180, 160, 1560, 260], radius=8, fill=CARD_BG, outline=BORDER_COLOR)
    draw.text((1200, 175), "DROPPED EVENTS", fill=TEXT_MUTED)
    draw.text((1200, 205), "0 dropped", fill=ACCENT_GREEN)

    # Routes
    draw.rounded_rectangle([40, 290, WIDTH - 40, 560], radius=8, fill=CARD_BG, outline=BORDER_COLOR)
    draw.text((60, 310), "Gateway Routes", fill=TEXT_WHITE)
    routes = [
        ("/gw/research", "Research Agent", "Active"),
        ("/gw/echo", "Echo Agent", "Active"),
        ("/gw/flaky", "Flaky Agent", "Active"),
    ]
    ry = 360
    for rpath, target, status in routes:
        draw.text((60, ry), rpath, fill=ACCENT_BLUE)
        draw.text((400, ry), target, fill=TEXT_WHITE)
        draw.text((900, ry), status, fill=ACCENT_GREEN)
        draw.line([40, ry + 30, WIDTH - 40, ry + 30], fill=BORDER_COLOR, width=1)
        ry += 55

    # Keys
    draw.rounded_rectangle([40, 590, WIDTH - 40, 860], radius=8, fill=CARD_BG, outline=BORDER_COLOR)
    draw.text((60, 610), "API Keys", fill=TEXT_WHITE)
    keys = [
        ("production-runner", "a2a_8fa1...", "2026-11-13"),
        ("dev-client", "a2a_39df...", "2026-11-13"),
    ]
    ky = 660
    for kname, kpref, kdate in keys:
        draw.text((60, ky), kname, fill=TEXT_WHITE)
        draw.text((400, ky), kpref, fill=TEXT_MUTED)
        draw.text((800, ky), kdate, fill=TEXT_DIM)
        draw.text((WIDTH - 150, ky), "Revoke", fill=ACCENT_RED)
        draw.line([40, ky + 30, WIDTH - 40, ky + 30], fill=BORDER_COLOR, width=1)
        ky += 55

    img.save("docs/assets/gateway.png", "PNG")

def generate_hero_gif():
    # Generate multi-frame animated GIF showing flow:
    # Frame 1: Terminal running compose
    # Frame 2: Triage populating
    # Frame 3: Clicking flaky:die failure
    # Frame 4: Timeline with forensic gateway.note
    frames = []

    # Frame 1: Compose startup
    f1 = Image.new("RGB", (900, 500), (15, 23, 42))
    d1 = ImageDraw.Draw(f1)
    d1.rectangle([0, 0, 900, 35], fill=(30, 41, 59))
    d1.text((20, 10), "Terminal - docker compose --profile demo up", fill=TEXT_WHITE)
    d1.text((30, 60), "$ docker compose --profile demo up", fill=ACCENT_GREEN)
    d1.text((30, 90), "[+] Running 7/7", fill=TEXT_WHITE)
    d1.text((30, 120), " ✔ Network a2a-gateway_default   Created", fill=TEXT_MUTED)
    d1.text((30, 150), " ✔ Container a2a-gateway-postgres-1 Healthy", fill=ACCENT_GREEN)
    d1.text((30, 180), " ✔ Container a2a-gateway-redis-1    Healthy", fill=ACCENT_GREEN)
    d1.text((30, 210), " ✔ Container a2a-gateway-api-1      Started [0.0.0.0:8000]", fill=ACCENT_GREEN)
    d1.text((30, 240), " ✔ Container a2a-gateway-echo-1     Started", fill=TEXT_MUTED)
    d1.text((30, 270), " ✔ Container a2a-gateway-research-1 Started", fill=TEXT_MUTED)
    d1.text((30, 300), " ✔ Container a2a-gateway-flaky-1    Started", fill=TEXT_MUTED)
    d1.text((30, 330), " ✔ Container a2a-gateway-traffic-1  Started", fill=TEXT_MUTED)
    d1.text((30, 380), "[traffic] Submitting realistic mix to /gw/*...", fill=ACCENT_BLUE)
    frames.append(f1)

    # Frame 2: Triage view with incoming stream
    f2 = Image.new("RGB", (900, 500), BG_COLOR)
    d2 = ImageDraw.Draw(f2)
    d2.rectangle([0, 0, 900, 40], fill=(15, 23, 42))
    d2.text((20, 12), "A2A Gateway - Tasks Triage", fill=TEXT_WHITE)
    d2.text((WIDTH - 200, 12), "WS Live", fill=ACCENT_GREEN)
    d2.rounded_rectangle([20, 60, 880, 220], radius=6, fill=CARD_BG, outline=BORDER_COLOR)
    d2.text((35, 75), "IN FLIGHT TASKS (2)", fill=ACCENT_BLUE)
    d2.text((35, 110), "working", fill=ACCENT_BLUE)
    d2.text((120, 110), "task-research-101", fill=TEXT_WHITE)
    d2.text((300, 110), "Step 4/6: Formulating analytical model", fill=TEXT_MUTED)
    d2.text((35, 160), "submitted", fill=TEXT_DIM)
    d2.text((120, 160), "task-echo-204", fill=TEXT_WHITE)
    d2.text((300, 160), "Echo ping task #204", fill=TEXT_MUTED)
    frames.append(f2)

    # Frame 3: Failure lands in Needs Attention
    f3 = Image.new("RGB", (900, 500), BG_COLOR)
    d3 = ImageDraw.Draw(f3)
    d3.rectangle([0, 0, 900, 40], fill=(15, 23, 42))
    d3.text((20, 12), "A2A Gateway - Tasks Triage", fill=TEXT_WHITE)
    d3.rounded_rectangle([20, 60, 880, 200], radius=6, fill=CARD_BG, outline=ACCENT_RED)
    d3.text((35, 75), "NEEDS ATTENTION (1) - Jumps to top immediately", fill=ACCENT_RED)
    d3.text((35, 115), "failed", fill=ACCENT_RED)
    d3.text((110, 115), "task-flaky-99", fill=TEXT_WHITE)
    d3.text((260, 115), "upstream connection reset after 3 events", fill=ACCENT_RED)
    d3.text((750, 115), "-> CLICK TO INSPECT", fill=ACCENT_BLUE)
    frames.append(f3)

    # Frame 4: Timeline view with forensic gateway.note
    f4 = Image.new("RGB", (900, 500), BG_COLOR)
    d4 = ImageDraw.Draw(f4)
    d4.rectangle([0, 0, 900, 40], fill=(15, 23, 42))
    d4.text((20, 12), "A2A Gateway - Task Timeline: task-flaky-99", fill=TEXT_WHITE)

    d4.rounded_rectangle([20, 55, 880, 105], radius=6, fill=(67, 20, 7), outline=ACCENT_ORANGE)
    d4.text((35, 75), "Task ended abnormally: gateway observed upstream connection reset after 3 events", fill=(254, 215, 170))

    d4.rounded_rectangle([20, 120, 880, 470], radius=6, fill=CARD_BG, outline=BORDER_COLOR)
    d4.text((40, 140), "#1  status-update  submitted  | Task received", fill=TEXT_MUTED)
    d4.text((40, 190), "#2  status-update  working    | Step 1 in progress", fill=TEXT_MUTED)
    d4.text((40, 240), "#3  status-update  working    | Step 2 failure imminent", fill=TEXT_MUTED)
    d4.rounded_rectangle([35, 280, 865, 360], radius=6, fill=(45, 15, 5), outline=ACCENT_ORANGE)
    d4.text((50, 300), "#4  gateway.note   failed     | gateway observed: upstream connection reset after 3 events", fill=ACCENT_ORANGE)
    d4.text((50, 330), "Forensic evidence recorded at proxy layer: process reset socket without completing stream.", fill=TEXT_MUTED)
    frames.append(f4)

    # Save animated GIF (each frame displayed 2.5 seconds, looping)
    frames[0].save(
        "docs/assets/hero.gif",
        save_all=True,
        append_images=frames[1:],
        duration=[2500, 2500, 2500, 3500],
        loop=0,
        optimize=True,
    )
    print("Assets generated successfully.")

if __name__ == "__main__":
    generate_triage_screenshot()
    generate_timeline_screenshot()
    generate_agents_screenshot()
    generate_gateway_screenshot()
    generate_hero_gif()

