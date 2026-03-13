import { Policy } from './types';
export declare class PolicyEngine {
    private policies;
    registerPolicy(policy: Policy): void;
    getPolicy(deviceId: string): Policy | undefined;
    isCapabilityAllowed(deviceId: string, capabilityName: string): boolean;
}
