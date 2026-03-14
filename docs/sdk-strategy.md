# SDK Strategy

## Why SDKs exist

SDKs reduce integration effort for agents and applications by hiding API transport details and stabilizing a typed surface.

## Current state

- JavaScript SDK (`@oahl/sdk`) targets local node APIs.
- Python SDK (`sdk-python/client.py`) targets local node APIs.
- Cloud relay APIs (`/v1/...`) are consumed directly via HTTP today.

## Recommended direction

### 1) Split by context

- **Node SDK**: local hardware node control (`/health`, `/devices`, `/sessions/*`, `/execute`)
- **Cloud SDK**: capability discovery and relay session flows (`/v1/capabilities`, `/v1/requests`, `/v1/sessions/{id}/execute`, `/v1/sessions/{id}/stop`)

### 2) Keep naming explicit

- `NodeClient` for local-node flows
- `CloudClient` for cloud-relay flows

### 3) Add capability discovery primitives

Cloud SDK should include:

- search and filter helpers for `GET /v1/capabilities`
- pagination model (`page`, `page_size`, `pagination` metadata)
- deterministic session request helpers (`device_id`, optional `node_id`)

### 4) Keep adapters independent

SDKs should not depend on adapter internals. They should rely on stable API contracts and capability schema definitions only.

## Why this helps

- Faster agent onboarding (less custom HTTP code)
- Fewer integration bugs from endpoint mismatch
- Cleaner separation between platform core, adapter ecosystem, and client integration surfaces
