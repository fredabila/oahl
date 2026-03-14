export type TransportProtocol = 'usb' | 'serial' | 'pcie' | 'gpio' | 'i2c' | 'spi' | 'ble' | 'wifi_direct' | 'tcp' | 'udp' | 'http' | 'https' | 'ws' | 'wss' | 'mqtt' | 'mqtts' | 'coap' | 'rtsp' | 'grpc' | 'webrtc';
export type TransportMode = 'local' | 'lan' | 'wan' | 'relay';
export type TransportAuthType = 'none' | 'token' | 'basic' | 'mtls' | 'pairing' | 'custom';
export interface TransportAttachmentProfile {
    protocol: TransportProtocol;
    mode: TransportMode;
    endpoint?: string;
    auth?: {
        type: TransportAuthType;
        details?: any;
    };
    security?: {
        tls?: boolean;
        certificate_pinning?: boolean;
        encrypted_transport?: boolean;
        [key: string]: any;
    };
    metadata?: Record<string, any>;
}
export interface TransportConnectRequest {
    deviceId: string;
    profile: TransportAttachmentProfile;
    timeoutMs?: number;
}
export interface TransportConnection {
    connectionId: string;
    deviceId: string;
    protocol: TransportProtocol;
    connectedAt: number;
    metadata?: Record<string, any>;
}
export interface TransportHealth {
    status: 'ok' | 'error';
    message?: string;
    latencyMs?: number;
    details?: Record<string, any>;
}
export interface TransportCommand<TPayload = any> {
    operationId: string;
    capability: string;
    payload: TPayload;
    timeoutMs?: number;
}
export interface TransportResult<TData = any> {
    operationId: string;
    success: boolean;
    data?: TData;
    error?: {
        code: string;
        message: string;
        retryable?: boolean;
        details?: any;
    };
    durationMs?: number;
    raw?: any;
}
export interface TransportProvider {
    id: string;
    protocols: TransportProtocol[];
    supports(profile: TransportAttachmentProfile): boolean;
    connect(request: TransportConnectRequest): Promise<TransportConnection>;
    disconnect(connection: TransportConnection): Promise<void>;
    health(connection: TransportConnection): Promise<TransportHealth>;
    execute<TPayload = any, TData = any>(connection: TransportConnection, command: TransportCommand<TPayload>): Promise<TransportResult<TData>>;
}
export declare abstract class BaseTransportProvider implements TransportProvider {
    abstract id: string;
    abstract protocols: TransportProtocol[];
    abstract supports(profile: TransportAttachmentProfile): boolean;
    abstract connect(request: TransportConnectRequest): Promise<TransportConnection>;
    abstract disconnect(connection: TransportConnection): Promise<void>;
    abstract health(connection: TransportConnection): Promise<TransportHealth>;
    abstract execute<TPayload = any, TData = any>(connection: TransportConnection, command: TransportCommand<TPayload>): Promise<TransportResult<TData>>;
    protected withRetry<T>(action: () => Promise<T>, options?: {
        attempts?: number;
        delayMs?: number;
    }): Promise<T>;
}
