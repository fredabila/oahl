# OAHL Protocol v1 (Draft)

This document defines a system-level, hardware-agnostic protocol contract for OAHL so any device type and any transport can plug into one standard.

## 1. Scope

OAHL Protocol v1 standardizes:

- Capability discovery
- Session allocation
- Capability execution
- Structured execution result envelope
- Session release

It is transport-agnostic and adapter-agnostic.

## 2. Core API Lifecycle

1. Discover: `GET /v1/capabilities`
2. Reserve: `POST /v1/requests`
3. Execute: `POST /v1/sessions/{session_id}/execute`
4. Stop: `POST /v1/sessions/{session_id}/stop`

## 3. Canonical Data Contracts

### 3.1 Capability Input Contract

Every capability MUST include a JSON Schema under `capabilities[].schema`.
Agents MUST validate request params against this schema before execute.

### 3.2 Execution Output Contract

Execution results MUST conform to `oahl-execution-result.schema.json`.

Minimum envelope:

```json
{
  "schema_version": "1.0",
  "operation_id": "cmd-123",
  "status": "success",
  "completion": { "done": true, "state": "completed" },
  "capability": "robotic_arm.move",
  "device_id": "arm-01",
  "timestamp": "2026-03-14T10:00:00.000Z"
}
```

Status model:

- `accepted`
- `in_progress`
- `success`
- `error`

Completion model:

- `done: false|true`
- `state: queued|in_progress|completed|failed`

## 4. Device and Capability Identity

- Device IDs MUST be stable within provider scope.
- Capability names SHOULD follow `<domain>.<action>`.
- Versioning MAY be done via suffix (example: `robotic_arm.move.v2`).

## 5. Session Semantics

- Session IDs are opaque.
- Sessions are exclusive per device while active.
- Agents MUST stop sessions after use (success and failure paths).

## 6. Security and Trust

- All agent-facing calls require bearer auth.
- Provider and agent credentials are distinct.
- Nodes SHOULD include attestation metadata in registration (future profile).

## 7. Protocol Evolution

- `schema_version` controls execution-envelope compatibility.
- Protocol-breaking changes require a new major protocol version.
- New optional fields are allowed as backward-compatible extensions.

## 8. Conformance Targets (Next Milestone)

A compliant OAHL implementation should pass tests for:

- Capability schema enforcement
- Session exclusivity
- Deterministic reservation with `device_id`
- Structured execution result envelope
- Session cleanup guarantees
