# 🔌 Building OAHL Adapters (Plugin Guide)

This guide explains how to build a hardware adapter for the Open Agent Hardware Layer (OAHL). Adapters are the "drivers" that bridge the gap between AI Agents and physical hardware.

---

## 📂 Recommended File Structure
A standard OAHL adapter should follow this structure to ensure compatibility and ease of publishing:

```text
oahl-adapter-my-device/
├── src/
│   ├── index.ts          <-- Main Adapter Class (Exported as default)
│   └── types.ts          <-- Internal types/interfaces
├── dist/                 <-- Compiled JavaScript (Auto-generated)
├── package.json          <-- Define @oahl/core as a dependency
├── tsconfig.json         <-- TypeScript configuration
└── README.md             <-- Instructions for users
```

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
```bash
mkdir oahl-adapter-vibrator && cd oahl-adapter-vibrator
npm init -y
npm install @oahl/core
```

### 2. Implement the Logic
**Example: `src/index.ts`**
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
      console.log(`Vibrating for ${args.duration}ms...`);
      return { success: true };
    }
  }
}
```

---

## 🤖 AI-Powered Development (Agent Prompt)
**Copy and paste the prompt below into an AI (like Gemini or ChatGPT) to automatically generate your adapter code:**

> "I am building a hardware adapter for the Open Agent Hardware Layer (OAHL). 
> 
> **The Task:** Build an adapter for [INSERT HARDWARE NAME HERE, e.g., 'An Arduino-based Temperature Sensor'].
> 
> **Technical Requirements:**
> 1. Use TypeScript.
> 2. Implement the `Adapter` interface from `@oahl/core`.
> 3. Provide an `initialize()` method for setup.
> 4. Define at least one device in `getDevices()`.
> 5. Define detailed capabilities with JSON schemas for arguments in `getCapabilities()`.
> 6. Implement the `execute()` method to handle commands.
> 
> Please provide the complete `src/index.ts` code and a `package.json` file including `@oahl/core` as a dependency."

---

## 🛠️ Installation & Usage
Once your adapter is published to NPM (e.g., `oahl-adapter-vibrator`):

1.  **Install via CLI:**
    ```bash
    oahl install oahl-adapter-vibrator
    ```
2.  **Verify Config:** The CLI automatically adds it to your `oahl-config.json`.
3.  **Start Node:**
    ```bash
    oahl start
    ```

## 💡 Best Practices
1.  **JSON Schemas:** Be strict with your schemas so AI Agents don't send invalid data.
2.  **Logging:** Use `console.log("[MyAdapter] ...")` so users can see hardware events in their terminal.
3.  **Local Testing:** Test your `execute` logic manually before publishing to ensure it triggers the physical hardware.
