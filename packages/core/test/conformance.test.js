const test = require('node:test');
const assert = require('node:assert/strict');
const { SessionManager, PolicyEngine } = require('../dist');

test('conformance/session: denies concurrent active sessions on same device', () => {
  const manager = new SessionManager();
  manager.startSession('device-1');

  assert.throws(() => manager.startSession('device-1'), /already has an active session/);
});

test('conformance/session: allows new session after stop and clears active state', () => {
  const manager = new SessionManager();
  const first = manager.startSession('device-1');

  manager.stopSession(first.id);

  assert.equal(manager.hasActiveSessionForDevice('device-1'), false);
  const second = manager.startSession('device-1');
  assert.equal(second.status, 'active');
  assert.notEqual(first.id, second.id);
});

test('conformance/policy: capability checks are case-insensitive and trimmed', () => {
  const engine = new PolicyEngine();
  engine.registerPolicy({
    deviceId: 'device-2',
    maxDurationMs: 120000,
    allowedCapabilities: [' Camera.Capture '],
    disabledCapabilities: []
  });

  assert.equal(engine.isCapabilityAllowed('device-2', 'camera.capture'), true);
  assert.equal(engine.isCapabilityAllowed('device-2', '  CAMERA.CAPTURE  '), true);
  assert.equal(engine.isCapabilityAllowed('device-2', 'camera.stream'), false);
});

test('conformance/policy: disabled capability overrides allow-list', () => {
  const engine = new PolicyEngine();
  engine.registerPolicy({
    deviceId: 'device-3',
    maxDurationMs: 120000,
    allowedCapabilities: ['camera.capture'],
    disabledCapabilities: ['camera.capture']
  });

  assert.equal(engine.isCapabilityAllowed('device-3', 'camera.capture'), false);
});
