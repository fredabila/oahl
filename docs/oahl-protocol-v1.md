# OAHL Protocol v1

This document defines the system-level, hardware-agnostic protocol contract for OAHL so any device type and any transport can plug into one standard.

*Status: Stable (v1.0) — suitable for external review.*

---

## 1. Scope

OAHL Protocol v1 standardizes:

- Capability discovery and filtering
- Access control and agent identity
- Session allocation and exclusivity
- Capability execution (single and batch)
- Structured execution result envelope
- Session release
- Node registration and Cloud relay channel
- W3C WoT semantic alignment fields

It is transport-agnostic and adapter-agnostic.

---

## 2. Core API Lifecycle

```
  GET  /v1/capabilities                    — Discover available devices and capabilities
  POST /v1/requests                        — Reserve a session for a device/capability
  POST /v1/sessions/{session_id}/execute   — Execute a capability
  POST /v1/sessions/{session_id}/execute-batch — Execute multiple capabilities in one trip
  POST /v1/sessions/{session_id}/stop      — Release the session
```

Node-to-Cloud (provider-facing):

```
  POST /v1/provider/nodes/register         — Register/heartbeat a hardware node
  GET  /v1/provider/nodes/{id}/poll        — Long-poll for pending commands (fallback)
  POST /v1/provider/nodes/results          — Deliver execution result to cloud
  WS   /ws/provider                        — Real-time bidirectional relay channel
```

---

## 3. Canonical Data Contracts

### 3.1 Capability Input Contract

Every capability MUST include a JSON Schema under `capabilities[].schema`.
Agents MUST validate request params against this schema before execute.
Cloud implementations SHOULD validate params against the schema before forwarding to the node.

### 3.2 Execution Output Contract

Execution results MUST conform to `oahl-execution-result.schema.json`.

Minimum required envelope:

```json
{
  "schema_version": "1.0",
  "operation_id": "cmd-123",
  "status": "success",
  "completion": { "done": true, "state": "completed" },
  "capability": "robotic_arm.move",
  "device_id": "arm-01",
  "timestamp": "2026-03-16T10:00:00.000Z"
}
```

Status values:

- `accepted` — command received, not yet executed
- `in_progress` — execution underway
- `success` — execution completed successfully
- `error` — execution failed; `error` object MUST be present

Completion model:

- `done: false|true`
- `state: queued|in_progress|completed|failed`
- `progress_pct` (optional): 0–100

Error object (required when status is `error`):

```json
{
  "code": "STRING_ERROR_CODE",
  "message": "Human-readable description",
  "retryable": true,
  "agent_recovery_hints": ["Optional natural-language hints for the agent"],
  "details": {}
}
```

### 3.3 Standard Error Codes

| Code | Meaning |
|---|---|
| `EXECUTION_FAILED` | General adapter execution failure |
| `ADAPTER_REPORTED_FAILURE` | Adapter returned `success: false` without a structured error |
| `MOVE_BLOCKED` | Example: robotic path obstruction |
| `DEVICE_BUSY` | Device has an active exclusive session |
| `DEVICE_NOT_FOUND` | No adapter can locate the requested device ID |
| `CAPABILITY_NOT_SUPPORTED` | Adapter does not implement the requested capability |
| `POLICY_DENIED` | PolicyEngine blocked the capability for this device |
| `SESSION_NOT_FOUND` | Session ID is invalid or expired |
| `ACCESS_DENIED` | Agent identity not permitted to access the device |
| `HARDWARE_TIMEOUT` | Node did not return a result within the allowed window |
| `SCHEMA_VALIDATION_FAILED` | Request params failed JSON Schema validation |
| `TRANSPORT_ERROR` | Underlying device transport (serial, ADB, BLE, etc.) failed |

---

## 4. Device and Capability Identity

- Device IDs MUST be stable within provider scope.
- Capability names SHOULD follow `<domain>.<action>` lowercase dot-notation.
- Versioning MAY be done via suffix (example: `robotic_arm.move.v2`).
- Stable domain vocabulary: `camera`, `radio`, `sensor`, `phone`, `robot`, `lab`, `ui`, `file`, `system`, `app`, `input`, `screen`.

### 4.1 W3C WoT Semantic Alignment

OAHL capabilities map to W3C Web of Things `ActionAffordance`. Two optional fields on the Capability type provide interoperability metadata:

- `semantic_type: string` — e.g. `"ActionAffordance"` from WoT vocabulary
- Devices expose `semantic_context: string[]` for WoT `@context` alignment

OAHL does not mandate JSON-LD. These fields provide a forward path for WoT Thing Directory integration without requiring full TD compliance from adapters.

Deliberate divergence from WoT TD:
- OAHL uses natural-language `description` and `instructions` fields optimised for LLM-native agents, rather than WoT's structured forms-based affordance model.
- OAHL's `TransportAttachmentProfile` covers what WoT expresses via `forms[].protocol`, but as a node-local adapter concern rather than per-affordance.
- The `hardware.baseline` capability is an OAHL-specific extension with no WoT equivalent.

---

## 5. Session Semantics

- Session IDs are opaque UUIDs (`sess-` prefixed).
- Sessions are exclusive per device while active. Concurrent requests for the same device will be rejected.
- Agents MUST stop sessions after use (success and failure paths).
- Sessions expire automatically after 3600 seconds of inactivity on the cloud relay.
- Batch execution (`execute-batch`) operates within a single session and stops-on-first-error by default.

