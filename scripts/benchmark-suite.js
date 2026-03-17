#!/usr/bin/env node

/**
 * OAHL Multi-Scenario Benchmark Suite
 *
 * Extends the baseline benchmark with multiple hardware capability profiles
 * to characterise cloud relay latency across heterogeneous device types.
 *
 * Predefined profiles:
 *   --profile=android-tap     (input.double_tap, c=20)
 *   --profile=camera-capture  (camera.capture, c=10)
 *   --profile=sensor-read     (sensor.read, c=50)
 *   --profile=multi-device    (runs all profiles sequentially)
 *
 * Or manual:
 *   node scripts/benchmark-suite.js --node=my-node --device=dev-01 \
 *     --capability=radio.scan --requests=200 --concurrency=20
 *
 * Output: JSON results to stdout (pipe to file for analysis)
 */

const http = require('http');
const https = require('https');

const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.split('=');
  if (key.startsWith('--')) {
    acc[key.slice(2)] = value || true;
  }
  return acc;
}, {});

const CLOUD_URL = args.url || process.env.OAHL_CLOUD_URL || 'http://localhost:3000';
const API_KEY = args.key || process.env.OAHL_AGENT_API_KEY || '123456';
const NODE_ID = args.node;
const DEVICE_ID = args.device;
const PROFILE = args.profile || '';

// Predefined benchmark profiles
const PROFILES = {
  'android-tap': {
    label: 'Android input.double_tap @ c=20',
    capability: 'input.double_tap',
    params: { x: 500, y: 800 },
    requests: 200,
    concurrency: 20
  },
  'camera-capture': {
    label: 'Camera capture @ c=10',
    capability: 'camera.capture',
    params: { resolution: '720p', format: 'jpeg' },
    requests: 100,
    concurrency: 10
  },
  'sensor-read': {
    label: 'Sensor read @ c=50',
    capability: 'sensor.read',
    params: { channel: 0 },
    requests: 500,
    concurrency: 50
  },
  'screen-capture': {
    label: 'Screen capture @ c=15',
    capability: 'screen.capture',
    params: {},
    requests: 150,
    concurrency: 15
  },
  'radio-scan': {
    label: 'Radio scan @ c=5',
    capability: 'radio.scan',
    params: { frequency_mhz: 433.92, duration_ms: 2000 },
    requests: 50,
    concurrency: 5
  }
};

const isHttps = CLOUD_URL.startsWith('https');
const requestLib = isHttps ? https : http;

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, CLOUD_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'x-agent-id': 'benchmark-suite'
      }
    };

    const req = requestLib.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.setTimeout(30000);

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runSingleBenchmark({ label, capability, params, requests, concurrency, nodeId, deviceId }) {
  console.log(`\n────────────────────────────────────`);
  console.log(`📋 ${label}`);
  console.log(`   ${capability} | ${requests} reqs | c=${concurrency}`);
  console.log(`────────────────────────────────────`);

  // Establish session
  const sessionRes = await makeRequest('POST', '/v1/requests', {
    node_id: nodeId,
    device_id: deviceId
  });

  if (sessionRes.status !== 200) {
    console.error(`   ❌ Session failed:`, sessionRes.data);
    return { label, capability, error: 'session_failed', details: sessionRes.data };
  }

  const sessionId = sessionRes.data.session_id;
  console.log(`   ✅ Session: ${sessionId}`);

  // Run concurrent requests
  const latencies = [];
  let successful = 0;
  let failed = 0;
  let throttled = 0;
  const startTime = Date.now();
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < requests) {
      currentIndex++;
      const reqStart = process.hrtime.bigint();

      try {
        const res = await makeRequest('POST', `/v1/sessions/${sessionId}/execute`, {
          capability,
          params
        });

        const reqEnd = process.hrtime.bigint();
        const durationMs = Number(reqEnd - reqStart) / 1_000_000;

        if (res.status === 429) {
          throttled++;
        } else if (res.status === 200 && (res.data.status === 'success' || res.data.result)) {
          successful++;
          latencies.push(durationMs);
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }
  }

  const workers = [];
  for (let i = 0; i < concurrency; i++) workers.push(worker());
  await Promise.all(workers);

  const totalDurationSeconds = (Date.now() - startTime) / 1000;

  // Cleanup
  await makeRequest('POST', `/v1/sessions/${sessionId}/stop`);

  // Stats
  latencies.sort((a, b) => a - b);
  const p50 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.5)] : 0;
  const p95 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] : 0;
  const p99 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.99)] : 0;
  const avg = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
  const min = latencies.length > 0 ? latencies[0] : 0;
  const max = latencies.length > 0 ? latencies[latencies.length - 1] : 0;
  const tps = requests / totalDurationSeconds;

  const result = {
    label,
    capability,
    concurrency,
    total_requests: requests,
    successful,
    failed,
    throttled,
    total_duration_s: parseFloat(totalDurationSeconds.toFixed(2)),
    throughput_rps: parseFloat(tps.toFixed(2)),
    latency: {
      avg_ms: parseFloat(avg.toFixed(2)),
      min_ms: parseFloat(min.toFixed(2)),
      p50_ms: parseFloat(p50.toFixed(2)),
      p95_ms: parseFloat(p95.toFixed(2)),
      p99_ms: parseFloat(p99.toFixed(2)),
      max_ms: parseFloat(max.toFixed(2))
    }
  };

  console.log(`   ⏱  ${totalDurationSeconds.toFixed(2)}s | ${tps.toFixed(1)} req/s`);
  console.log(`   ✅ ${successful} ok | ❌ ${failed} fail | 🚦 ${throttled} throttled`);
  console.log(`   p50=${p50.toFixed(0)}ms  p95=${p95.toFixed(0)}ms  p99=${p99.toFixed(0)}ms`);

  return result;
}

