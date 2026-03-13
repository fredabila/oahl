# Hardware Owner Guide

This guide explains how to connect your physical hardware to the Open Agent Hardware Layer (OAHL).

By installing the OAHL node and connecting it to the cloud, you can safely expose your hardware's capabilities to AI agents anywhere in the world.

## Requirements
You need:
- A machine running Linux, macOS, or Windows.
- Physical access to supported hardware (e.g., a USB webcam, an RTL-SDR).
- The correct local drivers or vendor SDKs.
- The Open Agent Hardware Layer node installed.

## Step 1: Confirm Local Hardware Access
Before integrating with the framework, make sure the host machine can already access the hardware.
- Camera visible as `/dev/video0`.
- SDR detectable by `rtl` tools.
- Serial sensor readable through COM or tty device.

The framework does not replace vendor drivers. It wraps them in a standard capability interface.

## Step 2: Install the Node
You can install the node using Docker:
```bash
docker pull oahl/node:latest
```

## Step 3: Configure Your Device
Create an `oahl-config.json` file. Each device must specify its ID, adapter, capabilities, and safety policies.

Example:
```json
{
  "node_id": "gh-lab-01",
  "provider": {
    "name": "Accra Test Lab",
    "contact": "provider@example.com"
  },
  "devices": [
    {
      "id": "cam-01",
      "type": "camera",
      "adapter": "usb-camera",
      "local_path": "/dev/video0",
      "capabilities": [
        "camera.capture",
        "camera.stream"
      ],
      "policy": {
        "max_session_minutes": 20,
        "public": true
      }
    },
    {
      "id": "sdr-01",
      "type": "radio",
      "adapter": "rtl-sdr",
      "usb_index": 0,
      "capabilities": [
        "radio.scan",
        "radio.measure_power"
      ],
      "policy": {
        "public": false,
        "transmit_enabled": false,
        "allowed_frequency_ranges": [
          { "start_hz": 88000000, "end_hz": 108000000 }
        ]
      }
    }
  ]
}
```

## Step 4: Start the Node
Run the node pointing to your config:
```bash
docker run -d \
  --name oahl-node \
  -p 8080:8080 \
  -v $(pwd)/oahl-config.json:/app/config/oahl-config.json \
  oahl/node:latest
```

## Step 5: Test Locally
Run health checks and test executions:
```bash
curl http://localhost:8080/capabilities
```

## Step 6: Register with Hosted Control Plane (Optional)
If you want your hardware to be discoverable by remote agents, your node will need an API key from the platform. It will create a secure outbound connection to the registry, advertising its capabilities. **You never expose your hardware directly to the public internet.**

## Best Practices
- Use dedicated machines for nodes.
- Keep drivers updated.
- Isolate devices by trust level.
- **Never expose unrestricted dangerous capabilities.** (E.g., disable radio transmit).
- Enable logging and monitor health.
