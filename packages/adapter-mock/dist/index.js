"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockAdapter = void 0;
class MockAdapter {
    id = 'mock-adapter';
    devices = [
        {
            id: 'mock-device-1',
            type: 'mock',
            name: 'Mock Device 1',
            isPublic: true
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
    async execute(deviceId, capabilityName, args) {
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
exports.MockAdapter = MockAdapter;
