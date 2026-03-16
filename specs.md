# OAHL Project Specifications

## 1. Project Overview

Open Agent Hardware Layer (OAHL) is an open framework that exposes real-world hardware to AI agents through standardized APIs and pluggable adapters.

OAHL enables:
- Hardware providers to register and expose devices safely.
- Agent developers to discover and invoke hardware capabilities consistently.
- Platform builders to operate a cloud relay/registry for global device access.

## 2. Goals and Non-Goals

### 2.1 Goals
- Provide a standard capability model for hardware interaction.
- Support local-node and cloud-relay execution paths.
- Enforce policy-aware, session-based access control.
- Keep adapter integration simple and extensible.
- Return deterministic, structured execution results for agent reliability.

### 2.2 Non-Goals
- OAHL does not replace vendor-specific low-level drivers.
- OAHL does not guarantee real-time hard deterministic control loops.
- OAHL does not standardize every hardware protocol internally; adapters handle protocol specifics.

## 3. Target Users

- **Hardware Owners**: connect devices and publish capabilities.
- **Agent/Application Developers**: discover, reserve, execute, and release hardware sessions.
- **Platform Operators**: run cloud registry and policy-governed multi-node fleets.

## 4. High-Level Architecture

Core components:
- `@oahl/server`: REST API entry point for session/capability operations.
- `@oahl/core`: domain interfaces, policy engine, and session manager.
- `@oahl/cloud`: cloud registry and relay-facing services.
- `@oahl/adapter-*`: adapter plugins for specific hardware classes.
- `@oahl/cli`: install/init/start workflows for operators.
- `@oahl/sdk-js` and `sdk-python`: client integrations for agent-side usage.
- `@oahl/web`: product UI and documentation-facing experience.

Execution flow:
1. Agent discovers capabilities.
2. Agent requests session allocation.
3. Policy and availability checks pass/fail.
4. Agent executes capability through the allocated session.
5. Session is stopped/released.

## 5. Functional Requirements

### 5.1 Capability Discovery
- Expose discoverable devices with metadata:
  - `id`, `type`, `provider`, `node_id`, `status`, `capabilities`.
- Support cloud discovery filters for large fleets (query support may expand over time).

### 5.2 Session Lifecycle
- Support `request -> execute -> stop` lifecycle.
- Session allocation must prevent conflicting use of exclusive devices.
- Cleanup (`stop`) must be callable in success and failure paths.

### 5.3 Policy Enforcement
- Policy checks occur before execution.
- Deny-by-rule behavior must return explicit errors.
- Device/capability-level controls must be supported by the policy engine.

### 5.4 Adapter Contract
- Every adapter must implement:
  - `initialize()`
  - `healthCheck()`
  - `getDevices()`
  - `getCapabilities(deviceId)`
  - `execute(deviceId, capabilityName, args)`
- Adapters translate OAHL capability calls into protocol-specific operations.

### 5.5 Execution Result Contract
- Execution responses must follow OAHL execution envelope semantics:
  - `schema_version`, `operation_id`, `status`, `completion`, `capability`, `device_id`, `timestamp`
  - optional `data`, `error`
- Status values include: `accepted`, `in_progress`, `success`, `error`.

## 6. API Specification (Current Baseline)

### 6.1 Security
- Bearer token auth is required for protected cloud endpoints.

### 6.2 Endpoints
- `GET /v1/capabilities` — list available hardware and capabilities.
- `POST /v1/requests` — allocate a session for a capability/device.
- `POST /v1/sessions/{session_id}/execute` — invoke capability execution.
- `POST /v1/sessions/{session_id}/stop` — release/stop active session.

## 7. Data and Naming Conventions

- Capability naming uses lowercase dot notation: `<domain>.<action>`.
  - Examples: `camera.capture`, `radio.scan`, `phone.vibrate`, `robot.arm.move`.
- Input arguments must align with capability schema definitions.
- Unknown keys or mismatched types should be rejected by validation/policy layers.

## 8. Security Requirements

- Authenticated access for cloud-facing API operations.
- Policy checks before hardware execution.
- Device access policy (visibility, allowed_agents, allowed_orgs, denied_agents) enforced at cloud layer.
- Agent identity headers (x-agent-id, x-agent-org-id) available for policy enforcement (self-asserted in v1).
- Adapter health visibility through `healthCheck()`.
- Safe error behavior for offline/busy/disconnected hardware.
- Support secure transport posture where applicable (TLS and relay constraints).

See `docs/security-guide.md` for implemented controls and known gaps with compensating controls.

## 9. Reliability and Operational Requirements

- Support low-latency execution path (WebSocket/relay fast path where available).
- Support fallback behavior when preferred transport quality degrades.
- Ensure bounded retry behavior for transient failure classes.
- Provide deterministic session cleanup semantics.

## 10. Extensibility Requirements

- Adapters are independently packageable and installable.
- New hardware classes must be addable without changing core API semantics.
- SDKs should remain compatible with capability/session lifecycle contract.

## 11. Developer Experience Requirements

- CLI workflows for setup, install, and node start:
  - `oahl init`
  - `oahl install <adapter>`
  - `oahl start`
- Adapter creation path should be scaffoldable and documented.

## 12. Build, Test, and Quality Gates

Minimum quality expectations:
- TypeScript packages compile cleanly.
- Core session and policy behavior are test-covered (`@oahl/core` test suite baseline).
- OpenAPI and schema files remain consistent with runtime behavior.

Release readiness checklist:
- No TypeScript build regressions in changed workspaces.
- API contract compatibility maintained.
- Adapter compatibility validated for included first-party adapters.
- Documentation updated for user-visible behavior changes.

## 13. Current Package Inventory

Primary monorepo packages:
- `packages/core`
- `packages/server`
- `packages/cloud`
- `packages/cli`
- `packages/oahl` (distribution wrapper)
- `packages/sdk-js`
- `packages/web`
- `packages/adapter-mock`
- `packages/adapter-rtl-sdr`
- `packages/adapter-usb-camera`

Additional client surface:
- `sdk-python/client.py`

## 14. Future Specification Extensions

Planned areas to formalize further in future revisions:
- Transport/attachment profile conformance matrix.
- Cross-node scheduling and deterministic routing guarantees.
- Capability schema versioning and migration policy.
- SLO/SLA definitions for cloud relay operations.
- SSE / WebSocket result streaming for long-running hardware operations.
- Signed JWT / mTLS agent identity binding.
- Node attestation profile.
- Cloud-side JSON Schema validation before command forwarding.
- W3C WoT Thing Description export (`GET /v1/things/{device_id}`). See `docs/wot-alignment.md`.

---

This document is the project-level product and engineering baseline. Detailed implementation guidance remains in `docs/` and package-level READMEs.