# Open Agent Hardware Layer Skill

This skill allows an AI agent to interact with real-world hardware devices through the Open Agent Hardware Layer platform.

The platform exposes physical devices such as cameras, sensors, radios, and mobile devices as standardized capabilities that can be requested and executed through API endpoints.

Agents should use this skill when they need information or actions from physical hardware.

Examples include:
- capturing an image from a remote camera
- scanning radio spectrum using an SDR receiver
- reading sensor data
- running tests on mobile devices

The platform automatically selects an appropriate device that supports the requested capability. 
**Agents do not need to know which specific hardware device will be used.**

---

## Step 1: Discover available capabilities

Endpoint: `GET /v1/capabilities`

This returns a list of hardware capabilities that are currently available.

Example response:
```json
[
  {
    "name": "camera.capture",
    "description": "Capture a still image from a remote camera"
  },
  {
    "name": "radio.scan",
    "description": "Scan a radio frequency range"
  }
]
```

## Step 2: Request hardware

To use a capability, request a hardware session.

Endpoint: `POST /v1/requests`

Example request:
```json
{
  "capability": "camera.capture",
  "constraints": {
    "country": "US"
  },
  "params": {
    "resolution": "1080p"
  }
}
```

Example response:
```json
{
  "request_id": "req_123",
  "session_id": "sess_123",
  "status": "accepted"
}
```

## Step 3: Execute capability

Once a session is created, execute the capability.

Endpoint: `POST /v1/sessions/{session_id}/execute`

Example request:
```json
{
  "capability": "camera.capture",
  "params": {
    "resolution": "1080p"
  }
}
```

## Step 4: Retrieve results

Endpoint: `GET /v1/results/{request_id}`

Example response:
```json
{
  "image_url": "https://results.example.com/image123.jpg",
  "timestamp": "2026-03-13T10:12:00Z"
}
```

## Step 5: Clean up session

Endpoint: `POST /v1/sessions/{session_id}/stop`

Always stop a session when you are finished using the hardware.

---

## Safety and Usage Guidelines

Agents must follow these rules when using hardware capabilities:
1. Only request capabilities relevant to the task.
2. Do not repeatedly request hardware without reason.
3. Respect parameter limits defined by the capability schema.
4. Avoid requesting actions outside the allowed scope.
5. **Always stop the session when done.**

## When to use this skill
Use this skill when:
- the task requires real-world data
- a physical device is needed
- environmental information is required
- a hardware test must be performed
