"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionManager = void 0;
const crypto_1 = require("crypto");
class SessionManager {
    sessions = new Map();
    activeSessionsByDevice = new Map();
    startSession(deviceId) {
        const activeSession = this.getActiveSessionForDevice(deviceId);
        if (activeSession) {
            throw new Error(`Device ${deviceId} already has an active session`);
        }
        const session = {
            id: (0, crypto_1.randomUUID)(),
            deviceId,
            startTime: Date.now(),
            status: 'active'
        };
        this.sessions.set(session.id, session);
        this.activeSessionsByDevice.set(deviceId, session.id);
        return session;
    }
    stopSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.status = 'stopped';
            const activeSessionId = this.activeSessionsByDevice.get(session.deviceId);
            if (activeSessionId === sessionId) {
                this.activeSessionsByDevice.delete(session.deviceId);
            }
        }
    }
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    isSessionActive(sessionId) {
        const session = this.sessions.get(sessionId);
        return session !== undefined && session.status === 'active';
    }
    getActiveSessionForDevice(deviceId) {
        const sessionId = this.activeSessionsByDevice.get(deviceId);
        if (!sessionId) {
            return undefined;
        }
        const session = this.sessions.get(sessionId);
        if (!session || session.status !== 'active') {
            this.activeSessionsByDevice.delete(deviceId);
            return undefined;
        }
        return session;
    }
    hasActiveSessionForDevice(deviceId) {
        return this.getActiveSessionForDevice(deviceId) !== undefined;
    }
}
exports.SessionManager = SessionManager;
