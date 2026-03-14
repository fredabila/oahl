import { Session } from './types';
import { randomUUID } from 'crypto';

export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private activeSessionsByDevice: Map<string, string> = new Map();

  startSession(deviceId: string): Session {
    const activeSession = this.getActiveSessionForDevice(deviceId);
    if (activeSession) {
      throw new Error(`Device ${deviceId} already has an active session`);
    }

    const session: Session = {
      id: randomUUID(),
      deviceId,
      startTime: Date.now(),
      status: 'active'
    };

    this.sessions.set(session.id, session);
    this.activeSessionsByDevice.set(deviceId, session.id);
    return session;
  }

  stopSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'stopped';
      const activeSessionId = this.activeSessionsByDevice.get(session.deviceId);
      if (activeSessionId === sessionId) {
        this.activeSessionsByDevice.delete(session.deviceId);
      }
    }
  }

  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  isSessionActive(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    return session !== undefined && session.status === 'active';
  }

  getActiveSessionForDevice(deviceId: string): Session | undefined {
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

  hasActiveSessionForDevice(deviceId: string): boolean {
    return this.getActiveSessionForDevice(deviceId) !== undefined;
  }
}
