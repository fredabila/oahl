import express from 'express';
import cors from 'cors';
import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Ensure secrets are set in production
const PROVIDER_API_KEY = process.env.PROVIDER_API_KEY || 'dev_provider_key';
const AGENT_API_KEY = process.env.AGENT_API_KEY || 'dev_agent_key';

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

if (rawRedisUrl.startsWith('rediss://') || rawRedisUrl.includes('redislabs.com') || rawRedisUrl.includes('upstash.io')) {
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
 * Hardware nodes call this to say "I am online and here is my hardware"
 */
app.post('/v1/provider/nodes/register', authProvider, async (req, res) => {
  const nodeData = req.body;
  
  if (!nodeData.node_id) {
    return res.status(400).json({ error: "Missing node_id" });
  }

  nodeData.last_seen = Date.now();
  
  // Store the node data in Redis. We set an expiration of 5 minutes.
  // Nodes must "heartbeat" (re-register) every few minutes to stay visible.
  await redisClient.set(`node:${nodeData.node_id}`, JSON.stringify(nodeData), {
    EX: 300 
  });

  console.log(`[Cloud] 🟢 Node registered: ${nodeData.node_id}`);
  res.json({ status: "success", message: "Node registered successfully" });
});

/**
 * 2. AGENT DISCOVERY
 * AI Agents call this to ask "What capabilities are available right now?"
 */
app.get('/v1/capabilities', authAgent, async (req, res) => {
  const keys = await redisClient.keys('node:*');
  const capabilityMap: Record<string, number> = {};

  for (const key of keys) {
    const nodeStr = await redisClient.get(key);
    if (nodeStr) {
      const node = JSON.parse(nodeStr);
      if (node.devices) {
        for (const device of node.devices) {
          if (device.capabilities) {
            device.capabilities.forEach((cap: string) => {
              capabilityMap[cap] = (capabilityMap[cap] || 0) + 1;
            });
          }
        }
      }
    }
  }

  const result = Object.entries(capabilityMap).map(([name, count]) => ({
    name,
    nodes_available: count
  }));

  res.json({ available_capabilities: result });
});

/**
 * 3. AGENT REQUEST
 * AI Agents call this to request a specific hardware capability.
 */
app.post('/v1/requests', authAgent, async (req, res) => {
  const { capability, constraints } = req.body;
  
  if (!capability) {
    return res.status(400).json({ error: "Must specify a capability" });
  }

  const keys = await redisClient.keys('node:*');
  let matchedNode = null;
  let matchedDevice = null;

  for (const key of keys) {
    const nodeStr = await redisClient.get(key);
    if (nodeStr) {
      const node = JSON.parse(nodeStr);
      const device = node.devices?.find((d: any) => d.capabilities?.includes(capability));
      if (device) {
        matchedNode = node;
        matchedDevice = device;
        break;
      }
    }
  }

  if (!matchedNode) {
    return res.status(404).json({ error: "No available hardware for this capability" });
  }

  const sessionId = "cloud-sess-" + Math.random().toString(36).substring(7);
  
  await redisClient.set(`session:${sessionId}`, JSON.stringify({
    node_id: matchedNode.node_id,
    device_id: matchedDevice.id,
    capability: capability,
    status: 'assigned'
  }), { EX: 3600 }); // Sessions expire after 1 hour

  console.log(`[Cloud] ✅ Matched agent to node ${matchedNode.node_id}`);

  res.json({
    request_id: "req-" + Date.now(),
    session_id: sessionId,
    status: "accepted",
    assigned_node: matchedNode.node_id
  });
});

async function start() {
  await redisClient.connect();
  const PORT = process.env.PORT || 8000;
  app.listen(PORT, () => {
    console.log(`☁️ OAHL Cloud Service running on port ${PORT}`);
  });
}

start().catch(console.error);
