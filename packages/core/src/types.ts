export interface Device {
  id: string;
  type: string;
  name: string;
  isPublic: boolean;
}

export interface Capability {
  name: string;
  description: string;
  schema: any; // JSON Schema for arguments
  helper_url?: string;
  template?: string;
  context?: string;
  metadata?: Record<string, any>;
}

export interface Adapter {
  id: string;
  initialize(): Promise<void>;
  healthCheck(): Promise<{ status: 'ok' | 'error'; message?: string }>;
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
