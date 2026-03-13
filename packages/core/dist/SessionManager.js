"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionManager = void 0;
const crypto_1 = require("crypto");
class SessionManager {
    sessions = new Map();
    startSession(deviceId) {
        // Basic session creation
        // To support policy maxDurationMs, we'd add timers here
        const session = {
            id: (0, crypto_1.randomUUID)(),
            deviceId,
            startTime: Date.now(),
            status: 'active'
        };
        this.sessions.set(session.id, session);
        return session;
    }
    stopSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.status = 'stopped';
        }
    }
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    isSessionActive(sessionId) {
        const session = this.sessions.get(sessionId);
        return session !== undefined && session.status === 'active';
    }
}
exports.SessionManager = SessionManager;
