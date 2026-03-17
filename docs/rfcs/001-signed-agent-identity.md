# RFC: Signed Agent Identity & Replay Protection

- Author: Core Team
- Date: 2026-03-17
- Status: Accepted (Pending Implementation)
- Core Gap Addressed: Research Paper P2 (Security)

## Summary
This RFC proposes replacing the bearer-token agent authentication model with a cryptographically signed identity standard (JSON Web Tokens - JWT) incorporating cryptographic nonces to prevent replay attacks during physical hardware execution.

## Motivation
Presently, OAHL relies on an `Authorization: Bearer <token>` model alongside an `x-agent-id` header to authenticate AI agents. If this token or header is intercepted, a malicious actor can impersonate the agent and execute hardware commands. Reviewers of the OAHL architecture identified this as a critical security gap (P2).

## Detailed Design
1. **Agent Identity Provider (IdP):** Agents will be issued an asymmetric keypair upon registration instead of a static API key. (Or they will integrate via OIDC).
2. **Execution Payload:** When an agent wishes to execute a command, it must sign the `ExecuteRequest` payload using its private key, resulting in a JWT.
3. **Nonce/JTI:** The JWT must include a unique `jti` (JWT ID) and an `exp` claim (extremely short-lived, e.g., 30 seconds).
4. **Cloud Validation:** The Cloud Relay layer will verify the signature against the agent's registered public key.
5. **Replay Cache:** The Cloud Relay will maintain a Redis cache of seen `jti` strings. If a `jti` is seen twice, the request is instantly rejected (HTTP 401).

## Drawbacks
- Increases latency and complexity for simple agent scripts.
- Requires agents to manage keypairs rather than simple environment variables.

## Alternatives
- **mTLS (Mutual TLS):** Enforcing client certificates at the TLS layer. While highly secure, mTLS is notoriously difficult to adopt for hobbyist hardware makers and serverless AI agents (e.g., AWS Lambda or Vercel edge functions where certificate mounting is complex). JWTs provide application-layer security without infrastructure lock-in.
