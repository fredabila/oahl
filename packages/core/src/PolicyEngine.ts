import { Policy, Capability } from './types';

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
    if (!policy) return true; // Default allow if no policy, or we could strict default deny

    if (policy.disabledCapabilities.includes(capabilityName)) {
      return false;
    }
    
    if (policy.allowedCapabilities.length > 0 && !policy.allowedCapabilities.includes(capabilityName)) {
      return false;
    }

    return true;
  }
}
