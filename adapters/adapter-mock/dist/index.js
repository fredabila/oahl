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
        const capabilities = [
            {
                name: 'ping',
                description: 'Pings the device',
                schema: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' }
                    }
                }
            },
            {
                name: 'hardware.baseline',
                description: 'Fallback capability template for unsupported or ad-hoc hardware actions.',
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
                helper_url: 'https://example.com/oahl/mock-baseline-helper',
                template: 'Describe desired action in intent, provide structured params, and include expected_output shape.'
            }
        ];
        return capabilities;
    }
    async execute(deviceId, capabilityName, args) {
        if (deviceId !== 'mock-device-1') {
            throw new Error('Device not found');
        }
        if (capabilityName === 'ping') {
            console.log(`[${this.id}] Executing ping on ${deviceId} with args:`, args);
            return { response: `Pong: ${args.message || 'no message'}` };
        }
        if (capabilityName === 'hardware.baseline') {
            const intent = String(args?.intent || '').toLowerCase();
            if (intent.includes('ping')) {
                return {
                    routed_capability: 'ping',
                    response: `Pong: ${args?.params?.message || args?.message || 'no message'}`,
                    baseline: true
                };
            }
            return {
                baseline: true,
                handled: false,
                message: 'Baseline received intent but no specific mapping was found.',
                intent: args?.intent || '',
                params: args?.params || {}
            };
        }
        throw new Error(`Capability ${capabilityName} not found`);
    }
}
exports.MockAdapter = MockAdapter;
