import express from 'express';
import { Adapter, SessionManager, PolicyEngine } from '@oahl/core';
import * as fs from 'fs';
import * as path from 'path';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Load configuration
let config: any = {
  node_id: 'default-node',
  devices: []
};

const configPath = path.resolve(process.cwd(), 'oahl-config.json');
if (fs.existsSync(configPath)) {
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log(`[Config] 🟢 Loaded config from ${configPath}`);
  } catch (err: any) {
    console.error(`[Config] ❌ Failed to parse oahl-config.json: ${err.message}`);
  }
}

// Initialize core components
const sessionManager = new SessionManager();
const adapters: Adapter[] = [];

function resolveAdapterClass(imported: any): any {
  if (!imported) return undefined;
  if (typeof imported === 'function') return imported;
  if (typeof imported.default === 'function') return imported.default;

  const exportCandidates = Object.values(imported).filter((value: any) => typeof value === 'function');
  if (exportCandidates.length > 0) {
    return exportCandidates[0];
  }

  return undefined;
}

function asExecutionResult(options: {
  requestId: string;
  deviceId: string;
  capability: string;
  adapterId?: string;
  rawResult?: any;
  error?: any;
}): any {
  const { requestId, deviceId, capability, adapterId, rawResult, error } = options;

  if (rawResult && typeof rawResult === 'object' &&
      typeof rawResult.schema_version === 'string' &&
      typeof rawResult.operation_id === 'string' &&
      typeof rawResult.status === 'string' &&
      rawResult.completion && typeof rawResult.completion === 'object') {
    return {
      ...rawResult,
      schema_version: rawResult.schema_version || '1.0',
      operation_id: rawResult.operation_id || requestId,
      capability: rawResult.capability || capability,
      device_id: rawResult.device_id || deviceId,
      timestamp: rawResult.timestamp || new Date().toISOString(),
      meta: {
        ...(rawResult.meta || {}),
        adapter_id: (rawResult.meta && rawResult.meta.adapter_id) || adapterId
      }
    };
  }

  if (error) {
    return {
      schema_version: '1.0',
      operation_id: requestId,
      status: 'error',
      completion: {
        done: true,
        state: 'failed'
      },
      capability,
      device_id: deviceId,
      timestamp: new Date().toISOString(),
      error: {
        code: 'EXECUTION_FAILED',
        message: error.message || 'Capability execution failed',
        retryable: true,
        details: {
          name: error.name
        }
      },
      meta: {
        adapter_id: adapterId
      }
    };
  }

  const inferredSuccess = !(rawResult && typeof rawResult === 'object' && rawResult.success === false);

  return {
    schema_version: '1.0',
    operation_id: requestId,
    status: inferredSuccess ? 'success' : 'error',
    completion: {
      done: true,
      state: inferredSuccess ? 'completed' : 'failed'
    },
    capability,
    device_id: deviceId,
    timestamp: new Date().toISOString(),
    data: rawResult,
    ...(inferredSuccess ? {} : {
      error: {
        code: 'ADAPTER_REPORTED_FAILURE',
        message: 'Adapter reported an unsuccessful execution result',
        retryable: true,
        details: rawResult
      }
    }),
    meta: {
      adapter_id: adapterId
    }
  };
}

// Dynamic Plugin Loading
if (config.plugins && Array.isArray(config.plugins)) {
  for (const pluginName of config.plugins) {
    try {
      console.log(`[Plugins] 🔌 Loading adapter: ${pluginName}...`);
      let imported: any;
      try {
        imported = require(pluginName);
      } catch {
        const localPath = path.resolve(process.cwd(), 'node_modules', pluginName);
        imported = require(localPath);
      }
      const PluginClass = resolveAdapterClass(imported);
      if (typeof PluginClass === 'function') {
        adapters.push(new PluginClass());
        console.log(`[Plugins] ✅ ${pluginName} loaded successfully.`);
      } else {
        console.error(`[Plugins] ❌ ${pluginName} does not export a constructable adapter class.`);
      }
    } catch (err: any) {
      console.error(`[Plugins] ❌ Failed to load adapter ${pluginName}: ${err.message}`);
    }
  }
}

