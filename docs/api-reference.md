# OAHL Cloud API Reference (v1)

This document describes the primary REST endpoints exposed by the OAHL Cloud service for AI agents and clients to interact with hardware nodes.

## Agent Endpoints

All agent endpoints require the `Authorization: Bearer <AGENT_API_KEY>` header.

### `GET /v1/capabilities`
Discovers available hardware capabilities across all connected nodes.
- **Query Parameters:**
  - `q`: Full-text search over device id/type/provider/capability names.
  - `type`: Exact device type filter.
  - `provider`: Exact provider name filter.
  - `node_id`: Exact node ID filter.
  - `capability`: Capability name filter.
  - `page`: Page number (default: 1).
  - `page_size`: Results per page (default: 25, max: 100).
- **Returns:** List of available devices, their metadata, pricing, and specific capabilities.

### `POST /v1/requests`
Requests a session on a specific device or for a specific capability.
- **Body:** 
  ```json
  {
    "capability": "optional.capability.name",
    "device_id": "optional-device-id",
    "node_id": "optional-node-id"
  }
  ```
- **Returns:** `{ "session_id": "sess-...", "status": "accepted" }`

### `POST /v1/sessions/{id}/execute`
Executes a single capability on the reserved hardware session.
- **Body:**
  ```json
  {
    "capability": "capability.name",
    "params": { ... },
    "timeout_ms": 60000 
  }
  ```
- **Note:** `timeout_ms` is optional. Defines how long the cloud will wait for the node to return a result (default varies, usually 30s).
- **Returns:** Canonical `ExecutionResult` envelope.

### `POST /v1/sessions/{id}/execute-batch`
Executes multiple commands sequentially on the reserved hardware session without waiting for cloud round-trips between each command.
- **Body:**
  ```json
  {
    "commands": [
      { "capability": "arm.move", "params": { "x": 10 } },
      { "capability": "arm.close_gripper", "params": {} }
    ],
    "timeout_ms": 120000
  }
  ```
- **Returns:** Canonical `ExecutionResult` envelope containing an array of sub-results in `data`.

### `GET /v1/sessions/{id}/events`
Server-Sent Events (SSE) endpoint to subscribe to asynchronous events emitted by the hardware during the session.
- **Query Parameters:**
  - `capability`: (Optional) Filter events by a specific capability name.
- **Returns:** A continuous text/event-stream of JSON objects.

### `POST /v1/sessions/{id}/stop`
Releases the reserved session, making the hardware available to other agents.
- **Returns:** `{ "status": "stopped" }`

---

## Canonical Execution Result Schema

When an agent executes a command, it receives a standard envelope, even if it fails.

```json
{
  "schema_version": "1.0",
  "operation_id": "cmd-1234",
  "status": "success",
  "completion": { "done": true, "state": "completed" },
  "capability": "camera.capture",
  "device_id": "cam-01",
  "timestamp": "2026-03-15T12:00:00.000Z",
  "data": { ... },
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "retryable": true,
    "agent_recovery_hints": [
      "Try reducing the resolution parameter",
      "Call camera.reset to clear the fault"
    ]
  },
  "meta": { "relay_latency_ms": 150 }
}
```
**Note:** `agent_recovery_hints` provides natural-language guidance for autonomous agents to recover from physical errors without human intervention.
