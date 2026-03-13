# Adapter Development Guide

Adapters translate OAHL standard commands into hardware-specific API calls. 

## Implementing the Adapter Interface
To create a new adapter, you must implement the `Adapter` interface from `@oahl/core`.

```typescript
import { Adapter, Device, Capability } from '@oahl/core';

export class MyCustomAdapter implements Adapter {
  id = 'my-custom-adapter';
  
  async initialize(): Promise<void> { /* Setup hardware connection */ }
  async healthCheck(): Promise<{ status: 'ok' | 'error'; message?: string }> { return { status: 'ok' }; }
  async getDevices(): Promise<Device[]> { /* Return available devices */ }
  async getCapabilities(deviceId: string): Promise<Capability[]> { /* Return device capabilities */ }
  async execute(deviceId: string, capabilityName: string, args: any): Promise<any> {
    // Perform the hardware action and return the result
  }
}
```

## Registering the Adapter
Once created, you must register your adapter in the `packages/server/src/index.ts` file by adding it to the `adapters` array.
