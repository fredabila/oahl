# 🏷️ OAHL Semantic Metadata & AI Agent Instructions

This guide explains how to use the new semantic metadata fields in OAHL to make your hardware discoverable by international standards (like W3C Web of Things) and more reliable for AI Agents (like those using Anthropic's MCP).

## 1. Why use Semantic Metadata?

Standard hardware APIs tell you *how* to call a function (e.g., `set_value(25)`). Semantic metadata tells the world *what* that value means (e.g., "Set the target temperature to 25 degrees Celsius").

By adding this metadata, you:
1.  **Enable Standardization:** Your hardware can be automatically understood by W3C Web of Things (WoT) consumers.
2.  **Improve AI Reasoning:** AI Agents can better understand *when* and *why* to use a specific hardware capability.
3.  **Future-Proof your Node:** Your hardware becomes part of a global, searchable "Internet of Physical Tools."

---

## 2. Device Metadata Fields

In your `oahl-config.json` or your adapter's `getDevices()` method, you can now include:

| Field | Description | Example |
| :--- | :--- | :--- |
| `manufacturer` | The company that made the hardware. | `Sony`, `Arduino`, `DJI` |
| `model` | The specific model name or number. | `A6400`, `Uno R3`, `Mini 4 Pro` |
| `serial_number` | The unique physical ID of the device. | `SN-12345-ABC` |
| `semantic_context` | A list of URLs for W3C WoT `@context` definitions. | `["https://www.w3.org/2022/wot/td/v1.1"]` |

### Example (oahl-config.json):
```json
{
  "id": "usb-cam-1",
  "type": "camera",
  "manufacturer": "Logitech",
  "model": "C920",
  "semantic_context": ["https://www.w3.org/2022/wot/td/v1.1"]
}
```

---

## 3. Capability Metadata Fields

Capabilities represent the "Tools" an AI can use. These new fields help the AI use them correctly:

| Field | Description | Example |
| :--- | :--- | :--- |
| `instructions` | **(Critical for AI)** Natural language advice for the agent. | `Use this only when the room is dark. Do not call more than once per minute.` |
| `semantic_type` | The W3C WoT interaction type. | `ActionAffordance`, `PropertyAffordance` |

### Example (Adapter code):
```typescript
async getCapabilities(deviceId: string): Promise<Capability[]> {
  return [{
    name: 'camera.capture',
    description: 'Captures a high-resolution photo.',
    instructions: 'Always ensure the privacy LED is off before calling. If the result is blurry, try increasing the exposure param.',
    semantic_type: 'ActionAffordance',
    schema: { /* ... */ }
  }];
}
```

---

## 4. 🛠️ Automated Data Extraction (Auto-Discovery)

You don't always have to type this data manually! Many hardware protocols support "Self-Description."

### How to implement Auto-Discovery in your Adapter:

1.  **USB/Serial:** Use libraries like `node-usb` or `serialport` to query the **Vendor ID (VID)** and **Product ID (PID)**. You can then map these to real names.
2.  **Network (mDNS/UPnP):** Many smart devices (like Philips Hue or Sony cameras) broadcast their model and manufacturer over the network.
3.  **Internal Registry:** Create a simple lookup table in your adapter.

### Snippet: Auto-extracting from USB (Conceptual)
```typescript
import usb from 'usb';

async getDevices(): Promise<Device[]> {
  const list = usb.getDeviceList();
  return list.map(d => {
    const desc = d.deviceDescriptor;
    return {
      id: `usb-${desc.idVendor}-${desc.idProduct}`,
      type: 'unknown',
      name: 'USB Device',
      manufacturer: `Vendor ID: ${desc.idVendor}`, // You can look this up in a table
      model: `Product ID: ${desc.idProduct}`,
      isPublic: false
    };
  });
}
```

---

## 5. Summary Checklist for Hardware Owners
- [ ] Add `manufacturer` and `model` to your `oahl-config.json`.
- [ ] Write 1-2 sentences of `instructions` for your most important capabilities.
- [ ] (Advanced) Add the W3C WoT `semantic_context` URL if you want your device to be "Web-Standard" compliant.
