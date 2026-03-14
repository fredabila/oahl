const test = require('node:test');
const assert = require('node:assert/strict');
const { SessionManager } = require('../dist');

test('starts a session and marks it active', () => {
  const manager = new SessionManager();
  const session = manager.startSession('device-123');

  assert.equal(session.deviceId, 'device-123');
  assert.equal(session.status, 'active');
  assert.equal(manager.isSessionActive(session.id), true);
  assert.equal(manager.hasActiveSessionForDevice('device-123'), true);
});

test('stops an active session', () => {
  const manager = new SessionManager();
  const session = manager.startSession('device-123');

  manager.stopSession(session.id);

  assert.equal(manager.isSessionActive(session.id), false);
  assert.equal(manager.getSession(session.id)?.status, 'stopped');
  assert.equal(manager.hasActiveSessionForDevice('device-123'), false);
});

test('prevents multiple active sessions on same device', () => {
  const manager = new SessionManager();
  manager.startSession('device-123');

  assert.throws(() => manager.startSession('device-123'), /already has an active session/);
});

test('allows new session after previous one is stopped', () => {
  const manager = new SessionManager();
  const first = manager.startSession('device-123');
  manager.stopSession(first.id);

  const second = manager.startSession('device-123');

  assert.equal(second.status, 'active');
  assert.notEqual(first.id, second.id);
});
