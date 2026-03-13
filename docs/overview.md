# Agent Hardware Cloud (OAHL) Overview

The **Open Agent Hardware Layer (OAHL)** is the foundational protocol for the **Agent Hardware Cloud**. It aims to bridge the gap between autonomous AI agents and physical hardware devices scattered across the globe.

Current AI agents are trapped in software. They can browse the web, run code, and call APIs, but they cannot directly interact with the physical world. If a developer wants an agent to see through a real camera, tune a radio, or read a physical sensor, they must build bespoke integrations.

**OAHL** changes this by standardizing how hardware is exposed, requested, and utilized by agents.

## The Vision: Hardware-as-a-Service for AI Agents
Imagine an ecosystem similar to AWS or Stripe, but for physical hardware capabilities. 
1. **Hardware Owners** (universities, labs, individuals) connect idle devices using the OAHL Node software. 
2. The Node automatically wraps devices with **Adapters**, safely translating raw hardware signals into a uniform capability schema (e.g., `camera.capture`).
3. **AI Agents** connect to the cloud control plane, querying a registry of available capabilities and requesting sessions on remote devices, without needing to know the specific brand, model, or driver of the physical hardware.

## Value Proposition
- **For Hardware Owners:** Monetize or share idle hardware (cameras, SDRs, robotic arms) safely, backed by strict policies that prevent unauthorized or dangerous operations.
- **For Agent Developers:** Give agents access to physical-world capabilities instantly by implementing simple standardized tools/skills, without touching embedded code or drivers.

## Core Concepts
- **Devices:** Physical hardware entities attached to an OAHL Node.
- **Adapters:** Wrappers that translate raw device drivers (like OpenCV or RTL-SDR binaries) into standardized functions.
- **Capabilities:** Standardized API actions like `capture_image` or `scan_spectrum`. Agents request capabilities, not devices.
- **Sessions:** Time-bound, exclusive access control.
- **Policies:** Safety rules preventing misuse, such as "receive-only", "maximum 5 minutes", or "disable transmit". 