async function main() {
  if (!NODE_ID || !DEVICE_ID) {
    console.error("❌ Error: --node and --device are required.");
    console.log("Usage: node benchmark-suite.js --node=<node_id> --device=<device_id> [--profile=<name>]");
    console.log("\nProfiles: " + Object.keys(PROFILES).join(', ') + ', multi-device');
    process.exit(1);
  }

  console.log(`🚀 OAHL Benchmark Suite`);
  console.log(`Target: ${CLOUD_URL}`);
  console.log(`Node: ${NODE_ID} | Device: ${DEVICE_ID}\n`);

  const results = [];

  if (PROFILE === 'multi-device') {
    // Run all profiles sequentially
    for (const [name, profile] of Object.entries(PROFILES)) {
      const r = await runSingleBenchmark({
        ...profile,
        nodeId: NODE_ID,
        deviceId: DEVICE_ID
      });
      results.push(r);

      // Brief cooldown between profiles to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } else if (PROFILE && PROFILES[PROFILE]) {
    const profile = PROFILES[PROFILE];
    const r = await runSingleBenchmark({
      ...profile,
      nodeId: NODE_ID,
      deviceId: DEVICE_ID
    });
    results.push(r);
  } else {
    // Manual mode
    const capability = args.capability || 'input.double_tap';
    const requests = parseInt(args.requests || '100', 10);
    const concurrency = parseInt(args.concurrency || '10', 10);
    let params = {};
    if (args.params) {
      try { params = JSON.parse(args.params); } catch {}
    } else if (capability.includes('input.')) {
      params = { x: 500, y: 800 };
    }

    const r = await runSingleBenchmark({
      label: `Custom: ${capability} @ c=${concurrency}`,
      capability,
      params,
      requests,
      concurrency,
      nodeId: NODE_ID,
      deviceId: DEVICE_ID
    });
    results.push(r);
  }

  // Summary
  console.log(`\n\n════════════════════════════════════`);
  console.log(`📊 BENCHMARK SUMMARY`);
  console.log(`════════════════════════════════════`);

  const header = ['Capability', 'c', 'Reqs', 'OK', 'Fail', '429', 'RPS', 'p50', 'p95', 'p99'].map(h => h.padEnd(12)).join('');
  console.log(header);
  console.log('─'.repeat(header.length));

  for (const r of results) {
    if (r.error) {
      console.log(`${r.capability.padEnd(12)} ERROR: ${r.error}`);
      continue;
    }
    console.log([
      r.capability.padEnd(12),
      String(r.concurrency).padEnd(12),
      String(r.total_requests).padEnd(12),
      String(r.successful).padEnd(12),
      String(r.failed).padEnd(12),
      String(r.throttled).padEnd(12),
      String(r.throughput_rps).padEnd(12),
      `${r.latency.p50_ms}ms`.padEnd(12),
      `${r.latency.p95_ms}ms`.padEnd(12),
      `${r.latency.p99_ms}ms`.padEnd(12)
    ].join(''));
  }

  // Machine-readable output
  console.log(`\n📝 JSON Results:`);
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    target: CLOUD_URL,
    node_id: NODE_ID,
    device_id: DEVICE_ID,
    profile: PROFILE || 'custom',
    results
  }, null, 2));
}

main().catch(err => {
  console.error("❌ Fatal benchmark error:", err);
  process.exit(1);
});
