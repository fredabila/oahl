# 20+ Good First Issues for OAHL

*This document contains issues you can create on GitHub to help onboard new contributors. Label them with predefined `good first issue` and `help wanted` tags on GitHub.*

## 🔌 Adapters & Transports
1. **[New Feature] Add Serial/UART transport plugin**  
   - Description: The `transport-serial` plugin is fundamental for embedded devices. Allow agents to establish raw serial pipelines (baud, parity) and send byte-streams via node interfaces.
2. **[New Feature] Add MQTT transport plugin**  
   - Description: Create an MQTT transport plugin so local OAHL nodes can hook into existing smart-home MQTT brokers, passing standard JSON payloads directly from agents.
3. **[New Feature] Add BLE transport plugin**  
   - Description: Build the `@oahl/transport-ble` package wrapping `noble` so agents can discover and pair with nearby Bluetooth Low Energy devices.
4. **[New Adapter] Write adapter for IP cameras (RTSP)**  
   - Description: Add an adapter in `adapters/adapter-ip-camera` that uses `ffmpeg` or `node-rtsp-stream` to expose IP cameras as the standard `camera` capability.
5. **[New Adapter] Add Raspberry Pi GPIO adapter**  
   - Description: Add `@oahl/adapter-rpi-gpio` so agents can toggle pins natively using `rpio` or `onoff` libraries directly.
6. **[New Adapter] Add adapter for Arduino via Firmata**  
   - Description: An adapter utilizing the `firmata` library to let AI manipulate Arduino pins/sensors without rewriting firmware.
7. **[New Adapter] Write adapter for TP-Link Kasa smart plugs**  
   - Description: Expose basic relay/switch capabilities (`power.on`, `power.off`) for Kasa smart plugs natively through OAHL.
8. **[New Transport] Add transport plugin for I2C/SPI**  
   - Description: Allow low-level IC control for agents running on SBCs using I2C/SPI node bindings.

## 🛠 Platform Core
9. **[Bug/Enhancement] Improve error messages for session timeout edge cases**  
   - Description: Agents holding onto reserved devices forever need to be interrupted gracefully. Specifically, return HTTP 408 / structured error codes instead of cryptic 500s when timeouts occur.
10. **[Test] Add integration test for multi-device concurrency**  
    - Description: Write an integration test suite validating that multiple simulated agents can request different devices simultaneously on the same Node without race conditions.
11. **[Enhancement] Add support for multiple concurrent sessions (read-only devices)**  
    - Description: Enable a `readonly` access mode for certain devices (like thermometers) where multiple agents can subscribe simultaneously without strict exclusive locking.
12. **[Enhancement] Implement graceful node shutdown signal handling**  
    - Description: Catch `SIGINT/SIGTERM` in the local node server, releasing all locked devices and gracefully disconnecting from the OS.
13. **[Enhancement] Add rate limiting policy controls to Agent requests**  
    - Description: Give Node operators the ability to specify rate limits (e.g. max 5 requests / sec per agent) within their device policies in `oahl-config.json`.
14. **[Tooling] Add health check ping command to CLI**  
    - Description: Something as simple as `oahl ping --target <node_id>` to check if the node / agent cloud relay is actively receiving.
15. **[Tooling] Automate Docker image build process via GitHub Actions**  
    - Description: Automatically push new multi-arch docker images to Docker-hub `/ghcr.io` whenever `packages/server` changes.
16. **[Enhancement] Refactor logger to support external structured logging**  
    - Description: Provide an adapter to pass internal Pino logs out to Datadog or ELK via stdout JSON standard.
17. **[Bug/Enhancement] Improve startup validation of `oahl-config.json` against schema**  
    - Description: Fail loudly & precisely on boot using AJV if the user's config doesn't exactly match `oahl-config.schema.json`.

## 📚 Documentation & Ecosystem
18. **[Docs] Add OpenAPI/Swagger docs for the REST API**  
    - Description: Serve a SwaggerUI on a configurable endpoint from the local Node, using the `openapi.yaml` spec. 
19. **[Tutorial] Write tutorial: connecting OAHL to a webcam**  
    - Description: A clear, step-by-step markdown tutorial for complete beginners showing how to connect a standard USB webcam and have an agent take a photo.
20. **[Example] Create example: AI agent controlling a robot arm via OAHL**  
    - Description: Using a generic Python script with our Python SDK, write an example loop that plans 3D coordinates and moves a simulated (or read) robot arm.
21. **[Example] Create example: AI agent controlling Phillips Hue lightbulbs via OAHL**  
    - Description: An end-to-end example where an agent sets the mood with Hue lights via an adapter/HTTP wrapper.
22. **[Tutorial] Create tutorial: Troubleshooting adapter connections**  
    - Description: Document the most common pitfalls (Docker daemon socket missing, Linux device groups, bad USB cords) with easy solutions.
