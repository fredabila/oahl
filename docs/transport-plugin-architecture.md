# Transport Plugin Architecture

This document defines the standardized transport-plugin model for OAHL adapters.

## 1) Why this exists

Adapters should not reimplement connection logic repeatedly (ADB, serial, MQTT, BLE, etc.).
A transport plugin isolates connection mechanics, while the adapter focuses on capability behavior.

## 2) Standard Core Interface

Use `TransportProvider` from `@oahl/core` (`packages/core/src/transport.ts`).

Key contract:

- `supports(profile)`
- `connect(request)`
- `health(connection)`
- `execute(connection, command)`
- `disconnect(connection)`

Related types:

- `TransportAttachmentProfile`
- `TransportConnection`
- `TransportCommand`
- `TransportResult`
- `BaseTransportProvider` (optional helper with retry support)

## 3) Recommended package layout

```text
adapters/
  adapter-android/
    src/
      index.ts                     # Adapter (capability logic)
      transports/
        adbUsbTransport.ts         # USB ADB provider
        adbWifiTransport.ts        # Wi-Fi ADB provider
      profiles/
        androidProfiles.ts         # Attachment profile declarations
      types.ts
```

## 4) Adapter + transport composition pattern

```ts
import {
  Adapter,
  Device,
  Capability,
  TransportProvider,
  TransportAttachmentProfile
} from '@oahl/core';

export default class AndroidAdapter implements Adapter {
  id = 'android-adapter';

  constructor(private transports: TransportProvider[]) {}

  async execute(deviceId: string, capabilityName: string, args: any): Promise<any> {
    const profile: TransportAttachmentProfile = {
      protocol: 'usb',
      mode: 'local',
      metadata: { channel: 'adb' }
    };

    const transport = this.transports.find(t => t.supports(profile));
    if (!transport) {
      throw new Error('No transport provider supports this attachment profile');
    }

    const connection = await transport.connect({ deviceId, profile, timeoutMs: 5000 });
    try {
      return await transport.execute(connection, {
        operationId: `op-${Date.now()}`,
        capability: capabilityName,
        payload: args,
        timeoutMs: 10000
      });
    } finally {
      await transport.disconnect(connection);
    }
  }

  async initialize(): Promise<void> {}
  async healthCheck() { return { status: 'ok' as const }; }
  async getDevices(): Promise<Device[]> { return []; }
  async getCapabilities(_deviceId: string): Promise<Capability[]> { return []; }
}
```

## 5) Protocol selection strategy

- Prefer deterministic profile selection (device metadata, policy, environment)
- Fall back to secondary protocol only if explicitly configured
- Do not silently switch to insecure transport when secure one fails

## 6) Practical examples

- Android: `adb_usb` for bootstrap, `adb_wifi` for cable-free operation
- Robotic arm: `mqtts` over LAN with mTLS
- Industrial sensor: `serial` on local node

## 7) Conformance guidance

A transport plugin is considered compliant if it:

- Implements `TransportProvider` fully
- Uses structured errors in `TransportResult.error`
- Supports health checks and bounded retry behavior
- Does not leak credentials in logs or returned payloads
