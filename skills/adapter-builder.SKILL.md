# OAHL Adapter Builder Skill

Use this skill when a user asks you to write, build, or scaffold a new hardware adapter for the Open Agent Hardware Layer (OAHL).

## 1) Core Concept
An **Adapter** is a Node.js package (written in TypeScript) that acts as a bridge between an AI Agent and physical hardware. It translates OAHL standard capabilities (like `camera.capture`) into actual hardware driver commands (like using the `usb` or `serialport` libraries).

## 2) Scaffold the Adapter First
Always start by using the OAHL CLI to generate the boilerplate structure.
Run the following shell command:
```bash
oahl create-adapter my-hardware-name
```
This will create a new directory (e.g., `adapter-my-hardware-name`) with a `package.json`, `tsconfig.json`, and a `src/index.ts` file containing a template class.

## 3) The Adapter Contract
You must implement the `Adapter` interface from `@oahl/core`. Modify the generated `src/index.ts` to look like this:

```typescript
import { Adapter, Device, Capability } from '@oahl/core';

export default class MyHardwareAdapter implements Adapter {
  id = 'my-hardware-adapter';

  async initialize(): Promise<void> {
    // Setup drivers, open serial ports, etc.
  }

  async healthCheck(): Promise<{ status: 'ok' | 'error'; message?: string }> {
    // Return 'ok' if the hardware is connected
    return { status: 'ok' };
  }

  async getDevices(): Promise<Device[]> {
    // Return an array of detected physical devices
    return [{
      id: 'device-1',
      type: 'sensor', // e.g., 'camera', 'radio', 'sensor', 'robot'
      name: 'My Custom Sensor',
      isPublic: false
    }];
  }

  async getCapabilities(deviceId: string): Promise<Capability[]> {
    // Define what the AI agent can do with this hardware
    return [{
      name: 'sensor.read',
      description: 'Reads the current temperature value.',
      instructions: 'Do not call more than once per second.', // Hints for AI
      schema: { 
        type: 'object', 
        properties: { 
          unit: { type: 'string', enum: ['celsius', 'fahrenheit'] } 
        } 
      }
    }];
  }

  async execute(deviceId: string, capabilityName: string, args: any): Promise<any> {
    if (capabilityName === 'sensor.read') {
      // INTERNAL LOGIC: Talk to the actual hardware here
      const temp = 24.5; 
      return { success: true, temperature: temp, unit: args.unit || 'celsius' };
    }
    throw new Error(`Capability ${capabilityName} not supported.`);
  }
}
```

## 4) Install and Test Locally
Once the adapter is written:
1. Navigate into the adapter directory: `cd adapter-my-hardware-name`
2. Install dependencies: `npm install`
3. Compile the TypeScript: `npm run build`
4. Navigate back to the main OAHL node directory (where `oahl-config.json` lives).
5. Install the local adapter using npm: `npm install ./adapter-my-hardware-name`
6. Add the adapter's package name to the `plugins` array in `oahl-config.json`.
7. Restart the node: `oahl start`

## 5) Important Rules for Agents building adapters
- **Dependencies:** If the hardware requires USB, install the `usb` npm package. If it requires serial, install `serialport`.
- **Export:** The adapter class **must** be the `default export`.
- **JSON Schema:** You must write a strict, valid JSON schema for the `schema` property in `getCapabilities`. This is how other AI agents know how to call your tool.
- **Fail Gracefully:** In the `execute` method, use `try/catch` and return clear error messages if the hardware is unplugged or busy.