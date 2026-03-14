"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsbCameraAdapter = void 0;
class UsbCameraAdapter {
    id = 'usb-camera-adapter';
    devices = [
        {
            id: 'usb-cam-1',
            type: 'camera',
            name: 'USB Web Camera',
            isPublic: false
        }
    ];
    async initialize() {
        console.log(`[${this.id}] Initialized`);
    }
    async healthCheck() {
        return { status: 'ok' };
    }
    async getDevices() {
        return this.devices;
    }
    async getCapabilities(deviceId) {
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
    async execute(deviceId, capabilityName, args) {
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
exports.UsbCameraAdapter = UsbCameraAdapter;
