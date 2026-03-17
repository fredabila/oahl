# RFC: Formal Node Attestation

- Author: Core Team
- Date: 2026-03-17
- Status: Accepted (Pending Implementation)
- Core Gap Addressed: Research Paper P2 (Security)

## Summary
This RFC proposes establishing a formal cryptographic attestation mechanism for OAHL Nodes. It ensures that an AI agent connecting to a provider's hardware can cryptographically verify that the Node software is a genuine, untampered build of OAHL, and hasn't been modified to supply hallucinatory or malicious results.

## Motivation
Presently, AI agents must trust the Cloud Relay and the `node_id` blindly. If a malicious lab spin up a cloned Node instance and modifies the core Adapter logic to always return false success signals (say, reporting a door is locked when it isn't), the Agent has no way of knowing it's communicating with compromised hardware drivers. This is the final P2 security gap identified in the OAHL protocol review.

## Detailed Design
1. **Measured Boot & TPM:** Hardware providers will generate a platform attestation quote using a Trusted Platform Module (TPM) or alternative Secure Enclave during Node startup.
2. **Attestation Report:** The quote contains the PCR (Platform Configuration Register) values reflecting the hash of the OAHL Node binary and loaded adapter binaries.
3. **Registry Deposit:** The Node uploads its attestation report to the OAHL Cloud Registry upon connection.
4. **Agent Verification:** During an execution request (or session establishment), the Agent can request the `x-oahl-attestation` payload of the target node and verify the cryptographic signature against the hardware manufacturer's known certificate authorities (e.g., Intel SGX, AMD SEV, or a custom OAHL root of trust).

## Drawbacks
- Extremely high complexity to deploy broadly, as generic hobbyist hardware (like an Arduino or generic Raspberry Pi) may not have TPMs.
- It might fracture the ecosystem into "Trusted" vs "Untrusted" nodes, limiting the pool of available hardware for certain high-security agent tasks.

## Alternatives
- Purely reputation-based trust model (relying on centralized ratings), which does not cryptographically solve the problem, but is easier to implement.