---

## 6. Access Control and Agent Identity

### 6.1 Bearer Token Authentication

All agent-facing cloud endpoints require a bearer token: `Authorization: Bearer <agent_api_key>`.

Provider-facing endpoints require a separate `provider_api_key` bearer token. The two key spaces are distinct.

### 6.2 Agent Identity Headers (Optional)

For access policy enforcement, agents may supply self-asserted identity context headers:

| Header | Type | Description |
|---|---|---|
| `x-agent-id` | string | Stable identifier for the calling agent or owner |
| `x-agent-org-id` | string | Organisation the agent belongs to |
| `x-agent-roles` | string | Comma-separated role list |

> **Security note:** These headers are self-asserted and not cryptographically bound to the bearer token in v1. Full JWT or mTLS binding is planned for a future security profile. Operators should treat them as advisory trust signals rather than verified identity.

### 6.3 Device Access Policy

Each registered device exposes an `access_policy` object:

```json
{
  "visibility": "public | shared | private",
  "allowed_agents": ["agent-id-1"],
  "allowed_orgs":   ["org-id-1"],
  "denied_agents":  ["blocked-agent"]
}
```

Policy resolution rules:

1. If agent is the device owner (`x-agent-id === owner_id`), access is always granted.
2. If agent is on `denied_agents`, access is always rejected (403).
3. If `visibility: public`, any authenticated agent may access.
4. If `visibility: shared`, the agent or their org must appear in `allowed_agents` / `allowed_orgs`.
5. If `visibility: private`, only the owner has access.

### 6.4 Discovery Filtering

`GET /v1/capabilities` supports the following query parameters:

| Parameter | Type | Description |
|---|---|---|
| `q` | string | Free-text search across device ID, type, provider, and capability names |
| `type` | string | Filter by device type (e.g. `camera`, `sensor`) |
| `provider` | string | Filter by provider name |
| `node_id` | string | Filter to a specific hardware node |
| `capability` | string | Filter to devices that expose a specific capability |
| `page` | integer | Page number (default: 1) |
| `page_size` | integer | Results per page (default: 25, max: 100) |

Response includes a `pagination` object: `{ page, page_size, total, total_pages, has_next, has_prev }`.

---

## 7. Cloud Relay Channel (WebSocket)

The cloud relay supports two execution paths:

### 7.1 WebSocket Fast-Path (Primary)

When a hardware node is connected via WebSocket (`/ws/provider`), the cloud forwards `command` or `command-batch` messages directly over the socket and awaits a `result` message. This path has configurable fast-path and late-result grace timeouts (defaults: 10 s fast + 20 s grace).

Response header `x-oahl-relay-mode` signals the path used: `websocket`, `websocket-late`, `websocket-timeout`.

### 7.2 HTTP Long-Poll Fallback (Secondary)

If no WebSocket is connected, the cloud enqueues the command in Redis and the node retrieves it via `GET /v1/provider/nodes/{id}/poll` (30-second long-poll). The node posts the result to `POST /v1/provider/nodes/results`. Response header `x-oahl-relay-mode: polling`.

### 7.3 Timeout Handling

If neither path returns a result within the timeout, the cloud responds with HTTP 504. Relay response headers:

| Header | Value |
|---|---|
| `x-oahl-relay-mode` | `websocket`, `websocket-late`, `websocket-timeout`, `polling`, `polling-timeout` |
| `x-oahl-request-id` | The internal `cmd-*` or `batch-*` request ID |

---

## 8. Security and Trust

- All agent-facing calls require bearer auth.
- Provider and agent credentials are distinct key spaces.
- Identity headers (`x-agent-id`, `x-agent-org-id`) are self-asserted in v1 (no cryptographic binding).
- Nodes SHOULD include attestation metadata in registration (future profile).
- Transport plugins SHOULD prefer encrypted transports and MUST NOT leak credentials in logs or payloads.
- No rate limiting is enforced at the cloud layer in v1. Operators should apply external rate limiting for production deployments.

### 8.1 Security Roadmap (Planned — Not Yet Implemented)

The following security controls are on the roadmap and have not been implemented:

- Signed JWT or mTLS agent identity bound to bearer token
- Request nonce / HMAC replay protection
- Per-node and per-agent rate limiting (HTTP 429)
- Formal node attestation profile (cryptographic proof of node software integrity)
- Cloud-side JSON Schema validation before forwarding params to the node

---

## 9. Protocol Evolution

- `schema_version` controls execution-envelope compatibility.
- Protocol-breaking changes require a new major protocol version.
- New optional fields are allowed as backward-compatible extensions.
- The RFC process for protocol evolution is planned (not yet established).

---

## 10. Conformance Targets

A compliant OAHL implementation MUST pass tests for:

- Capability schema enforcement (adapter exposes `schema` per capability)
- Session exclusivity (concurrent session start on same device is rejected)
- Deterministic reservation with `device_id`
- Structured execution result envelope (all required fields present and typed correctly)
- Session cleanup guarantees (device becomes available after `stop`)
- Access policy enforcement (denied agents receive 403)
- Error envelope structure on failure paths

The conformance test suite is under development. See `docs/oahl-standardization-roadmap.md` Phase 2 for planned tooling.
