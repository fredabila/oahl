"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyEngine = void 0;
function normalizeCapabilityName(name) {
    return (name || '').trim().toLowerCase();
}
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
            return true;
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
exports.PolicyEngine = PolicyEngine;
