"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyEngine = void 0;
class PolicyEngine {
    policies = new Map();
    registerPolicy(policy) {
        this.policies.set(policy.deviceId, policy);
    }
    getPolicy(deviceId) {
        return this.policies.get(deviceId);
    }
    isCapabilityAllowed(deviceId, capabilityName) {
        const policy = this.getPolicy(deviceId);
        if (!policy)
            return true; // Default allow if no policy, or we could strict default deny
        if (policy.disabledCapabilities.includes(capabilityName)) {
            return false;
        }
        if (policy.allowedCapabilities.length > 0 && !policy.allowedCapabilities.includes(capabilityName)) {
            return false;
        }
        return true;
    }
}
exports.PolicyEngine = PolicyEngine;
