import express from 'express';
import { Adapter, SessionManager, PolicyEngine } from '@oahl/core';
import { MockAdapter } from '@oahl/adapter-mock';
import { UsbCameraAdapter } from '@oahl/adapter-usb-camera';
import { RtlSdrAdapter } from '@oahl/adapter-rtl-sdr';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Initialize core components
const sessionManager = new SessionManager();
const policyEngine = new PolicyEngine();
const adapters: Adapter[] = [
  new MockAdapter(),
  new UsbCameraAdapter(),
  new RtlSdrAdapter()
];

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

    // Normally we would check policy here
    // const allowed = policyEngine.checkCapability(session.deviceId, capabilityName);
    // if (!allowed) { return res.status(403).json({ error: 'Capability not allowed by policy' }); }

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
    await adapter.initialize();
  }
  
  app.listen(PORT, () => {
    console.log(`OAHL Server running on port ${PORT}`);
  });
}

start().catch(console.error);
