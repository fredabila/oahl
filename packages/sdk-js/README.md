# @oahl/sdk

> JavaScript / TypeScript client SDK for the [Open Agent Hardware Layer](https://github.com/fredabila/oahl).

## Install

```bash
npm install @oahl/sdk
```

## Two Clients

| Client | Purpose | Default base URL |
|--------|---------|-----------------|
| `OahlClient` | Talk to a **local** OAHL node | `http://localhost:3000` |
| `CloudClient` | Talk to the **cloud** registry & relay | `https://oahl.onrender.com` |

---

## Quick Start — Cloud Client

The most common integration path: discover devices globally, reserve a session, execute a capability, and release.

```ts
import { CloudClient } from '@oahl/sdk';

// 1. Create a client with your agent API key
const cloud = new CloudClient(
  'https://oahl.onrender.com',
  process.env.OAHL_AGENT_KEY
);

// 2. Discover devices (with optional filters)
const { devices, pagination } = await cloud.getCapabilities({
  type: 'android',         // filter by device type
  capability: 'screen.capture',  // filter by capability
  page: 1,
  page_size: 25
});

console.log(`Found ${pagination?.total} devices`);

// 3. Reserve a session on a specific device
const { session_id } = await cloud.requestSession({
  device_id: devices[0].id,
  capability: 'screen.capture'
});

// 4. Execute a capability
const result = await cloud.execute(session_id, {
  capability: 'screen.capture',
  params: { resolution: '1080p' },
  timeout_ms: 30000
});

console.log(result.data); // → structured execution result

// 5. Release the session
await cloud.stopSession(session_id);
```

---

## Quick Start — Local Node Client

For direct communication with a local OAHL node (no cloud relay).

```ts
import { OahlClient } from '@oahl/sdk';

const node = new OahlClient('http://localhost:3000');

// Check node health
const health = await node.health();

// List all connected devices
const devices = await node.getDevices();

// Get capabilities for a specific device
const caps = await node.getCapabilities(devices[0].id);

// Start a session
const session = await node.startSession(devices[0].id);

// Execute a capability
const result = await node.execute(session.id, 'camera.capture', {
  resolution: '720p'
});

// Stop the session
await node.stopSession(session.id);
```

---

## API Reference

### `CloudClient`

#### `new CloudClient(baseUrl?, agentApiKey?)`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `baseUrl` | `string` | `https://oahl.onrender.com` | Cloud API base URL |
| `agentApiKey` | `string` | — | Your provisioned agent API key |

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `setAgentApiKey(key)` | `void` | Update the API key after construction |
| `getCapabilities(query?)` | `CloudCapabilitiesResponse` | Discover devices with optional filtering |
| `requestSession(input)` | `{ session_id, status }` | Reserve a hardware session |
| `execute(sessionId, input)` | `any` | Execute a capability on a reserved session |
| `stopSession(sessionId)` | `{ status }` | Release a hardware session |

#### Query Filters for `getCapabilities()`

```ts
interface CloudCapabilitiesQuery {
  q?: string;          // Full-text search
  type?: string;       // Device type filter (e.g., 'android', 'camera')
  provider?: string;   // Provider name filter
  node_id?: string;    // Specific node filter
  capability?: string; // Capability name filter
  page?: number;       // Page number (default: 1)
  page_size?: number;  // Results per page (default: 25)
}
```

#### Execution Input

```ts
interface CloudExecuteInput {
  capability: string;    // e.g., 'screen.capture', 'input.tap'
  params?: object;       // Capability-specific parameters
  timeout_ms?: number;   // Max wait time in ms (default: server-side)
}
```

---

### `OahlClient`

#### `new OahlClient(baseUrl?)`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `baseUrl` | `string` | `http://localhost:3000` | Local node URL |

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `health()` | `any` | Check node health status |
| `getDevices()` | `Device[]` | List all connected devices |
| `getCapabilities(deviceId)` | `Capability[]` | Get capabilities for a device |
| `startSession(deviceId)` | `Session` | Start a hardware session |
| `execute(sessionId, capabilityName, args?)` | `any` | Execute a capability |
| `stopSession(sessionId)` | `void` | End a session |
| `getSession(sessionId)` | `Session` | Get session status |

---

## Error Handling

Both clients throw on non-2xx responses with the HTTP status and response body:

```ts
try {
  const result = await cloud.execute(sessionId, {
    capability: 'camera.capture'
  });
} catch (err) {
  // err.message → "HTTP error 408: WebSocket command timed out..."
  console.error(err.message);
}
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OAHL_AGENT_KEY` | Your agent API key (provisioned via the admin dashboard) |
| `OAHL_CLOUD_URL` | Override the default cloud URL |

## Related Docs

- [Agent Integration Guide](../../docs/agent-integration-guide.md)
- [API Reference](../../docs/api-reference.md)
- [Security Guide](../../docs/security-guide.md)
- [SDK Strategy](../../docs/sdk-strategy.md)
