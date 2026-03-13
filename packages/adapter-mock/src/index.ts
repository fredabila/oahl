import { Adapter, Device, Capability } from '@oahl/core';

export class MockAdapter implements Adapter {
  id = 'mock-adapter';
  
  private devices: Device[] = [
    {
      id: 'mock-device-1',
      type: 'mock',
      name: 'Mock Device 1',
      isPublic: true
    }
  ];

  async initialize(): Promise<void> {
    console.log(`[${this.id}] Initialized`);
  }

  async healthCheck(): Promise<{ status: 'ok' | 'error'; message?: string }> {
    return { status: 'ok' };
  }

  async getDevices(): Promise<Device[]> {
    return this.devices;
  }

  async getCapabilities(deviceId: string): Promise<Capability[]> {
    if (deviceId !== 'mock-device-1') {
      throw new Error('Device not found');
    }
    return [
      {
        name: 'ping',
        description: 'Pings the device',
        schema: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        }
      }
    ];
  }

  async execute(deviceId: string, capabilityName: string, args: any): Promise<any> {
    if (deviceId !== 'mock-device-1') {
      throw new Error('Device not found');
    }
    if (capabilityName === 'ping') {
      console.log(`[${this.id}] Executing ping on ${deviceId} with args:`, args);
      return { response: `Pong: ${args.message || 'no message'}` };
    }
    throw new Error(`Capability ${capabilityName} not found`);
  }
}
