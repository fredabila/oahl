import { Adapter, Device, Capability } from '@oahl/core';

export class UsbCameraAdapter implements Adapter {
  id = 'usb-camera-adapter';
  
  private devices: Device[] = [
    {
      id: 'usb-cam-1',
      type: 'camera',
      name: 'USB Web Camera',
      isPublic: false
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
    if (deviceId !== 'usb-cam-1') {
      throw new Error('Device not found');
    }
    return [
      {
        name: 'capture_image',
        description: 'Captures an image from the camera',
        schema: {
          type: 'object',
          properties: {
            resolution: { type: 'string', enum: ['1080p', '720p'] }
          }
        }
      }
    ];
  }

  async execute(deviceId: string, capabilityName: string, args: any): Promise<any> {
    if (deviceId !== 'usb-cam-1') {
      throw new Error('Device not found');
    }
    if (capabilityName === 'capture_image') {
      console.log(`[${this.id}] Capturing image on ${deviceId} with args:`, args);
      return { 
        image: 'base64_encoded_mock_image_data_here', 
        format: 'jpeg',
        resolution: args.resolution || '720p'
      };
    }
    throw new Error(`Capability ${capabilityName} not found`);
  }
}
