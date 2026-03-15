export interface PricingDescriptor {
    currency: string;
    rate_per_minute?: number;
    rate_per_execution?: number;
    payment_address?: string;
}
export interface Device {
    id: string;
    type: string;
    name: string;
    isPublic: boolean;
    manufacturer?: string;
    model?: string;
    serial_number?: string;
    semantic_context?: string[];
    metadata?: Record<string, any>;
    pricing?: PricingDescriptor;
}
export interface Capability {
    name: string;
    description: string;
    schema: any;
    instructions?: string;
    semantic_type?: string;
    helper_url?: string;
    template?: string;
    context?: string;
    metadata?: Record<string, any>;
    pricing?: PricingDescriptor;
}
export interface Adapter {
    id: string;
    initialize(): Promise<void>;
    healthCheck(): Promise<{
        status: 'ok' | 'error';
        message?: string;
    }>;
    getDevices(): Promise<Device[]>;
    getCapabilities(deviceId: string): Promise<Capability[]>;
    execute(deviceId: string, capabilityName: string, args: any): Promise<any>;
}
export interface Session {
    id: string;
    deviceId: string;
    startTime: number;
    status: 'active' | 'stopped';
}
export interface Policy {
    deviceId: string;
    maxDurationMs: number;
    allowedCapabilities: string[];
    disabledCapabilities: string[];
}
