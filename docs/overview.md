# Agent Hardware Cloud (OAHL) Overview

The **Open Agent Hardware Layer (OAHL)** is the foundational protocol for the **Agent Hardware Cloud**. It aims to bridge the gap between autonomous AI agents and physical hardware devices scattered across the globe.

Current AI agents are trapped in software. They can browse the web, run code, and call APIs, but they cannot directly interact with the physical world. If a developer wants an agent to see through a real camera, tune a radio, or read a physical sensor, they must build bespoke integrations.

**OAHL** changes this by standardizing how hardware is exposed, requested, and utilized by agents.

## The Three Pillars of OAHL

The project is split into three main components to make the ecosystem work securely and at scale:

1. **The CLI (`@oahl/cli`)**: 
   A command-line wizard for hardware owners. It makes connecting hardware a simple "plug and play" experience. Users run `oahl init`, answer a few questions, and the CLI automatically configures the correct adapters and safety policies. No coding required for standard hardware.

2. **The Local Node (`@oahl/server`)**: 
   The open-source daemon running on the hardware owner's machine (laptop, Raspberry Pi, server). It acts as a secure wrapper, intercepting API capability requests (like `camera.capture`) and running the actual physical device drivers locally.

3. **The Cloud Registry (`@oahl/cloud`)**: 
   The central matchmaking brain. Local nodes connect *outbound* to the cloud to announce they are online and list their capabilities. AI Agents ask the cloud for hardware, and the cloud dynamically routes the session to an available remote node. Agents never connect directly to the hardware owner's machine.

## Value Proposition
- **For Hardware Owners:** Monetize or share idle hardware (cameras, SDRs, robotic arms) safely, backed by strict policies that prevent unauthorized or dangerous operations.
- **For Agent Developers:** Give agents access to physical-world capabilities instantly by implementing simple standardized tools/skills, without touching embedded code or drivers.

## Core Concepts
- **Devices:** Physical hardware entities attached to an OAHL Node.
- **Adapters:** Wrappers that translate raw device drivers (like OpenCV or RTL-SDR binaries) into standardized functions.
- **Capabilities:** Standardized API actions like `capture_image` or `scan_spectrum`. Agents request capabilities, not devices.
- **Sessions:** Time-bound, exclusive access control.
- **Policies:** Safety rules preventing misuse, such as "receive-only", "maximum 5 minutes", or "disable transmit". 
