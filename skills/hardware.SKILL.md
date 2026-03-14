# OAHL Hardware Skill (Agent-Operational Spec)

Use this skill when an agent must discover, reserve, execute, and release real hardware through OAHL Cloud.

## 1) Connection Contract

- Base URL: `https://oahl.onrender.com`
- Auth header (required on every request):
  - `Authorization: Bearer <AGENT_API_KEY>`
- Content type for POST requests:
  - `Content-Type: application/json`

If auth is missing or invalid, stop and surface a clear authorization error.

---

## 2) Required Agent Behavior (Do Not Skip)

1. Discover hardware with `GET /v1/capabilities`.
2. Select a concrete device and capability.
3. Validate execution params against the capability `schema`.
4. Reserve with `POST /v1/requests` and obtain `session_id`.
5. Execute with `POST /v1/sessions/{session_id}/execute`.
6. Always cleanup with `POST /v1/sessions/{session_id}/stop`.

If any step fails after session creation, still attempt session stop in a final cleanup step.

---

## 3) Discovery API

### Endpoint
`GET /v1/capabilities`

### Query Parameters (for large fleets)
- `q`: full-text search over device id/type/provider/capability names
- `type`: exact device type
- `provider`: exact provider name
- `node_id`: exact node filter
- `capability`: capability-name filter
- `page`: 1-based page index
- `page_size`: page size (max 100)

### What to parse from response
- `devices[]`
  - `id`
  - `type`
  - `provider`
  - `node_id`
  - `capabilities[]`
    - `name`
    - `description`
    - `schema` (JSON Schema for params)
- `pagination` metadata (if present)

### Schema rule (critical)
Treat capability `schema` as the source of truth for allowed/required params.
Never send unknown keys, missing required keys, or wrong types.

---

## 4) Session Request API

### Endpoint
`POST /v1/requests`

### Deterministic request (recommended)
```json
{
  "device_id": "android-phone-01",
  "capability": "phone.vibrate"
}
```

### Optional node pinning
```json
{
  "device_id": "android-phone-01",
  "node_id": "node-accra-1",
  "capability": "phone.vibrate"
}
```

### Non-deterministic fallback
```json
{
  "capability": "phone.vibrate"
}
```

Use fallback only when device specificity is not required.

---

## 5) Execute API

### Endpoint
`POST /v1/sessions/{session_id}/execute`

### Body
```json
{
  "capability": "phone.vibrate",
  "params": {
    "duration_ms": 1000
  }
}
```

### Execution semantics
- Synchronous relay: response returns after hardware node responds.
- Timeout possibility: `504 Hardware Node Timeout`.

Before execute, reconfirm that:
- `capability` exactly matches selected capability name.
- `params` pass schema validation.

---

## 6) Stop API

### Endpoint
`POST /v1/sessions/{session_id}/stop`

Always call stop once the task is complete (success or failure path).

---

## 7) Error Handling Playbook

- `401 Unauthorized`
  - Cause: invalid or missing `AGENT_API_KEY`.
  - Action: stop and request valid credentials.

- `404 Hardware not available` (session request)
  - Cause: no matching online device/capability.
  - Action: re-run discovery with broader filters; present alternatives.

- `400` on request/execute
  - Cause: invalid body, unsupported capability on device, or schema mismatch.
  - Action: re-check payload and schema; correct and retry once.

- `504 Hardware Node Timeout`
  - Cause: node offline/slow.
  - Action: surface timeout, attempt session stop, offer retry.

Do not perform unlimited retries. Keep retries bounded and explicit.

---

## 8) Capability Naming Convention

Use lowercase dot notation: `<domain>.<action>`

Examples:
- `camera.capture`
- `radio.tune`
- `phone.vibrate`
- `sensor.read`

Guidelines:
- prefer explicit verbs (`capture`, `scan`, `read`, `write`, `start`, `stop`)
- avoid ambiguous verbs (`run`, `do`, `exec`)
- keep names stable over time

---

## 9) Agent Output Quality Checklist

Before returning final response to user, ensure:

- selected device/capability is explicitly stated
- params shown match schema requirements
- execution result is summarized clearly
- session cleanup was attempted and reported

This checklist is mandatory for reliable hardware interactions.

---

## 10) Canonical Execution Result Schema (Central Contract)

Agents should expect execution responses to follow the OAHL structured envelope (`schema_version: "1.0"`) defined in:

- `oahl-execution-result.schema.json`

Required fields:

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

Status semantics:
- `accepted`: command accepted by relay
- `in_progress`: hardware started but not done
- `success`: completed successfully
- `error`: failed (must include `error.code` and `error.message`)

For robotic arm control, use `completion.done` + `completion.state` as the definitive completion signal instead of parsing free-text messages.
