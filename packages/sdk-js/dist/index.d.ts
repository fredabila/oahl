import { Device, Capability, Session } from '@oahl/core';
export declare class OahlClient {
    private baseUrl;
    constructor(baseUrl?: string);
    health(): Promise<any>;
    getDevices(): Promise<Device[]>;
    getCapabilities(deviceId: string): Promise<Capability[]>;
    startSession(deviceId: string): Promise<Session>;
    execute(sessionId: string, capabilityName: string, args?: any): Promise<any>;
    stopSession(sessionId: string): Promise<void>;
    getSession(sessionId: string): Promise<Session>;
}
