import express from 'express';
import cors from 'cors';
import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Ensure secrets are set in production
const PROVIDER_API_KEY = process.env.PROVIDER_API_KEY || '123456';
const AGENT_API_KEY = process.env.AGENT_API_KEY || '123456';

let rawRedisUrl = (process.env.REDIS_URL || 'redis://localhost:6379')
  .replace(/\s+/g, '') // Aggressively remove ALL whitespace (spaces, tabs, newlines) anywhere in the string
  .replace(/^['"]|['"]$/g, '') // Remove surrounding quotes
  .replace(/!+$/, ''); // Remove accidental trailing exclamation marks

// Ensure the URL has a valid protocol
if (!rawRedisUrl.startsWith('redis://') && !rawRedisUrl.startsWith('rediss://')) {
  // If it contains a password (e.g. password@host:port), format it correctly
  if (rawRedisUrl.includes('@')) {
    rawRedisUrl = 'redis://default:' + rawRedisUrl;
  } else {
    rawRedisUrl = 'redis://' + rawRedisUrl;
  }
}

const redisOptions: any = {
  url: rawRedisUrl
};

// ONLY apply TLS settings if the protocol is explicitly rediss://
if (rawRedisUrl.startsWith('rediss://')) {
  redisOptions.socket = {
    tls: true,
    rejectUnauthorized: false
  };
}

const redisClient = createClient(redisOptions);

redisClient.on('error', (err) => console.log('Redis Client Error', err));

// Middleware: Authenticate Providers (Hardware Nodes)
const authProvider = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const apiKey = req.headers['authorization']?.split(' ')[1];
  if (apiKey !== PROVIDER_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized. Invalid Provider API Key.' });
  }
  next();
};

// Middleware: Authenticate AI Agents
const authAgent = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const apiKey = req.headers['authorization']?.split(' ')[1];
  if (apiKey !== AGENT_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized. Invalid Agent API Key.' });
  }
  next();
};

/**
 * 1. NODE REGISTRATION
 */
app.post('/v1/provider/nodes/register', authProvider, async (req, res) => {
  const nodeData = req.body;
  if (!nodeData.node_id) return res.status(400).json({ error: "Missing node_id" });
  nodeData.last_seen = Date.now();
  await redisClient.set(`node:${nodeData.node_id}`, JSON.stringify(nodeData), { EX: 300 });
  console.log(`[Cloud] 🟢 Node registered: ${nodeData.node_id}`);
  res.json({ status: "success" });
});

/**
 * 2. AGENT DISCOVERY
 */
app.get('/v1/capabilities', authAgent, async (req, res) => {
  const keys = await redisClient.keys('node:*');
  const availableDevices: any[] = [];
  for (const key of keys) {
    const nodeStr = await redisClient.get(key);
    if (nodeStr) {
      const node = JSON.parse(nodeStr);
      if (node.devices) {
        for (const device of node.devices) {
          availableDevices.push({
            id: device.id,
            type: device.type,
            capabilities: device.capabilities,
            provider: node.provider?.name || "Unknown Provider",
            node_id: node.node_id,
            status: "available"
          });
        }
      }
    }
  }
  res.json({ timestamp: Date.now(), devices: availableDevices });
});

/**
 * 3. AGENT REQUEST (START SESSION)
 */
app.post('/v1/requests', authAgent, async (req, res) => {
  const { capability } = req.body;
  const keys = await redisClient.keys('node:*');
  let matchedNode = null;
  let matchedDevice = null;

  for (const key of keys) {
    const nodeStr = await redisClient.get(key);
    if (nodeStr) {
      const node = JSON.parse(nodeStr);
      const device = node.devices?.find((d: any) => 
        d.capabilities?.some((c: any) => c === capability || c.name === capability)
      );
      if (device) {
        matchedNode = node;
        matchedDevice = device;
        break;
      }
    }
  }

  if (!matchedNode) return res.status(404).json({ error: "Hardware not available" });

  const sessionId = "sess-" + Math.random().toString(36).substring(7);
  await redisClient.set(`session:${sessionId}`, JSON.stringify({
    node_id: matchedNode.node_id,
    device_id: matchedDevice.id,
    status: 'active'
  }), { EX: 3600 });

  res.json({ session_id: sessionId, status: "accepted" });
});

/**
 * 4. AGENT EXECUTE (COMMAND RELAY)
 */
app.post('/v1/sessions/:id/execute', authAgent, async (req, res) => {
  const sessionId = req.params.id;
  const command = req.body;

  const sessionStr = await redisClient.get(`session:${sessionId}`);
  if (!sessionStr) return res.status(404).json({ error: "Session not found" });
  const session = JSON.parse(sessionStr);

  // Push the command to the Node's specific command queue (mailbox)
  const requestId = "cmd-" + Date.now();
  const relayPayload = JSON.stringify({
    requestId,
    sessionId,
    deviceId: session.device_id,
    capability: command.capability,
    params: command.params
  });

  await redisClient.lPush(`commands:${session.node_id}`, relayPayload);

  // Wait for result in a specific result key (blocked for up to 10s)
  try {
    const result = await redisClient.brPop(`result:${requestId}`, 15);
    if (result) {
      res.json(JSON.parse(result.element));
    } else {
      res.status(504).json({ error: "Hardware Node Timeout" });
    }
  } catch (err: any) {
    res.status(500).json({ error: "Relay error: " + err.message });
  }
});

/**
 * 5. AGENT STOP SESSION
 */
app.post('/v1/sessions/:id/stop', authAgent, async (req, res) => {
  await redisClient.del(`session:${req.params.id}`);
  res.json({ status: "stopped" });
});

async function start() {
  await redisClient.connect();
  const PORT = process.env.PORT || 8000;
  app.listen(PORT, () => console.log(`☁️ OAHL Cloud Service running on port ${PORT}`));
}

start().catch(console.error);
