"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RtlSdrAdapter = void 0;
class RtlSdrAdapter {
    id = 'rtl-sdr-adapter';
    devices = [
        {
            id: 'rtl-sdr-1',
            type: 'sdr',
            name: 'RTL-SDR V3',
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
        if (deviceId !== 'rtl-sdr-1') {
            throw new Error('Device not found');
        }
        const capabilities = [
            {
                name: 'tune',
                description: 'Tunes the SDR to a specific frequency',
                schema: {
                    type: 'object',
                    properties: {
                        frequencyHz: { type: 'number' }
                    },
                    required: ['frequencyHz']
                }
            },
            {
                name: 'read_samples',
                description: 'Reads raw IQ samples',
                schema: {
                    type: 'object',
                    properties: {
                        count: { type: 'number', default: 1024 }
                    }
                }
            },
            {
                name: 'hardware.baseline',
                description: 'Fallback capability for SDR actions when direct capability is not provided.',
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
                helper_url: 'https://example.com/oahl/sdr-baseline-helper',
                template: 'Use params.frequencyHz for tuning or params.count for sample reads.'
            }
        ];
        return capabilities;
    }
    async execute(deviceId, capabilityName, args) {
        if (deviceId !== 'rtl-sdr-1') {
            throw new Error('Device not found');
        }
        if (capabilityName === 'tune') {
            console.log(`[${this.id}] Tuning ${deviceId} to ${args.frequencyHz}Hz`);
            return { success: true, frequencyHz: args.frequencyHz };
        }
        if (capabilityName === 'read_samples') {
            console.log(`[${this.id}] Reading ${args.count || 1024} samples from ${deviceId}`);
            return {
                samples: Array.from({ length: args.count || 1024 }, () => Math.random() - 0.5),
                sampleRate: 2048000
            };
        }
        if (capabilityName === 'hardware.baseline') {
            const intent = String(args?.intent || '').toLowerCase();
            const params = args?.params || {};
            if ((intent.includes('tune') || intent.includes('frequency')) && typeof params.frequencyHz === 'number') {
                console.log(`[${this.id}] Baseline mapped to tune on ${deviceId} to ${params.frequencyHz}Hz`);
                return { baseline: true, routed_capability: 'tune', success: true, frequencyHz: params.frequencyHz };
            }
            if (intent.includes('sample') || intent.includes('iq')) {
                const count = typeof params.count === 'number' ? params.count : 1024;
                console.log(`[${this.id}] Baseline mapped to read_samples on ${deviceId} count=${count}`);
                return {
                    baseline: true,
                    routed_capability: 'read_samples',
                    samples: Array.from({ length: count }, () => Math.random() - 0.5),
                    sampleRate: 2048000
                };
            }
            return {
                baseline: true,
                handled: false,
                message: 'Baseline received intent but it does not map to a known SDR action.',
                intent: args?.intent || '',
                params
            };
        }
        throw new Error(`Capability ${capabilityName} not found`);
    }
}
exports.RtlSdrAdapter = RtlSdrAdapter;
