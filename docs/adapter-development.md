# 🔌 Building OAHL Adapters (Plugin Guide)

This guide explains how to build a hardware adapter for the Open Agent Hardware Layer (OAHL). Adapters are the "drivers" that bridge the gap between AI Agents and physical hardware.

---

## 🏗️ The Adapter Blueprint

Every adapter must implement the `Adapter` interface from `@oahl/core`. 

### The Interface:
```typescript
export interface Adapter {
  id: string;
  initialize(): Promise<void>;
  healthCheck(): Promise<{ status: 'ok' | 'error'; message?: string }>;
  getDevices(): Promise<Device[]>;
  getCapabilities(deviceId: string): Promise<Capability[]>;
  execute(deviceId: string, capabilityName: string, args: any): Promise<any>;
}
```

---

## 🚀 Step-by-Step: Building an Adapter

### 1. Initialize your project
Create a new Node.js project and install the core types:
```bash
npm init -y
npm install @oahl/core
```

### 2. Implement the Logic
Create a class that implements the `Adapter` interface.

**Example: `MyVibratingAdapter.ts`**
```typescript
import { Adapter, Device, Capability } from '@oahl/core';

export default class MyVibratingAdapter implements Adapter {
  id = 'my-vibrator';

  async initialize() {
    console.log("Vibrator Adapter Initialized!");
  }

  async healthCheck() {
    return { status: 'ok' };
  }

  async getDevices(): Promise<Device[]> {
    return [{
      id: 'vibrator-01',
      type: 'mobile',
      name: 'Personal Vibe-Phone',
      isPublic: true
    }];
  }

  async getCapabilities(deviceId: string): Promise<Capability[]> {
    return [{
      name: 'phone.vibrate',
      description: 'Make the device vibrate',
      schema: { 
        type: 'object', 
        properties: { duration: { type: 'number' } } 
      }
    }];
  }

  async execute(deviceId: string, capabilityName: string, args: any) {
    if (capabilityName === 'phone.vibrate') {
      // INTERNAL LOGIC: Trigger actual hardware here (e.g. ADB, Serial, Bluetooth)
      console.log(`Vibrating for ${args.duration}ms...`);
      return { success: true };
    }
  }
}
```

### 3. Build and Publish
Compile your TypeScript to JavaScript and publish it to NPM (e.g., `@oahl/adapter-my-device`).

---

## 🛠️ How to use a Community Adapter

Once an adapter is published, any OAHL user can install it using the CLI:

1.  **Install:**
    ```bash
    oahl install @oahl/adapter-my-device
    ```
2.  **Verify:** The CLI automatically adds the plugin to your `oahl-config.json`.
3.  **Start:**
    ```bash
    oahl start
    ```

---

## 💡 Best Practices
1.  **Schema Definition:** Always provide a clear JSON Schema for your capability arguments so AI Agents know exactly what they can send.
2.  **Error Handling:** Return descriptive error messages in `execute` so agents can troubleshoot physical failures (e.g., "Device disconnected").
3.  **Lightweight:** Avoid heavy dependencies. If your adapter needs a system tool (like `adb`), document it as a prerequisite.
