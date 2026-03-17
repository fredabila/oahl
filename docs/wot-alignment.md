# W3C Web of Things (WoT) Alignment

This document explains how OAHL relates to the W3C Web of Things (WoT) standard, where the two models deliberately diverge, and the forward interoperability path.

---

## Background

The W3C Web of Things (WoT) defines a standard for describing IoT devices using **Thing Descriptions (TDs)** — JSON-LD documents that expose a device's `properties`, `actions`, and `events` (called *affordances*) along with the network-level `forms` (protocol bindings) needed to invoke them.

OAHL was designed independently with a different primary objective: giving **LLM-native AI agents** a simple, uniform API for requesting and executing hardware capabilities, without requiring agents to understand network protocols, device drivers, or JSON-LD.

A standards-community reviewer would immediately identify the WoT gap. This document addresses that concern directly.

---

## Where OAHL and WoT Align

OAHL's `Capability` type is structurally equivalent to a WoT **ActionAffordance**. Both:

- Name a discrete hardware operation
- Describe its input schema (WoT uses `input`, OAHL uses `schema` as a JSON Schema)
- Associate it with a specific device (WoT: Thing, OAHL: Device)

OAHL already includes two optional WoT-vocabulary fields in the `Capability` and `Device` types:

```typescript
// packages/core/src/types.ts
interface Capability {
  semantic_type?: string;  // e.g. "ActionAffordance" from WoT
  // ...
}

interface Device {
  semantic_context?: string[];  // For W3C WoT @context alignment
  // ...
}
```

These fields propagate through node registration heartbeats and are surfaced in `GET /v1/capabilities` responses. An adapter can declare:

```json
{
  "name": "camera.capture",
  "semantic_type": "ActionAffordance",
  "description": "Capture an image from the camera."
}
```

And a device can declare:

```json
{
  "id": "usb-camera-01",
  "semantic_context": ["https://www.w3.org/2019/wot/td/v1"]
}
```

---

## Deliberate Divergences

| Aspect | W3C WoT TD | OAHL | Rationale |
|---|---|---|---|
| **Description format** | JSON-LD with `@context`, `@type` | Plain JSON | JSON-LD adds tooling complexity without benefit for LLM agents that rely on natural-language descriptions |
| **Affordance model** | Property, Action, Event affordances | Single `Capability` (Action-only in v1) | Simplification: agents request executable actions; passive property reads and event subscriptions are modelled as capabilities (e.g. `sensor.read`, `sensor.stream`) |
| **Protocol binding** | Per-affordance `forms[]` with protocol URIs | `TransportAttachmentProfile` on the adapter/node side | Transport is a node-local concern; agents never select protocols directly |
| **Discovery** | W3C Thing Directory | OAHL Cloud Registry | Registry is agent-auth-gated and access-policy-aware; WoT TDs are typically publicly readable |
| **Identifier** | Thing Description URI (`id`) | `device.id` + `capability.name` strings | URIs are unnecessary overhead for the current use case; future versions can add URI identifiers |
| **Event streaming** | `EventAffordance` with SSE/WebSocket forms | Not yet implemented | Planned for v2 via SSE (see `docs/oahl-standardization-roadmap.md`) |
| **Security vocabulary** | WoT Security Schemes (`bearer`, `apikey`, etc.) | Bearer auth with self-asserted identity headers | OAHL adds access-policy dimension (visibility, allow/deny lists) that WoT security schemes do not cover |

---

## What OAHL Adds That WoT Does Not Cover

| OAHL concept | WoT equivalent |
|---|---|
| `hardware.baseline` fallback capability | None — OAHL-specific LLM affordance |
| `instructions` field (natural language for agents) | `description` field only; no agent-specific instruction channel |
| `agent_recovery_hints` in error responses | None |
| Session exclusivity (one agent per device at a time) | No equivalent; WoT is stateless |
| Device access policy (visibility, allow/deny lists) | No equivalent in WoT TD; relies on external access control |
| Cloud relay with WebSocket fast-path + HTTP long-poll fallback | No equivalent; WoT assumes direct-to-device connectivity |

---

## Forward Interoperability Path

OAHL's current design does not prevent future WoT alignment. The recommended approach:

1. **Keep `semantic_type` and `semantic_context` fields.** These are already in the type system and propagated through the API.
2. **`GET /v1/things/{device_id}` endpoint (implemented)** renders a WoT-compatible Thing Description for a device, translating OAHL capabilities into ActionAffordances with appropriate `forms`, bearer security schemes, and the `oahl:` custom namespace. Content-Type is `application/td+json`.
3. **Register with a W3C Thing Directory (future)** by periodically pushing generated TDs to a public directory endpoint.

This preserves OAHL's simplified agent-native model while offering WoT interoperability as an opt-in surface.

---

## How to Frame This in the Paper

**Recommended framing:**

> OAHL's `Capability` model is analogous to W3C WoT `ActionAffordance`, and the protocol deliberately makes different design choices to serve LLM-native agents: natural-language `description` and `instructions` fields replace JSON-LD structured forms; a cloud access-policy layer (not present in WoT) controls agent visibility; and session exclusivity provides a cooperative locking model absent from the stateless WoT model. OAHL includes `semantic_type` and `semantic_context` fields in its `Capability` and `Device` types as a forward path for WoT Thing Directory integration without mandating JSON-LD today. Full WoT TD compliance is a planned future feature.

**Do not** leave WoT unaddressed. The combination of WoT vocabulary already in the codebase and zero acknowledgement in the paper is the worst possible position — it will be read as accidental rather than deliberate.
