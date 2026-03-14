import { Session } from './types';
export declare class SessionManager {
    private sessions;
    private activeSessionsByDevice;
    startSession(deviceId: string): Session;
    stopSession(sessionId: string): void;
    getSession(sessionId: string): Session | undefined;
    isSessionActive(sessionId: string): boolean;
    getActiveSessionForDevice(deviceId: string): Session | undefined;
    hasActiveSessionForDevice(deviceId: string): boolean;
}
