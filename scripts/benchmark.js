#!/usr/bin/env node

/**
 * OAHL Cloud Relay Load Testing Baseline
 *
 * This script measures the end-to-end relay latency of the OAHL cloud infrastructure.
 * For true baseline testing, ensure your target hardware node is using the
 * `@oahl/adapter-mock` to remove hardware I/O latency from the measurements.
 *
 * Usage:
 *   node scripts/benchmark.js --node=local-node-01 --device=mock-01 --requests=1000 --concurrency=50
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
const CAPABILITY = args.capability || 'input.double_tap';
let PARAMS = {};
if (args.params) {
  try { PARAMS = JSON.parse(args.params); } catch(e) {}
} else if (CAPABILITY.includes('input.')) {
  PARAMS = { x: 500, y: 800 }; // Default safe screen coordinates
}
const TOTAL_REQUESTS = parseInt(args.requests || '100', 10);
const CONCURRENCY = parseInt(args.concurrency || '10', 10);

if (!NODE_ID || !DEVICE_ID) {
  console.error("❌ Error: --node and --device are required.");
  console.log("Usage: node benchmark.js --node=<node_id> --device=<device_id>");
  process.exit(1);
}

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
        'x-agent-id': 'benchmark-runner'
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
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.setTimeout(10000); // 10s timeout

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runBenchmark() {
  console.log(`🚀 Starting OAHL Benchmark`);
  console.log(`Target: ${CLOUD_URL}`);
  console.log(`Node: ${NODE_ID} | Device: ${DEVICE_ID} | Capability: ${CAPABILITY}`);
  console.log(`Requests: ${TOTAL_REQUESTS} | Concurrency: ${CONCURRENCY}\n`);

  // 1. Establish Session
  console.log(`--> Establishing session...`);
  const sessionRes = await makeRequest('POST', '/v1/requests', {
    node_id: NODE_ID,
    device_id: DEVICE_ID
  });

  if (sessionRes.status !== 200) {
    console.error(`❌ Complete failure establishing session:`, sessionRes.data);
    process.exit(1);
  }

  const sessionId = sessionRes.data.session_id;
  console.log(`✅ Session active: ${sessionId}\n`);

  // 2. Run Requests
  console.log(`--> Dispacthing ${TOTAL_REQUESTS} executions...`);
  
  const latencies = [];
  let successful = 0;
  let failed = 0;
  
  const startTime = Date.now();
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < TOTAL_REQUESTS) {
      currentIndex++;
      const reqStart = process.hrtime.bigint();
      
      try {
        const res = await makeRequest('POST', `/v1/sessions/${sessionId}/execute`, {
          capability: CAPABILITY,
          params: PARAMS
        });
        
        const reqEnd = process.hrtime.bigint();
        const durationMs = Number(reqEnd - reqStart) / 1_000_000;
        
        if (res.status === 200 && (res.data.status === 'success' || res.data.result)) {
          successful++;
          latencies.push(durationMs);
        } else {
          failed++;
          if (failed === 1) {
             console.log(`\n⚠️ First execution failure (HTTP ${res.status}):`, JSON.stringify(res.data, null, 2));
          }
        }
      } catch (err) {
        failed++;
      }
    }
  }

  const workers = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);

  const endTime = Date.now();
  const totalDurationSeconds = (endTime - startTime) / 1000;
  
  // 3. Cleanup Session
  await makeRequest('POST', `/v1/sessions/${sessionId}/stop`);

  // 4. Calculate Stats
  latencies.sort((a, b) => a - b);
  
  const p50 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.5)] : 0;
  const p95 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] : 0;
  const p99 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.99)] : 0;
  const avg = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
  const tps = TOTAL_REQUESTS / totalDurationSeconds;

  console.log(`\n📊 Benchmark Results`);
  console.log(`====================`);
  console.log(`Total Time:     ${totalDurationSeconds.toFixed(2)}s`);
  console.log(`Throughput:     ${tps.toFixed(2)} req/sec`);
  console.log(`Successful:     ${successful}`);
  console.log(`Failed:         ${failed} ${failed > 0 ? '(Ensure rate limits are configured for tests!)' : ''}`);
  console.log(`\nLatency Percentiles:`);
  console.log(`  Average:      ${avg.toFixed(2)} ms`);
  console.log(`  p50 (Median): ${p50.toFixed(2)} ms`);
  console.log(`  p95:          ${p95.toFixed(2)} ms`);
  console.log(`  p99:          ${p99.toFixed(2)} ms`);
}

runBenchmark().catch(err => {
  console.error("❌ Fatal benchmark error:", err);
  process.exit(1);
});
