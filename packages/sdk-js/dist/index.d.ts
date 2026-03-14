import { Device, Capability, Session } from '@oahl/core';
type JsonObject = Record<string, any>;
export interface CloudCapabilitiesQuery {
    q?: string;
    type?: string;
    provider?: string;
    node_id?: string;
    capability?: string;
    page?: number;
    page_size?: number;
}
export interface CloudCapabilitiesPagination {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
}
export interface CloudCapabilityDevice {
    id: string;
    type: string;
    capabilities: Array<string | Capability>;
    provider: string;
    node_id: string;
    status: string;
}
export interface CloudCapabilitiesResponse {
    timestamp: number;
    devices: CloudCapabilityDevice[];
    pagination?: CloudCapabilitiesPagination;
    filters?: {
        q?: string;
        type?: string;
        provider?: string;
        node_id?: string;
        capability?: string;
    };
}
export interface CloudRequestSessionInput {
    capability?: string;
    device_id?: string;
    node_id?: string;
}
export interface CloudSessionRequestResponse {
    session_id: string;
    status: string;
}
export interface CloudExecuteInput {
    capability: string;
    params?: JsonObject;
}
export interface CloudStopSessionResponse {
    status: string;
}
declare class HttpClient {
    protected request<T>(url: string, init?: RequestInit): Promise<T>;
}
export declare class OahlClient extends HttpClient {
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
export declare class CloudClient extends HttpClient {
    private baseUrl;
    private agentApiKey?;
    constructor(baseUrl?: string, agentApiKey?: string);
    setAgentApiKey(agentApiKey: string): void;
    private authHeaders;
    getCapabilities(query?: CloudCapabilitiesQuery): Promise<CloudCapabilitiesResponse>;
    requestSession(input: CloudRequestSessionInput): Promise<CloudSessionRequestResponse>;
    execute(sessionId: string, input: CloudExecuteInput): Promise<any>;
    stopSession(sessionId: string): Promise<CloudStopSessionResponse>;
}
export {};
