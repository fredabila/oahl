const test = require('node:test');
const assert = require('node:assert/strict');
const { PolicyEngine } = require('../dist');

test('allows capabilities by default when policy is missing', () => {
  const engine = new PolicyEngine();
  assert.equal(engine.isCapabilityAllowed('device-1', 'camera.capture'), true);
});

test('blocks disabled capability with normalized comparison', () => {
  const engine = new PolicyEngine();
  engine.registerPolicy({
    deviceId: 'device-1',
    maxDurationMs: 60_000,
    allowedCapabilities: [],
    disabledCapabilities: [' Camera.Capture ']
  });

  assert.equal(engine.isCapabilityAllowed('device-1', 'camera.capture'), false);
});

test('enforces allow-list when it is configured', () => {
  const engine = new PolicyEngine();
  engine.registerPolicy({
    deviceId: 'device-1',
    maxDurationMs: 60_000,
    allowedCapabilities: ['camera.capture'],
    disabledCapabilities: []
  });

  assert.equal(engine.isCapabilityAllowed('device-1', 'camera.capture'), true);
  assert.equal(engine.isCapabilityAllowed('device-1', 'camera.stream'), false);
});

test('disabled capability takes priority over allow-list', () => {
  const engine = new PolicyEngine();
  engine.registerPolicy({
    deviceId: 'device-1',
    maxDurationMs: 60_000,
    allowedCapabilities: ['camera.capture'],
    disabledCapabilities: ['camera.capture']
  });

  assert.equal(engine.isCapabilityAllowed('device-1', 'camera.capture'), false);
});
