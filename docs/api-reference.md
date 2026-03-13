# API Reference

## `GET /health`
Returns the health status of the server.

## `GET /devices`
Returns a list of all available devices.

## `GET /capabilities?deviceId={id}`
Returns the capabilities available for a specific device, including JSON schemas for arguments.

## `POST /sessions/start`
Starts a new session.
- **Body:** `{ "deviceId": "string" }`
- **Returns:** Session object.

## `POST /execute`
Executes a capability on a device.
- **Body:** `{ "sessionId": "string", "capabilityName": "string", "args": {} }`
- **Returns:** The result of the execution.

## `POST /sessions/stop`
Stops an active session.
- **Body:** `{ "sessionId": "string" }`

## `GET /sessions/{id}`
Retrieves information about a specific session.
