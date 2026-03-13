import { SessionManager } from './SessionManager';

describe('SessionManager', () => {
  it('should start a session and keep it active', () => {
    const manager = new SessionManager();
    const session = manager.startSession('device-123');
    
    expect(session.deviceId).toBe('device-123');
    expect(session.status).toBe('active');
    expect(manager.isSessionActive(session.id)).toBe(true);
  });

  it('should stop an active session', () => {
    const manager = new SessionManager();
    const session = manager.startSession('device-123');
    
    manager.stopSession(session.id);
    expect(manager.isSessionActive(session.id)).toBe(false);
    expect(manager.getSession(session.id)?.status).toBe('stopped');
  });
});
