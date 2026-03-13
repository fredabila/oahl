import { Adapter, Device, Capability } from '@oahl/core';
export declare class UsbCameraAdapter implements Adapter {
    id: string;
    private devices;
    initialize(): Promise<void>;
    healthCheck(): Promise<{
        status: 'ok' | 'error';
        message?: string;
    }>;
    getDevices(): Promise<Device[]>;
    getCapabilities(deviceId: string): Promise<Capability[]>;
    execute(deviceId: string, capabilityName: string, args: any): Promise<any>;
}
