# @oahl/cloud

The cloud registry and routing service for the **Open Agent Hardware Layer (OAHL)**.

This package acts as the central control plane (or matchmaking brain) for the Agent Hardware Cloud. 
- **Nodes** (`@oahl/server`) securely connect to this registry to announce that they have hardware available.
- **AI Agents** connect to this registry to discover available capabilities and request hardware sessions.

## Features
- Hardware node registration (`POST /v1/provider/nodes/register`)
- Global capability discovery (`GET /v1/capabilities`)
- Agent hardware session requests (`POST /v1/requests`)

## Session Request Matching
`POST /v1/requests` supports these request shapes:

- Deterministic (recommended): `{ "device_id": "...", "capability": "..." }`
- Node-pinned deterministic: `{ "device_id": "...", "node_id": "...", "capability": "..." }`
- Backward-compatible fallback: `{ "capability": "..." }`

When only `capability` is provided, the cloud selects the first available compatible device.

## Capability Discovery at Scale
Use `GET /v1/capabilities` with optional query params:

- `q` (text search)
- `type` (exact device type)
- `provider` (exact provider)
- `node_id` (exact node)
- `capability` (capability-name filter)
- `page` (1-based)
- `page_size` (max 100)

Response now includes a `pagination` object and preserves `devices` for compatibility.

## What is OAHL?
OAHL is an open-source framework that lets hardware owners safely expose physical capabilities (like taking pictures or scanning radio frequencies) to remote AI agents. 

For the full documentation, visit the [main OAHL repository](https://github.com/fredabila/oahl).
