import { Session } from './types';
import { randomUUID } from 'crypto';

export class SessionManager {
  private sessions: Map<string, Session> = new Map();

  startSession(deviceId: string): Session {
    // Basic session creation
    // To support policy maxDurationMs, we'd add timers here
    const session: Session = {
      id: randomUUID(),
      deviceId,
      startTime: Date.now(),
      status: 'active'
    };
    this.sessions.set(session.id, session);
    return session;
  }

  stopSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'stopped';
    }
  }

  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  isSessionActive(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    return session !== undefined && session.status === 'active';
  }
}
