"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SessionManager_1 = require("./SessionManager");
describe('SessionManager', () => {
    it('should start a session and keep it active', () => {
        const manager = new SessionManager_1.SessionManager();
        const session = manager.startSession('device-123');
        expect(session.deviceId).toBe('device-123');
        expect(session.status).toBe('active');
        expect(manager.isSessionActive(session.id)).toBe(true);
    });
    it('should stop an active session', () => {
        const manager = new SessionManager_1.SessionManager();
        const session = manager.startSession('device-123');
        manager.stopSession(session.id);
        expect(manager.isSessionActive(session.id)).toBe(false);
        expect(manager.getSession(session.id)?.status).toBe('stopped');
    });
});
