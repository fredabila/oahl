# OAHL Standardization Roadmap

This roadmap defines how OAHL progresses from a strong protocol foundation to ecosystem-level standard maturity.

## Goal

Reach MCP-like maturity for hardware interoperability by combining:

- stable protocol contracts
- conformance validation
- reusable transport ecosystem
- security trust model
- governance and versioning discipline

## Current Baseline (Established)

OAHL already has:

- Protocol draft: `docs/oahl-protocol-v1.md`
- Transport profile draft: `docs/transport-attachment-profiles.md`
- Transport plugin architecture: `docs/transport-plugin-architecture.md`
- Canonical execution result schema: `oahl-execution-result.schema.json`
- Canonical attachment profile schema: `oahl-attachment-profile.schema.json`

Estimated maturity: **Foundation complete, ecosystem incomplete**.

## Phase 1 — Protocol Stabilization (v1.0)

### Deliverables

1. Freeze OAHL Protocol v1 required fields and status semantics.
2. Freeze execution result schema `schema_version: 1.0`.
3. Freeze attachment profile schema for required fields.
4. Publish explicit error-code catalog.

### Acceptance Criteria

- No breaking changes to v1 required fields across two consecutive releases.
- OpenAPI and protocol docs are fully aligned for all v1 endpoints.
- All first-party adapters return standardized execution envelopes.

### Exit Gate

- Mark protocol docs as `Stable` instead of `Draft`.

## Phase 2 — Conformance Program

### Deliverables

1. Conformance test suite (CLI + CI runnable) for:
   - capability schema validation behavior
   - session exclusivity and cleanup
   - deterministic reservation behavior
   - execution envelope validity
2. Certification profile levels:
   - `Core-Compliant`
   - `Transport-Compliant`
   - `Security-Compliant`
3. Machine-readable conformance report output.

### Acceptance Criteria

- Every first-party package passes conformance in CI.
- Third-party adapter authors can run tests locally via one command.

### Exit Gate

- Conformance badge available for adapters/nodes.

## Phase 3 — Transport Plugin Ecosystem

### Deliverables

1. First-party transport plugins (reference set):
   - `transport-serial`
   - `transport-adb`
   - `transport-mqtt`
   - `transport-ble`
   - `transport-tcp`
2. Transport selection policy in server/runtime.
3. Fallback strategy policy (secure-first, explicit downgrade rules).

### Acceptance Criteria

- At least 3 transport plugins are production-tested.
- Adapter examples show composable transport usage.
- Transport error codes are standardized.

### Exit Gate

- Transport plugins considered reusable building blocks, not adapter-local one-offs.

## Phase 4 — Security, Trust, and Attestation

### Deliverables

1. Node identity profile (signed node metadata).
2. Device trust metadata (attested vs self-declared).
3. Key rotation policy and token scoping model.
4. Security event audit schema.

### Acceptance Criteria

- Provider auth and agent auth separation enforced everywhere.
- High-trust mode available for sensitive capabilities.
- Audit records are machine-parseable and queryable.

### Exit Gate

- Security profile published with mandatory controls for production deployments.

## Phase 5 — SDK and Developer Experience Parity

### Deliverables

1. SDK parity matrix (JS/Python/others) for node + cloud clients.
2. Generated types from OpenAPI/schemas where possible.
3. One-command adapter scaffold + one-command conformance validation.

### Acceptance Criteria

- JS and Python SDKs support equivalent cloud lifecycle operations.
- Adapter scaffold emits transport-aware structure by default.

### Exit Gate

- New adapter developers can ship a compliant adapter with minimal custom boilerplate.

## Phase 6 — Governance and Compatibility Policy

### Deliverables

1. Versioning policy for protocol/schema changes.
2. Deprecation windows and migration guides.
3. RFC process for protocol evolution.
4. Reference implementation changelog tied to protocol changes.

### Acceptance Criteria

- Breaking changes require RFC and major version bump.
- Deprecation notices include machine-readable metadata and sunset dates.

### Exit Gate

- External ecosystem can plan upgrades predictably.

## Suggested Scorecard

Track monthly with weighted dimensions:

- Protocol stability (20%)
- Conformance coverage (20%)
- Transport ecosystem coverage (20%)
- Security/trust maturity (20%)
- SDK/developer experience parity (10%)
- Governance maturity (10%)

Target score for “MCP-level type maturity”: **>= 85/100** with no critical gaps.

## Immediate Next 30 Days (Practical Plan)

1. Finalize v1 error code catalog.
2. Build first conformance test runner.
3. Ship first reference transport plugin (`transport-adb` or `transport-serial`).
4. Add CI gate requiring execution envelope compliance.
5. Publish compatibility policy draft.
