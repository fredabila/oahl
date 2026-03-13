import { Session } from './types';
export declare class SessionManager {
    private sessions;
    startSession(deviceId: string): Session;
    stopSession(sessionId: string): void;
    getSession(sessionId: string): Session | undefined;
    isSessionActive(sessionId: string): boolean;
}
