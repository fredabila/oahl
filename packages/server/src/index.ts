import express from 'express';
import { Adapter, SessionManager, PolicyEngine } from '@oahl/core';
import { createClient } from 'redis';
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
      const PluginClass = imported.default || imported;
      if (typeof PluginClass === 'function') {
        adapters.push(new PluginClass());
        console.log(`[Plugins] ✅ ${pluginName} loaded successfully.`);
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
  if (!config.redis_url) return;

  const redisClient = createClient({ url: config.redis_url });
  await redisClient.connect();
  console.log(`[Cloud Relay] 📬 Connected to command mailbox via Redis`);

  while (true) {
    try {
      // Listen for commands specifically for this node
      const command = await redisClient.brPop(`commands:${config.node_id}`, 0);
      if (command) {
        const payload = JSON.parse(command.element);
        console.log(`[Cloud Relay] 📥 Received command: ${payload.capability} for device ${payload.deviceId}`);

        // 1. Ensure a session exists (or create one for the marketplace request)
        let session = sessionManager.getSession(payload.sessionId);
        if (!session) {
           session = sessionManager.startSession(payload.deviceId);
           // We might want to force the sessionId to match the cloud's sessionId
        }

        // 2. Find adapter and execute
        const adapter = await getAdapterForDevice(payload.deviceId);
        if (adapter) {
          const result = await adapter.execute(payload.deviceId, payload.capability, payload.params || {});
          
          // 3. Send result back to the cloud's result key
          await redisClient.lPush(`result:${payload.requestId}`, JSON.stringify(result));
          console.log(`[Cloud Relay] 📤 Sent result back for ${payload.requestId}`);
        }
      }
    } catch (err: any) {
      console.error(`[Cloud Relay] ❌ Error: ${err.message}`);
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

// --- Dynamic Heartbeat Logic ---
async function startCloudHeartbeat(config: any, adapters: Adapter[]) {
  if (!config.cloud_url || !config.provider_api_key) return;

  const registerNode = async () => {
    try {
      const activeDevices = [];
      for (const adapter of adapters) {
        try {
          const devices = await adapter.getDevices();
          for (const device of devices) {
            const capabilities = await adapter.getCapabilities(device.id);
            activeDevices.push({
              ...device,
              capabilities,
              adapter: adapter.id || adapter.constructor.name
            });
          }
        } catch {}
      }

      await fetch(`${config.cloud_url}/v1/provider/nodes/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.provider_api_key}`
        },
        body: JSON.stringify({
          node_id: config.node_id,
          provider: config.provider,
          devices: activeDevices
        })
      });
      console.log(`[Cloud] 🟢 Hardware synced with registry`);
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
    await adapter.initialize().catch(console.error);
  }
  
  startCloudHeartbeat(config, adapters);
  startCloudRelay(config, adapters).catch(console.error);
  
  app.listen(PORT, () => console.log(`OAHL Server running on port ${PORT}`));
}

start().catch(console.error);
