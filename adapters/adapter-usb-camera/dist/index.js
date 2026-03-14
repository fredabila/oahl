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
        const capabilities = [
            {
                name: 'capture_image',
                description: 'Captures an image from the camera',
                schema: {
                    type: 'object',
                    properties: {
                        resolution: { type: 'string', enum: ['1080p', '720p'] }
                    }
                }
            },
            {
                name: 'hardware.baseline',
                description: 'Fallback capability for camera actions not explicitly modeled.',
                schema: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        intent: { type: 'string' },
                        params: { type: 'object' },
                        expected_output: { type: 'object' },
                        timeout_ms: { type: 'number', minimum: 1 }
                    },
                    required: ['intent']
                },
                helper_url: 'https://example.com/oahl/camera-baseline-helper',
                template: 'For capture-like intents, provide params.resolution as 1080p or 720p.'
            }
        ];
        return capabilities;
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
        if (capabilityName === 'hardware.baseline') {
            const intent = String(args?.intent || '').toLowerCase();
            const params = args?.params || {};
            const looksLikeCapture = intent.includes('capture') || intent.includes('screenshot') || intent.includes('photo');
            if (looksLikeCapture) {
                const resolution = params.resolution || '720p';
                console.log(`[${this.id}] Baseline mapped to capture_image on ${deviceId} with resolution:`, resolution);
                return {
                    baseline: true,
                    routed_capability: 'capture_image',
                    image: 'base64_encoded_mock_image_data_here',
                    format: 'jpeg',
                    resolution
                };
            }
            return {
                baseline: true,
                handled: false,
                message: 'Baseline received intent but it does not map to a known camera action.',
                intent: args?.intent || '',
                params
            };
        }
        throw new Error(`Capability ${capabilityName} not found`);
    }
}
exports.UsbCameraAdapter = UsbCameraAdapter;
