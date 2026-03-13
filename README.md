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

## Features

- Standard hardware capability model
- Pluggable adapter architecture
- Local and hosted deployment support
- Policy enforcement (max session duration, public/private)
- Health checks
- Agent-friendly API endpoints
- Session lifecycle management
- Event and result reporting

## Quick start

### Install
```bash
docker pull oahl/node:latest
```

### Create a config (`oahl-config.json`)
```json
{
  "node_id": "local-node-01",
  "devices": [
    {
      "id": "cam-01",
      "type": "camera",
      "adapter": "usb-camera",
      "local_path": "/dev/video0",
      "capabilities": ["camera.capture"]
    }
  ]
}
```

### Run
```bash
docker run -d \
  --name oahl-node \
  -p 8080:8080 \
  -v $(pwd)/oahl-config.json:/app/oahl-config.json \
  oahl/node:latest
```

### Check health
```bash
curl http://localhost:8080/health
```

### Example request
```bash
curl -X POST http://localhost:8080/execute \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "cam-01",
    "capability": "camera.capture",
    "params": {
      "resolution": "1080p",
      "format": "jpg"
    }
  }'
```

## Who should use this

- hardware owners
- robotics labs
- maker spaces
- universities
- SDR operators
- IoT developers
- agent developers
- platforms building physical capability networks

## Documentation

See the `docs/` folder for:
- [Architecture Overview](docs/architecture.md)
- [Hardware Owner Guide](docs/hardware-owner-guide.md)
- [Adapter Guide](docs/adapter-guide.md)
- [Security and Policy Guide](docs/security-guide.md)
- [Agent Integration Guide](docs/agent-integration-guide.md)
- [API Reference](docs/api-reference.md)

## Safety notice

This framework should only be used in lawful, authorized, and safe environments. High-risk hardware actions should be restricted by policy and, where appropriate, require human approval.

## License

Apache 2.0 or MIT.
