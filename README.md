<p align="center">
  <img src="./assets/oahl-banner.svg" alt="OAHL Banner" width="100%" />
</p>

# Open Agent Hardware Layer (OAHL)

Open Agent Hardware Layer is an open-source framework for exposing real hardware capabilities to AI agents through standardized APIs.

It allows hardware owners to connect physical devices such as cameras, SDRs, sensors, phones, and robots to a node, declare supported capabilities, and make them accessible to agent systems in a safe and consistent way. 

## Why this exists

AI agents today can use software, web tools, and cloud APIs, but they usually cannot interact with physical hardware without custom integration work.

This project provides a common layer for:
- **hardware providers** who want to expose devices.
- **developers** who want agents to use physical-world capabilities.
- **platforms** that want to build agent-to-hardware marketplaces (Agent Hardware Cloud).

## Core concepts

- **Node:** A service installed on a machine connected to hardware.
- **Adapter:** A device-specific integration that translates hardware commands into standard capabilities.
- **Capability:** A standardized action such as `camera.capture` or `radio.scan`. 
- **Session:** A controlled allocation of a hardware resource for a specific request.
- **Policy:** Rules that limit what can be done with a device or capability.
- **Cloud Registry:** The central hub where local nodes register themselves so remote agents can discover and request hardware globally.

## Quick start (For Hardware Owners)

You don't need to write any code to connect common hardware (like webcams or standard SDRs). 

### 1. Install the CLI & Node Server
Install the OAHL toolkit globally via npm:
```bash
npm install -g @fredabila/oahl
```

### 2. Run the Setup Wizard
```bash
oahl init
```
This interactive tool will ask you a few simple questions (like your lab name and what type of hardware you are plugging in) and automatically generate your `oahl-config.json` file with the correct safety policies and pre-built adapters.

### 3. Start your Node

**Option A: Using NPM (Recommended for beginners)**
If you have Node.js installed, simply run:
```bash
oahl start
```
*(This starts the local daemon, loads your configuration, and connects to the Cloud Registry).*

**Option B: Using Docker**
If you prefer running isolated containers:
```bash
docker run -d \
  --name oahl-node \
  -p 8080:8080 \
  -v $(pwd)/oahl-config.json:/app/oahl-config.json \
  --device=/dev/video0 \
  oahl/node:latest
```

## Cloud Infrastructure

The `@oahl/cloud` package contains the hosted infrastructure that connects agents and nodes. 

When your node starts up, it securely registers itself with the Cloud Registry. AI Agents connect to this Cloud Registry (not your node directly) to request access to capabilities.

## Documentation

See the `docs/` folder for:
- [Architecture Overview](docs/architecture.md)
- [Hardware Owner Guide](docs/hardware-owner-guide.md)
- [Adapter Guide](docs/adapter-guide.md)
- [Security and Policy Guide](docs/security-guide.md)
- [Agent Integration Guide](docs/agent-integration-guide.md)
- [API Reference](docs/api-reference.md)

## License
Apache 2.0 or MIT.
