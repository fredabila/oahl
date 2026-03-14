import { Policy } from './types';

function normalizeCapabilityName(name: string): string {
  return (name || '').trim().toLowerCase();
}

export class PolicyEngine {
  private policies: Map<string, Policy> = new Map();

  registerPolicy(policy: Policy) {
    this.policies.set(policy.deviceId, policy);
  }

  getPolicy(deviceId: string): Policy | undefined {
    return this.policies.get(deviceId);
  }

  isCapabilityAllowed(deviceId: string, capabilityName: string): boolean {
    const policy = this.getPolicy(deviceId);
    if (!policy) return true;

    const requestedCapability = normalizeCapabilityName(capabilityName);
    const disabledCapabilities = (policy.disabledCapabilities || []).map(normalizeCapabilityName);
    const allowedCapabilities = (policy.allowedCapabilities || []).map(normalizeCapabilityName);

    if (disabledCapabilities.includes(requestedCapability)) {
      return false;
    }
    
    if (allowedCapabilities.length > 0 && !allowedCapabilities.includes(requestedCapability)) {
      return false;
    }

    return true;
  }
}
