"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const redis_1 = require("redis");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Ensure secrets are set in production
const PROVIDER_API_KEY = process.env.PROVIDER_API_KEY || '123456';
const AGENT_API_KEY = process.env.AGENT_API_KEY || '123456';
let rawRedisUrl = (process.env.REDIS_URL || 'redis://localhost:6379')
    .replace(/\s+/g, '')
    .replace(/^['"]|['"]$/g, '')
    .replace(/!+$/, '');
if (!rawRedisUrl.startsWith('redis://') && !rawRedisUrl.startsWith('rediss://')) {
    if (rawRedisUrl.includes('@')) {
        rawRedisUrl = 'redis://default:' + rawRedisUrl;
    }
    else {
        rawRedisUrl = 'redis://' + rawRedisUrl;
    }
}
const redisOptions = { url: rawRedisUrl };
if (rawRedisUrl.startsWith('rediss://')) {
    redisOptions.socket = { tls: true, rejectUnauthorized: false };
}
const redisClient = (0, redis_1.createClient)(redisOptions);
redisClient.on('error', (err) => console.log('Redis Client Error', err));
// Middleware: Authenticate Providers (Hardware Nodes)
const authProvider = (req, res, next) => {
    const apiKey = req.headers['authorization']?.split(' ')[1];
    if (apiKey !== PROVIDER_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized. Invalid Provider API Key.' });
    }
    next();
};
// Middleware: Authenticate AI Agents
const authAgent = (req, res, next) => {
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
    if (!nodeData.node_id)
        return res.status(400).json({ error: "Missing node_id" });
    nodeData.last_seen = Date.now();
    await redisClient.set(`node:${nodeData.node_id}`, JSON.stringify(nodeData), { EX: 300 });
    console.log(`[Cloud] 🟢 Node registered: ${nodeData.node_id}`);
    res.json({ status: "success" });
});
/**
 * 1b. NODE POLLING (For commands)
 * Nodes call this to see if there are any pending commands.
 */
app.get('/v1/provider/nodes/:id/poll', authProvider, async (req, res) => {
    const nodeId = req.params.id;
    try {
        // Wait for a command for up to 30 seconds (Long Polling)
        const command = await redisClient.brPop(`commands:${nodeId}`, 30);
        if (command) {
            res.json(JSON.parse(command.element));
        }
        else {
            res.status(204).end(); // No content
        }
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * 1c. NODE RESULTS (For returning execution results)
 */
app.post('/v1/provider/nodes/results', authProvider, async (req, res) => {
    const { requestId, result } = req.body;
    if (!requestId)
        return res.status(400).json({ error: "Missing requestId" });
    await redisClient.lPush(`result:${requestId}`, JSON.stringify(result));
    await redisClient.expire(`result:${requestId}`, 60); // Expire results after 60s
    res.json({ status: "success" });
});
/**
 * 2. AGENT DISCOVERY
 */
app.get('/v1/capabilities', authAgent, async (req, res) => {
    const keys = await redisClient.keys('node:*');
    const availableDevices = [];
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
    const { capability, device_id, node_id } = req.body;
    const keys = await redisClient.keys('node:*');
    let matchedNode = null;
    let matchedDevice = null;
    if (node_id && !device_id) {
        return res.status(400).json({ error: "node_id requires device_id" });
    }
    if (device_id) {
        for (const key of keys) {
            const nodeStr = await redisClient.get(key);
            if (!nodeStr)
                continue;
            const node = JSON.parse(nodeStr);
            if (node_id && node.node_id !== node_id)
                continue;
            const device = node.devices?.find((d) => d.id === device_id);
            if (!device)
                continue;
            if (capability) {
                const hasCapability = device.capabilities?.some((c) => c === capability || c.name === capability);
                if (!hasCapability) {
                    return res.status(400).json({
                        error: `Requested device ${device_id} does not support capability ${capability}`
                    });
                }
            }
            matchedNode = node;
            matchedDevice = device;
            break;
        }
        if (!matchedNode) {
            return res.status(404).json({ error: "Requested device not available" });
        }
    }
    else {
        if (!capability) {
            return res.status(400).json({ error: "Missing capability or device_id" });
        }
        for (const key of keys) {
            const nodeStr = await redisClient.get(key);
            if (nodeStr) {
                const node = JSON.parse(nodeStr);
                const device = node.devices?.find((d) => d.capabilities?.some((c) => c === capability || c.name === capability));
                if (device) {
                    matchedNode = node;
                    matchedDevice = device;
                    break;
                }
            }
        }
    }
    if (!matchedNode)
        return res.status(404).json({ error: "Hardware not available" });
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
    if (!sessionStr)
        return res.status(404).json({ error: "Session not found" });
    const session = JSON.parse(sessionStr);
    const requestId = "cmd-" + Date.now();
    const relayPayload = JSON.stringify({
        requestId,
        sessionId,
        deviceId: session.device_id,
        capability: command.capability,
        params: command.params
    });
    // Push to node's queue
    await redisClient.lPush(`commands:${session.node_id}`, relayPayload);
    // Wait for result (timeout 20s)
    try {
        const result = await redisClient.brPop(`result:${requestId}`, 20);
        if (result) {
            res.json(JSON.parse(result.element));
        }
        else {
            res.status(504).json({ error: "Hardware Node Timeout" });
        }
    }
    catch (err) {
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
