# Agent Integration Guide

This guide explains how to allow AI agents to request and use hardware through Open Agent Hardware Layer (OAHL) compatible services.

Your agents should not connect directly to the hardware node. Instead, they should connect to your platform's API/Tools, which handles routing, discovery, and executing commands on the OAHL nodes behind the scenes. 

## Integration Options

You can integrate in two ways:
1. **Direct API calls**: Calling the hosted API to discover, reserve, and use capabilities.
2. **Tool or Skill Wrappers**: Providing tools for an LLM agent that act as capability wrappers.

---

## 1. Direct API Pattern

The recommended lifecycle is:
1. Discover compatible capabilities.
2. Request a session.
3. Execute the capability.
4. Retrieve results.
5. Close the session.

### Example Flow

**Discover capabilities:**
```http
GET /v1/capabilities
```

**Request hardware:**
```http
POST /v1/requests
{
  "capability": "camera.capture",
  "constraints": { "country": "US" },
  "params": { "resolution": "1080p" }
}
```

**Execute task:**
```http
POST /v1/sessions/{id}/execute
{
  "capability": "camera.capture",
  "params": { "resolution": "1080p" }
}
```

**Read result:**
```http
GET /v1/results/{id}
```

**Stop session:**
```http
POST /v1/sessions/{id}/stop
```

---

## 2. Tool Wrapper Approach (For LLM Agents)

A tool wrapper turns a capability into an agent-callable function. This hides the concept of "devices" from the agent entirely.

Examples:
- `capture_remote_image`
- `scan_remote_radio`
- `read_remote_sensor`

The wrapper handles:
- endpoint calls
- retry logic
- polling
- result parsing
- session cleanup

### Example Pseudo-Wrapper

```python
def capture_remote_image(region="ghana", resolution="1080p"):
    # 1. Request hardware assignment
    req = post("/v1/requests", {
        "capability": "camera.capture",
        "constraints": {"region": region},
        "params": {"resolution": resolution, "format": "jpg"}
    })

    session_id = req["session_id"]

    # 2. Execute on assigned hardware
    result = post(f"/v1/sessions/{session_id}/execute", {
        "capability": "camera.capture",
        "params": {"resolution": resolution, "format": "jpg"}
    })
    
    # 3. Stop session (handled in finally block usually)
    post(f"/v1/sessions/{session_id}/stop")

    return result
```

## Agent Skill (`SKILL.md`)

Modern agent systems often use a `SKILL.md` file to load instructions. See our example `skills/hardware.SKILL.md` to see how an agent can learn to interact with hardware dynamically using OAHL.

## Design Recommendations
- **Keep tools capability-based, not device-based.** Agents understand "capture image", not "use USB device /dev/video0".
- **Expose only safe parameters.**
- **Always handle busy and unavailable states.** Hardware can fail or be in use.
- **Include session cleanup.** Always release the hardware when done.
- **Log all requests.**
- **Use policy-aware retries.**
