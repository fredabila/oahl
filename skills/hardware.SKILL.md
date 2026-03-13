# Open Agent Hardware Layer Skill

This skill allows an AI agent to interact with real-world hardware devices through the Open Agent Hardware Layer platform.

## 🔐 Authentication
Agents must provide a valid `AGENT_API_KEY` in the Authorization header for all requests to the Cloud Registry.
Header: `Authorization: Bearer <YOUR_AGENT_API_KEY>`

---

## Step 1: Discover available hardware
Endpoint: `GET /v1/capabilities`

Returns a detailed list of online hardware devices, their providers, and supported capabilities. Use this to select the best physical device for your task.

Example response:
```json
{
  "timestamp": 1710324720000,
  "devices": [
    {
      "id": "usb-cam-1",
      "type": "camera",
      "capabilities": ["camera.capture"],
      "provider": "Accra Test Lab",
      "node_id": "laptop-01",
      "status": "available"
    },
    {
      "id": "android-phone-01",
      "type": "mobile",
      "capabilities": ["phone.vibrate", "phone.take_photo"],
      "provider": "User Personal Phone",
      "node_id": "home-pc-01",
      "status": "available"
    }
  ]
}
```

## Step 2: Request a Hardware Session
Endpoint: `POST /v1/requests`

Target a specific capability. The system will match you to an available device.

```json
{
  "capability": "phone.vibrate",
  "params": {
    "pattern": "short"
  }
}
```

## Step 3: Execute Action
Endpoint: `POST /v1/sessions/{session_id}/execute`

Triggers the physical hardware via the local Node and its Adapter.

## Step 4: Stop Session
Endpoint: `POST /v1/sessions/{session_id}/stop`

---

## 📱 How it works: The Mobile Phone Example
If you want to trigger an action on a mobile phone (e.g., vibrate or take a photo):
1. The phone must be connected to an OAHL Node (via an Adapter).
2. The Node registers the phone's capabilities with the Cloud.
3. You (the Agent) discover the phone in Step 1.
4. When you call `execute`, the Cloud relays the command to the Node, which uses its local Adapter to send the physical signal to the phone.

## Safety Guidelines
1. **Privacy:** Never use cameras or microphones without explicit user task relevance.
2. **Efficiency:** Always stop sessions to release hardware for other agents.
3. **Validation:** Check the `status` of a device before requesting a session.
