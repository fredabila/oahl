# Open Agent Hardware Layer Skill

This skill allows an AI agent to interact with real-world hardware devices through the Open Agent Hardware Layer platform.

## 🔗 Connection Details
**Base URL:** `https://oahl.onrender.com`

## 🔐 Authentication
Agents must provide a valid `AGENT_API_KEY` in the Authorization header for all requests.
Header: `Authorization: Bearer <YOUR_AGENT_API_KEY>`

---

## Step 1: Discover available hardware
Endpoint: `GET /v1/capabilities`

Returns a detailed list of online hardware devices and their **Capability Schemas**. 

**IMPORTANT:** Every capability includes a `schema` object (JSON Schema). You **MUST** read this schema to understand which parameters are required for the `execute` call.

Example response:
```json
{
  "devices": [
    {
      "id": "android-phone-01",
      "capabilities": [
        {
          "name": "phone.vibrate",
          "description": "Trigger a physical vibration",
          "schema": {
            "type": "object",
            "properties": {
              "duration_ms": { "type": "number" }
            },
            "required": ["duration_ms"]
          }
        }
      ]
    }
  ]
}
```

## Step 2: Request a Hardware Session
Endpoint: `POST /v1/requests`

Target a specific capability name. The system will match you to an available device and return a `session_id`.

## Step 3: Execute Action
Endpoint: `POST /v1/sessions/{session_id}/execute`

This call triggers a **Command Relay**. The Cloud Registry will relay your request to the physical hardware node where the device is connected.

**Response Expectation:**
- The request is synchronous. The Cloud will wait for the physical hardware to respond before returning the result to you.
- If the hardware is offline or slow, you may receive a `504 Hardware Node Timeout`.
- **Constraint:** The `params` you send must match the `schema` found in Step 1.

Example:
```json
{
  "capability": "phone.vibrate",
  "params": {
    "duration_ms": 1000
  }
}
```

## Step 4: Stop Session
Endpoint: `POST /v1/sessions/{session_id}/stop`

---

## Safety Guidelines
1. **Schema Validation:** Never send parameters not defined in the capability's schema.
2. **Privacy:** Do not use sensors or cameras unless necessary for the user's specific request.
3. **Session Cleanup:** Always call `stop` when your hardware task is complete.
