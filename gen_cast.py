import json
import time

frames = [
    # Initial pause
    (0.5, "o", "$ "),

    # Typing: oahl scan-ports
    (0.1, "o", "o"),
    (0.1, "o", "a"),
    (0.1, "o", "h"),
    (0.1, "o", "l"),
    (0.1, "o", " "),
    (0.1, "o", "s"),
    (0.1, "o", "c"),
    (0.1, "o", "a"),
    (0.1, "o", "n"),
    (0.1, "o", "-"),
    (0.1, "o", "p"),
    (0.1, "o", "o"),
    (0.1, "o", "r"),
    (0.1, "o", "t"),
    (0.1, "o", "s"),
    (0.4, "o", "\r\n"),
    
    # Output of oahl scan-ports
    (0.5, "o", "\x1b[36m\u25b6 Scanning for USB/Serial devices...\x1b[0m\r\n"),
    (0.8, "o", "\x1b[32m\u2714\x1b[0m Discovered: \x1b[1mTECNO Mobile Limited (TECNO-01)\x1b[0m\r\n"),
    (0.1, "o", "  \u2514\u2500 Assigning transport: \x1b[35mADB\x1b[0m\r\n"),
    (0.5, "o", "$ "),

    # Typing: oahl start
    (0.6, "o", "o"),
    (0.1, "o", "a"),
    (0.1, "o", "h"),
    (0.1, "o", "l"),
    (0.1, "o", " "),
    (0.1, "o", "s"),
    (0.1, "o", "t"),
    (0.1, "o", "a"),
    (0.1, "o", "r"),
    (0.1, "o", "t"),
    (0.4, "o", "\r\n"),

    # Output of oahl start
    (0.5, "o", "\x1b[33m\u26a1 Node OAHL-LAB-01 starting...\x1b[0m\r\n"),
    (0.3, "o", "\x1b[32m\u2714\x1b[0m Node \x1b[1mOAHL-LAB-01\x1b[0m listening on port 3000\r\n"),
    (0.4, "o", "\x1b[34m\u2191\x1b[0m Device \x1b[1m[TECNO-01]\x1b[0m successfully registered to Cloud Directory.\r\n"),
    (1.0, "o", "$ "),

    # Typing: python agent.py "Get battery and take screenshot"
    (0.8, "o", "p"),
    (0.05, "o", "y"),
    (0.05, "o", "t"),
    (0.05, "o", "h"),
    (0.05, "o", "o"),
    (0.05, "o", "n"),
    (0.05, "o", " "),
    (0.05, "o", "a"),
    (0.05, "o", "g"),
    (0.05, "o", "e"),
    (0.05, "o", "n"),
    (0.05, "o", "t"),
    (0.05, "o", "."),
    (0.05, "o", "p"),
    (0.05, "o", "y"),
    (0.05, "o", " "),
    (0.05, "o", "\""),
    (0.05, "o", "G"),
    (0.05, "o", "e"),
    (0.05, "o", "t"),
    (0.05, "o", " "),
    (0.05, "o", "b"),
    (0.05, "o", "a"),
    (0.05, "o", "t"),
    (0.05, "o", "t"),
    (0.05, "o", "e"),
    (0.05, "o", "r"),
    (0.05, "o", "y"),
    (0.05, "o", " "),
    (0.05, "o", "&"),
    (0.05, "o", " "),
    (0.05, "o", "s"),
    (0.05, "o", "c"),
    (0.05, "o", "r"),
    (0.05, "o", "e"),
    (0.05, "o", "e"),
    (0.05, "o", "n"),
    (0.05, "o", "s"),
    (0.05, "o", "h"),
    (0.05, "o", "o"),
    (0.05, "o", "t"),
    (0.05, "o", "\""),
    (0.5, "o", "\r\n"),

    # Agent output
    (0.3, "o", "\x1b[90m[Agent]\x1b[0m Initializing OAHL Cloud Client...\r\n"),
    (0.4, "o", "\x1b[90m[Agent]\x1b[0m Requesting capability \x1b[36moahl.discover\x1b[0m (query: mobile)\r\n"),
    (0.6, "o", "\x1b[90m[Agent]\x1b[0m \x1b[32mFound Match\x1b[0m -> Node: \x1b[1mOAHL-LAB-01\x1b[0m, Device: \x1b[1mTECNO-01\x1b[0m\r\n"),
    (0.4, "o", "\x1b[90m[Agent]\x1b[0m Requesting exclusive session... "),
    (0.5, "o", "\x1b[32mGRANTED\x1b[0m (Session ID: \x1b[35msess_9x2a4\x1b[0m)\r\n"),
    
    (0.8, "o", "\x1b[90m[Agent]\x1b[0m \x2692\xfe0f Executing transport capability: \x1b[33madb shell dumpsys battery\x1b[0m\r\n"),
    (0.6, "o", "\x1b[32m[OAHL]\x1b[0m Success: Payload returned (Level: \x1b[1m84%\x1b[0m, Status: \x1b[1mDischarging\x1b[0m)\r\n"),

    (0.8, "o", "\x1b[90m[Agent]\x1b[0m \x2692\xfe0f Executing transport capability: \x1b[33madb shell screencap -p /sdcard/s.png\x1b[0m\r\n"),
    (1.2, "o", "\x1b[32m[OAHL]\x1b[0m Success: Execution complete.\r\n"),
    
    (0.4, "o", "\x1b[90m[Agent]\x1b[0m \u2193 Pulling screenshot asset... \x1b[32mDone. (1.4MB)\x1b[0m\r\n"),
    (0.3, "o", "\x1b[90m[Agent]\x1b[0m Releasing session lock... \x1b[32mRELEASED\x1b[0m\r\n"),
    
    (0.5, "o", "\r\n\x1b[1m\u2728 Task Complete:\x1b[0m Phone battery is 84%, screenshot saved to local disk.\r\n"),
    (0.5, "o", "$ "),
]

header = {
    "version": 2, 
    "width": 90, 
    "height": 20, 
    "timestamp": int(time.time()), 
    "env": {"SHELL": "/bin/bash", "TERM": "xterm-256color"}
}

with open("d:\\oahl\\demo.cast", "w", encoding="utf-8") as f:
    f.write(json.dumps(header) + "\n")
    current_time = 0.0
    for frame in frames:
        delay, type_, data = frame
        current_time += delay
        f.write(json.dumps([round(current_time, 2), type_, data]) + "\n")

print("Created demo.cast")
