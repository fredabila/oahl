export interface PricingDescriptor {
  currency: string;
  rate_per_minute?: number;
  rate_per_execution?: number;
  payment_address?: string; // e.g., Stripe Connect ID or Crypto Wallet
}

export interface Device {
  id: string;
  type: string;
  name: string;
  isPublic: boolean;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  semantic_context?: string[]; // For W3C WoT @context alignment
  metadata?: Record<string, any>;
  pricing?: PricingDescriptor;
}

export interface Capability {
  name: string;
  description: string;
  schema: any; // JSON Schema for arguments
  instructions?: string; // Natural language instructions for AI Agents (MCP style)
  semantic_type?: string; // e.g. "ActionAffordance" from WoT
  helper_url?: string;
  template?: string;
  context?: string;
  metadata?: Record<string, any>;
  pricing?: PricingDescriptor;
}

export interface ExecutionResult {
  status: 'success' | 'error';
  error_code?: string;
  message?: string;
  data?: any;
  agent_recovery_hints?: string[]; // Natural language hints for AI Agents to recover from errors
  [key: string]: any;
}

export interface Adapter {
  id: string;
  initialize(): Promise<void>;
  healthCheck(): Promise<{ status: 'ok' | 'error'; message?: string }>;
  getDevices(): Promise<Device[]>;
  getCapabilities(deviceId: string): Promise<Capability[]>;
  execute(deviceId: string, capabilityName: string, args: any): Promise<any | ExecutionResult>;
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
