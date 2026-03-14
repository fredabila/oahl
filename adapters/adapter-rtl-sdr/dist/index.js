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
        return [
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
            }
        ];
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
        throw new Error(`Capability ${capabilityName} not found`);
    }
}
exports.RtlSdrAdapter = RtlSdrAdapter;
