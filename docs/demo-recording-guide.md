# How to Create the Jaw-Dropping OAHL Demo GIF

The goal: Show an AI agent seamlessly establishing a remote session with a real Android device (TECNO phone), issuing a hardware-level command, and retrieving a clean execution result. 

## Requirements
1. **Asciinema** (https://asciinema.org/) to record terminal activity.
2. A terminal with two split panes (or multiple tabs you can quickly switch between).
3. Optionally, tools like `svg-term-cli` or `agg` (Asciinema GIF Generator) to convert the cast into an SVG or GIF.

## The Script (Step-by-Step)

We will simulate a local node recognizing the phone, and then an agent interacting with it via the CLI/SDK.

### Pane 1: The Hardware Node
1. Connect your TECNO phone via USB and ensure USB debugging is enabled.
2. Start the recording: `asciinema rec demo.cast`
3. Run `oahl scan-ports`
   _Output will show "Discovered: TECNO Mobile Limited ... Assigning transport: ADB"_
4. Run `oahl start`
   _Output will state "Node OAHL-LAB-01 started on port 3000. Device [TECNO-01] registered to cloud."_

### Pane 2: The Agent (Using Gemini CLI / Python Script)
5. Switch to Pane 2. Run your agent script:
   `python ai_phone_agent.py "Get the battery level and take a screenshot of the home screen"`
6. The terminal will print out the AI's internal thought process to show it's using tools:
   - `[Agent] Requesting capability: oahl.discover (Query: mobile)`
   - `[Agent] Found Node: OAHL-LAB-01, Device: TECNO-01`
   - `[Agent] Requesting session reserve...`
   - `[Agent] Executing transport command: adb shell dumpsys battery`
   - `[OAHL] Success: Payload returned (Level: 84%, Status: Discharging)`
   - `[Agent] Executing transport command: adb shell screencap -p /sdcard/screen.png`
   - `[Agent] Pulling screenshot asset...`
   - `[Agent] Releasing session.`
   - `[Agent] Task complete. Phone battery is 84%, screenshot saved to local disk.`

### End Recording
7. Stop recording via `Ctrl+D` or `exit`.
8. Convert the output to a beautiful, crisp animated gif (or SVG):
   ```bash
   agg demo.cast demo.gif --theme dracula --font-size 18
   ```
   Or using svg-term:
   ```bash
   svg-term --in demo.cast --out demo.svg --window
   ```

## Tips for max impact
- Move quickly so the GIF is under 30 seconds.
- You can heavily script/mock the Python agent output so you don't actually have to wait on LLM API calls during the recording—the visual effect of the text flowing fast is what matters!
- Place the finalized `demo.gif` or `demo.svg` into the `/assets` folder and it will automatically show up in the README.
