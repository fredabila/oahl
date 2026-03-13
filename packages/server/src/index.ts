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
} else {
  console.log('[Config] 🟡 No oahl-config.json found. Using defaults.');
}

// Initialize core components
const sessionManager = new SessionManager();
const policyEngine = new PolicyEngine();
const adapters: Adapter[] = [];

// Dynamic Plugin Loading
if (config.plugins && Array.isArray(config.plugins)) {
  for (const pluginName of config.plugins) {
    try {
      console.log(`[Plugins] 🔌 Loading adapter: ${pluginName}...`);
      
      let imported: any;
      try {
        // 1. Try to require the package normally (standard Node.js resolution)
        imported = require(pluginName);
      } catch (err) {
        // 2. Fallback to local path if require fails
        const localPath = path.resolve(process.cwd(), 'node_modules', pluginName);
        imported = require(localPath);
      }

      // 3. Handle every possible export style (ESM, CJS, etc.)
      // We look for: .default, .MockAdapter (for internal packages), or the root itself
      const PluginClass = imported.default || 
                          imported.MockAdapter || 
                          imported.UsbCameraAdapter || 
                          imported.RtlSdrAdapter || 
                          imported.AndroidAdapter ||
                          imported;

      if (typeof PluginClass === 'function') {
        adapters.push(new PluginClass());
        console.log(`[Plugins] ✅ ${pluginName} loaded successfully.`);
      } else {
        console.error(`[Plugins] ❌ Failed to load ${pluginName}: Exported item is not a constructor (type: ${typeof PluginClass})`);
      }
    } catch (err: any) {
      console.error(`[Plugins] ❌ Failed to load adapter ${pluginName}: ${err.message}`);
    }
  }
}

if (adapters.length === 0) {
    console.warn("[Plugins] ⚠️ No adapters were loaded. Your node will have no capabilities.");
}

// Helper to find adapter for a device
async function getAdapterForDevice(deviceId: string): Promise<Adapter | undefined> {
  for (const adapter of adapters) {
    const devices = await adapter.getDevices();
    if (devices.find(d => d.id === deviceId)) {
      return adapter;
    }
  }
  return undefined;
}

// --- Dynamic Heartbeat Logic ---
async function startCloudHeartbeat(config: any, adapters: Adapter[]) {
  if (!config.cloud_url || !config.provider_api_key) {
    console.log("[Cloud] 🟡 No cloud_url or provider_api_key found in config. Running in Local-Only mode.");
    return;
  }

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
              capabilities: capabilities.map(c => c.name),
              adapter: adapter.id || adapter.constructor.name
            });
          }
        } catch (err: any) {
          console.error(`[Cloud] ❌ Failed to poll adapter: ${err.message}`);
        }
      }

      console.log(`[Cloud] 🔵 Syncing ${activeDevices.length} devices with ${config.cloud_url}...`);

      const response = await fetch(`${config.cloud_url}/v1/provider/nodes/register`, {
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

      if (response.ok) {
        console.log(`[Cloud] 🟢 Successfully synced hardware with ${config.cloud_url}`);
      } else {
        const errorText = await response.text();
        console.error(`[Cloud] ❌ Failed to sync: ${errorText}`);
      }
    } catch (err: any) {
      console.error(`[Cloud] ❌ Could not reach cloud registry: ${err.message}`);
    }
  };

  await registerNode();
  setInterval(registerNode, 2 * 60 * 1000);
}

app.get('/health', async (req, res) => {
  res.json({ status: 'ok', version: '0.1.0' });
});

app.get('/devices', async (req, res) => {
  try {
    const allDevices = [];
    for (const adapter of adapters) {
      const devices = await adapter.getDevices();
      allDevices.push(...devices);
    }
    res.json(allDevices);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/capabilities', async (req, res) => {
  try {
    const deviceId = req.query.deviceId as string;
    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId query parameter is required' });
    }
    
    const adapter = await getAdapterForDevice(deviceId);
    if (!adapter) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const capabilities = await adapter.getCapabilities(deviceId);
    res.json(capabilities);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/sessions/start', (req, res) => {
  try {
    const { deviceId } = req.body;
    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }
    const session = sessionManager.startSession(deviceId);
    res.json(session);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/execute', async (req, res) => {
  try {
    const { sessionId, capabilityName, args } = req.body;
    if (!sessionId || !capabilityName) {
      return res.status(400).json({ error: 'sessionId and capabilityName are required' });
    }

    const session = sessionManager.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found or inactive' });
    }

    const adapter = await getAdapterForDevice(session.deviceId);
    if (!adapter) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const result = await adapter.execute(session.deviceId, capabilityName, args || {});
    res.json({ result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/sessions/stop', (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }
    sessionManager.stopSession(sessionId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/sessions/:id', (req, res) => {
  try {
    const session = sessionManager.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize and start server
async function start() {
  for (const adapter of adapters) {
    try {
      await adapter.initialize();
    } catch (err: any) {
      console.error(`[Adapters] ❌ Failed to initialize adapter: ${err.message}`);
    }
  }
  
  await startCloudHeartbeat(config, adapters);
  
  app.listen(PORT, () => {
    console.log(`OAHL Server running on port ${PORT}`);
  });
}

start().catch(console.error);
