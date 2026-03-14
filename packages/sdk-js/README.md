# @oahl/sdk

JavaScript client SDK for the Open Agent Hardware Layer (OAHL).

## Current scope

This SDK wraps both local node and cloud relay APIs.

### Local node (`OahlClient`)

- `GET /health`
- `GET /devices`
- `GET /capabilities?deviceId=...`
- `POST /sessions/start`
- `POST /execute`
- `POST /sessions/stop`
- `GET /sessions/{id}`

### Cloud relay (`CloudClient`)

- `GET /v1/capabilities` (with search/filter/pagination query support)
- `POST /v1/requests`
- `POST /v1/sessions/{id}/execute`
- `POST /v1/sessions/{id}/stop`

## Example

```ts
import { OahlClient } from '@oahl/sdk';

const client = new OahlClient('http://localhost:3000');
const devices = await client.getDevices();
```

## Cloud example

```ts
import { CloudClient } from '@oahl/sdk';

const cloud = new CloudClient('https://oahl.onrender.com', process.env.AGENT_API_KEY);

const capabilities = await cloud.getCapabilities({
	q: 'camera',
	page: 1,
	page_size: 25
});

const session = await cloud.requestSession({
	device_id: capabilities.devices[0]?.id,
	capability: 'camera.capture'
});

const result = await cloud.execute(session.session_id, {
	capability: 'camera.capture',
	params: { resolution: '1080p' }
});

await cloud.stopSession(session.session_id);
```
