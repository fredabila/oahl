# Security Guide

Security is a primary concern for OAHL since it bridges software agents and physical hardware.

## Current Security Controls (Implemented)

### Bearer Token Authentication
All agent-facing cloud endpoints require `Authorization: Bearer <agent_api_key>`. Provider-facing endpoints require a separate `provider_api_key`. The two key spaces are strictly distinct. API keys are provisioned dynamically via the developer portal (`/v1/portal/agents`) and validated against Redis on each request.

### Device Access Policy Enforcement
Each registered device carries an `access_policy` with `visibility` (public / shared / private), `allowed_agents`, `allowed_orgs`, and `denied_agents` lists. The cloud enforces this policy on every discovery and session-request call. Agents receive HTTP 403 if access is denied.

### Session Exclusivity
The `SessionManager` enforces that each physical device can have at most one active session at a time. Concurrent reservation attempts are rejected with an error.

### Policy Engine (Local Node)
The local node's `PolicyEngine` enforces per-device `allowedCapabilities` and `disabledCapabilities` lists before any adapter execution. Agents cannot invoke capabilities that have been administratively disabled.

### Network Isolation
The OAHL node server should ideally run on an isolated network. Do not expose the local node directly to the public internet without an authentication proxy or VPN.

### Docker Sandboxing
Running the OAHL server in Docker provides an additional layer of isolation from the host OS. Only mount the necessary hardware devices into the container using the `devices` mapping in `docker-compose.yml`.

### Principle of Least Privilege
Hardware owners should use the Policy Engine and device access policies to strictly limit what capabilities are exposed to which agents. Disable any capabilities that can physically damage the hardware or cause harm.

---

## Known Security Gaps (Not Yet Implemented)

The following controls are on the roadmap (Phase 4 of `docs/oahl-standardization-roadmap.md`) but have not been implemented. Operators running OAHL in production should apply compensating controls until these are available.

### 1. Self-Asserted Agent Identity Headers
`x-agent-id`, `x-agent-org-id`, and `x-agent-roles` headers are read directly from the request with no cryptographic validation. Any HTTP client can forge any identity. These headers should be treated as advisory trust signals only.

**Compensating control:** Use `allowed_agents` / `allowed_orgs` lists only with agents whose API keys are provisioned through a controlled process where the provisioning system also distributes the identity values.

**Planned fix:** Signed JWT agent identity bound to the bearer token, or mutual TLS (mTLS) client certificate verification.

### 2. No Replay Protection
There is no nonce or HMAC signing on request payloads. A captured API request could theoretically be replayed within the session validity window.

**Compensating control:** Short session lifetimes; ensure HTTPS / TLS is enforced on all connections to the cloud relay.

**Planned fix:** Short-lived nonces or HMAC request signatures.

### 3. No Rate Limiting
There is no per-agent or per-node rate limiting on the cloud relay. A misbehaving agent can flood the system.

**Planned fix:** Rate limiting middleware with Redis-backed counters; HTTP 429 responses with `Retry-After` headers.

### 4. No Node Attestation
When a node registers via `POST /v1/provider/nodes/register`, the cloud accepts the registration based on the `provider_api_key` alone. There is no cryptographic proof that the registering node is running unmodified OAHL software.

**Planned fix:** Signed node metadata (node identity document), hardware trust level classification (attested vs. self-declared), and a formal attestation profile.

### 5. No Cloud-Side Schema Validation
Execution `params` are forwarded from the cloud to the node without JSON Schema validation at the cloud layer. Schema enforcement currently relies on the adapter and the calling agent.

**Planned fix:** Cloud-side validation of `params` against the capability's registered JSON Schema before forwarding to the node.

### 6. PIN Stored in Plaintext (Developer Portal)
The developer portal (`/v1/portal/auth`) stores 6-digit PINs in Redis in plaintext.

**Compensating control:** Do not use the developer portal for production systems without hashing PINs (e.g., bcrypt).

**Planned fix:** bcrypt or Argon2 hashing for portal authentication credentials.

---

## Security Roadmap Summary

| Control | Status |
|---|---|
| Bearer token auth | ✅ Implemented |
| Device access policy (visibility, allow/deny lists) | ✅ Implemented |
| Session exclusivity | ✅ Implemented |
| Policy Engine (local node capability allow/deny) | ✅ Implemented |
| Signed JWT / mTLS agent identity | ❌ Planned (Phase 4) |
| Replay protection / nonces | ❌ Planned (Phase 4) |
| Rate limiting (HTTP 429) | ❌ Planned (Phase 4) |
| Node attestation | ❌ Planned (Phase 4) |
| Cloud-side JSON Schema validation | ❌ Planned (Phase 4) |
| Portal PIN hashing | ❌ Needed |
