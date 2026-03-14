# @oahl/sdk

JavaScript client SDK for the Open Agent Hardware Layer (OAHL).

## Current scope

This SDK currently wraps the local node API:

- `GET /health`
- `GET /devices`
- `GET /capabilities?deviceId=...`
- `POST /sessions/start`
- `POST /execute`
- `POST /sessions/stop`
- `GET /sessions/{id}`

## Example

```ts
import { OahlClient } from '@oahl/sdk';

const client = new OahlClient('http://localhost:3000');
const devices = await client.getDevices();
```

## Cloud endpoints

Cloud relay endpoints (`/v1/...`) are currently not wrapped by this SDK.
Use direct HTTP calls for cloud session request/matching flows.