// Helper to find adapter for a device
async function getAdapterForDevice(deviceId: string): Promise<Adapter | undefined> {
  for (const adapter of adapters) {
    const devices = await adapter.getDevices();
    if (devices.find(d => d.id === deviceId)) return adapter;
  }
  return undefined;
}

// --- CLOUD RELAY LISTENER (The Mailbox) ---
async function startCloudRelay(config: any, adapters: Adapter[]) {
  if (!config.cloud_url || !config.provider_api_key) return;

  console.log(`[Cloud Relay] 📬 Starting HTTP Command Listener (Polling)...`);

  const relayMaxConcurrency = Math.max(
    1,
    Number.parseInt(process.env.OAHL_RELAY_MAX_CONCURRENCY || '4', 10) || 4
  );
  const inFlightCommands = new Set<Promise<void>>();

  const sendResultToCloud = async (requestId: string, result: any, resultType: string) => {
    const response = await fetch(`${config.cloud_url}/v1/provider/nodes/results`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.provider_api_key}`
      },
      body: JSON.stringify({
        requestId,
        result
      })
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`[Cloud Relay] ❌ Failed to send ${resultType} result for ${requestId}: ${response.status} ${body}`);
      return;
    }

    console.log(`[Cloud Relay] 📤 Sent ${resultType} result back for ${requestId}`);
  };

  const handlePolledCommand = async (payload: any) => {
    console.log(`[Cloud Relay] 📥 Received command: ${payload.capability} for device ${payload.deviceId}`);
    const relayStartedAt = Date.now();

    const adapter = await getAdapterForDevice(payload.deviceId);
    if (adapter) {
      try {
        const rawResult = await adapter.execute(payload.deviceId, payload.capability, payload.params || {});
        const result = asExecutionResult({
          requestId: payload.requestId,
          deviceId: payload.deviceId,
          capability: payload.capability,
          adapterId: adapter.id || adapter.constructor.name,
          rawResult
        });

        const dispatchTimestamp = Number(payload.dispatchedAt) || relayStartedAt;
        result.meta = {
          ...(result.meta || {}),
          relay_latency_ms: Date.now() - dispatchTimestamp,
          node_id: config.node_id
        };

        await sendResultToCloud(payload.requestId, result, 'success');
      } catch (execErr: any) {
        console.error(`[Cloud Relay] ❌ Execution failed: ${execErr.message}`);
        const result = asExecutionResult({
          requestId: payload.requestId,
          deviceId: payload.deviceId,
          capability: payload.capability,
          adapterId: adapter.id || adapter.constructor.name,
          error: execErr
        });

        const dispatchTimestamp = Number(payload.dispatchedAt) || relayStartedAt;
        result.meta = {
          ...(result.meta || {}),
          relay_latency_ms: Date.now() - dispatchTimestamp,
          node_id: config.node_id
        };

        await sendResultToCloud(payload.requestId, result, 'error');
      }
      return;
    }

    const result = asExecutionResult({
      requestId: payload.requestId,
      deviceId: payload.deviceId,
      capability: payload.capability,
      error: new Error(`No adapter found for device ${payload.deviceId}`)
    });

    const dispatchTimestamp = Number(payload.dispatchedAt) || relayStartedAt;
    result.meta = {
      ...(result.meta || {}),
      relay_latency_ms: Date.now() - dispatchTimestamp,
      node_id: config.node_id
    };

    await sendResultToCloud(payload.requestId, result, 'no-adapter');
  };

  while (true) {
    try {
      // Poll the Cloud Registry for any pending commands
      const response = await fetch(`${config.cloud_url}/v1/provider/nodes/${config.node_id}/poll`, {
        headers: {
          'Authorization': `Bearer ${config.provider_api_key}`
        }
      });

      if (response.status === 200) {
        const payload = await response.json();
        while (inFlightCommands.size >= relayMaxConcurrency) {
          await Promise.race(inFlightCommands);
        }

        const task = handlePolledCommand(payload)
          .catch((commandErr: any) => {
            console.error(`[Cloud Relay] ❌ Command handling failed: ${commandErr.message}`);
          })
          .finally(() => {
            inFlightCommands.delete(task);
          });

        inFlightCommands.add(task);
      } else if (response.status === 204) {
        // No commands waiting, just loop again
      } else {
        const errText = await response.text();
        console.error(`[Cloud Relay] ❌ Polling error (${response.status}): ${errText}`);
        await new Promise(r => setTimeout(r, 5000)); // Wait before retry
      }
    } catch (err: any) {
      console.error(`[Cloud Relay] ❌ Connection error: ${err.message}`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

// --- Dynamic Heartbeat Logic ---
async function startCloudHeartbeat(config: any, adapters: Adapter[]) {
  if (!config.cloud_url || !config.provider_api_key) return;

  const configuredDevicesById = new Map<string, any>(
    (Array.isArray(config.devices) ? config.devices : [])
      .filter((entry: any) => entry && typeof entry.id === 'string')
      .map((entry: any) => [entry.id, entry])
  );

  const registerNode = async () => {
    try {
      const activeDevices = [];
      for (const adapter of adapters) {
        try {
          const devices = await adapter.getDevices();
          for (const device of devices) {
            const capabilities = await adapter.getCapabilities(device.id);
            const configured = configuredDevicesById.get(device.id) || {};
            const configuredPolicy = configured.access_policy || configured.policy || {};
            const normalizedAccessPolicy = {
              visibility: typeof configuredPolicy.visibility === 'string'
                ? configuredPolicy.visibility
                : (typeof configuredPolicy.public === 'boolean' ? (configuredPolicy.public ? 'public' : 'private') : undefined),
              allowed_agents: configuredPolicy.allowed_agents || configuredPolicy.allowedAgents,
              allowed_orgs: configuredPolicy.allowed_orgs || configuredPolicy.allowedOrgs,
              denied_agents: configuredPolicy.denied_agents || configuredPolicy.deniedAgents
            };

            activeDevices.push({
              ...device,
              capabilities,
              adapter: adapter.id || adapter.constructor.name,
              owner_id: configured.owner_id || config.owner_id || config.provider?.owner_id,
              access_policy: normalizedAccessPolicy
            });
          }
        } catch (err: any) {
          console.error(`[Cloud] ❌ Failed collecting devices from adapter ${adapter.id || adapter.constructor.name}: ${err.message}`);
        }
      }

      await fetch(`${config.cloud_url}/v1/provider/nodes/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.provider_api_key}`
        },
        body: JSON.stringify({
          node_id: config.node_id,
          owner_id: config.owner_id || config.provider?.owner_id,
          provider: config.provider,
          devices: activeDevices
        })
      });
      console.log(`[Cloud] 🟢 Hardware synced with registry (${activeDevices.length} device${activeDevices.length === 1 ? '' : 's'})`);
    } catch (err: any) {
      console.error(`[Cloud] ❌ Sync failed: ${err.message}`);
    }
  };

  await registerNode();
  setInterval(registerNode, 2 * 60 * 1000);
}

// Local API endpoints
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/devices', async (req, res) => {
  const allDevices = [];
  for (const adapter of adapters) {
    const devices = await adapter.getDevices();
    allDevices.push(...devices);
  }
  res.json(allDevices);
});

// Start everything
async function start() {
  for (const adapter of adapters) {
    try {
      await adapter.initialize();
    } catch (err: any) {
      console.error(`[Adapters] ❌ Failed to initialize adapter: ${err.message}`);
    }
  }
  
  startCloudHeartbeat(config, adapters);
  startCloudRelay(config, adapters).catch(console.error);
  
  app.listen(PORT, () => console.log(`OAHL Server running on port ${PORT}`));
}

start().catch(console.error);
