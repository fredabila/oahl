"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const redis_1 = require("redis");
const dotenv_1 = __importDefault(require("dotenv"));
const crypto_1 = require("crypto");
const ws_1 = require("ws");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const ajv_1 = __importDefault(require("ajv"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const ajv = new ajv_1.default();
// 120 execute requests per minute by default
const executeRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: parseInt(process.env.OAHL_EXECUTE_RATE_LIMIT || '120', 10),
    message: { error: 'Too many execute requests, policy rate limit exceeded.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const agentId = req.headers['x-agent-id'];
        return (typeof agentId === 'string' && agentId.trim().length > 0) ? agentId.trim() : (req.ip || 'unknown');
    }
});
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    optionsSuccessStatus: 204,
    maxAge: 86400
}));
app.options('*', (0, cors_1.default)());
app.use(express_1.default.json());
// Ensure secrets are set in production
const PROVIDER_API_KEY = process.env.PROVIDER_API_KEY || '123456';
const AGENT_API_KEY = process.env.AGENT_API_KEY || '123456';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'admin123';
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
const providerSocketsByNode = new Map();
const pendingWsResults = new Map();
const WS_FASTPATH_TIMEOUT_MS = toPositiveInt(process.env.OAHL_WS_FASTPATH_TIMEOUT_MS, 10_000);
const WS_LATE_RESULT_GRACE_MS = toPositiveInt(process.env.OAHL_WS_LATE_RESULT_GRACE_MS, 20_000);
const POLLING_RESULT_TIMEOUT_S = toPositiveInt(process.env.OAHL_POLLING_RESULT_TIMEOUT_S, 30);
function toPositiveInt(value, defaultValue) {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}
function capabilityMatches(capabilityEntry, searchValue) {
    const normalizedSearch = searchValue.toLowerCase();
    if (typeof capabilityEntry === 'string') {
        return capabilityEntry.toLowerCase().includes(normalizedSearch);
    }
    if (capabilityEntry && typeof capabilityEntry.name === 'string') {
        return capabilityEntry.name.toLowerCase().includes(normalizedSearch);
    }
    return false;
}
function normalizeStringList(value) {
    if (!Array.isArray(value))
        return [];
    return value
        .map((entry) => String(entry || '').trim())
        .filter((entry) => entry.length > 0);
}
function extractAgentIdentity(req) {
    const agentId = typeof req.headers['x-agent-id'] === 'string'
        ? req.headers['x-agent-id'].trim()
        : undefined;
    const orgId = typeof req.headers['x-agent-org-id'] === 'string'
        ? req.headers['x-agent-org-id'].trim()
        : undefined;
    const rawRoles = typeof req.headers['x-agent-roles'] === 'string'
        ? req.headers['x-agent-roles']
        : '';
    const roles = rawRoles
        .split(',')
        .map((r) => r.trim())
        .filter((r) => r.length > 0);
    return { agentId, orgId, roles };
}
function resolveDeviceAccessPolicy(device) {
    const policy = device?.access_policy || device?.policy || {};
    const allowedAgents = normalizeStringList(policy.allowed_agents || policy.allowedAgents);
    const allowedOrgs = normalizeStringList(policy.allowed_orgs || policy.allowedOrgs);
    const deniedAgents = normalizeStringList(policy.denied_agents || policy.deniedAgents);
    const hasAccessLists = allowedAgents.length > 0 || allowedOrgs.length > 0 || deniedAgents.length > 0;
    let visibility = 'public';
    if (typeof policy.visibility === 'string') {
        const normalizedVisibility = policy.visibility.trim().toLowerCase();
        if (normalizedVisibility === 'public' || normalizedVisibility === 'shared' || normalizedVisibility === 'private') {
            visibility = normalizedVisibility;
        }
    }
    else if (hasAccessLists) {
        visibility = 'shared';
    }
    return {
        visibility,
        allowedAgents,
        allowedOrgs,
        deniedAgents
    };
}
function resolveDeviceOwnerId(node, device) {
    const candidate = device?.owner_id || node?.owner_id || node?.provider?.owner_id;
    if (typeof candidate !== 'string')
        return undefined;
    const value = candidate.trim();
    return value.length > 0 ? value : undefined;
}
function isDeviceAccessibleToAgent(node, device, agent) {
    const policy = resolveDeviceAccessPolicy(device);
    const ownerId = resolveDeviceOwnerId(node, device);
    if (agent.agentId && ownerId && agent.agentId === ownerId) {
        return true;
    }
    if (agent.agentId && policy.deniedAgents.includes(agent.agentId)) {
        return false;
    }
    if (policy.visibility === 'public') {
        return true;
    }
    const explicitlyAllowed = (agent.agentId && policy.allowedAgents.includes(agent.agentId)) ||
        (agent.orgId && policy.allowedOrgs.includes(agent.orgId));
    if (policy.visibility === 'shared') {
        return Boolean(explicitlyAllowed);
    }
    return Boolean(explicitlyAllowed);
}
function completePendingWsResult(requestId, result) {
    const pending = pendingWsResults.get(requestId);
    if (!pending) {
        return false;
    }
    clearTimeout(pending.timeout);
    pendingWsResults.delete(requestId);
    pending.resolve(result);
    return true;
}
function waitForWsResult(requestId, timeoutMs) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            pendingWsResults.delete(requestId);
            reject(new Error(`WebSocket result timeout for request ${requestId}`));
        }, timeoutMs);
        pendingWsResults.set(requestId, { resolve, timeout });
    });
}
async function waitForLateResultFromQueue(requestId, timeoutMs) {
    const timeoutSeconds = Math.max(1, Math.ceil(timeoutMs / 1000));
    const result = await redisClient.brPop(`result:${requestId}`, timeoutSeconds);
    if (!result) {
        return null;
    }
    return JSON.parse(result.element);
}
function configureProviderWebSocket(server) {
    const wss = new ws_1.WebSocketServer({ server, path: '/ws/provider' });
    wss.on('connection', (socket, req) => {
        try {
            const host = req.headers.host || 'localhost';
            const requestUrl = new URL(req.url || '/ws/provider', `http://${host}`);
            const nodeIdFromQuery = requestUrl.searchParams.get('node_id') || '';
            const nodeIdFromHeader = typeof req.headers['x-node-id'] === 'string' ? req.headers['x-node-id'] : '';
            const nodeId = (nodeIdFromHeader || nodeIdFromQuery || '').trim();
            const authHeader = typeof req.headers['authorization'] === 'string' ? req.headers['authorization'] : '';
            const apiKey = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : '';
            if (!nodeId || apiKey !== PROVIDER_API_KEY) {
                socket.close(1008, 'Unauthorized provider websocket');
                return;
            }
            providerSocketsByNode.set(nodeId, socket);
            console.log(`[Cloud WS] 🔌 Provider websocket connected: ${nodeId}`);
            socket.on('message', (rawMessage) => {
                try {
                    const message = JSON.parse(String(rawMessage));
                    if (message?.type === 'result' && message?.requestId) {
                        const completed = completePendingWsResult(message.requestId, message.result);
                        if (!completed && message.result !== undefined) {
                            redisClient.lPush(`result:${message.requestId}`, JSON.stringify(message.result)).catch(() => undefined);
                            redisClient.expire(`result:${message.requestId}`, 60).catch(() => undefined);
                        }
                    }
                    else if (message?.type === 'event' && message?.event) {
                        const deviceId = message.event.device_id;
                        if (deviceId) {
                            redisClient.publish(`events:${nodeId}:${deviceId}`, JSON.stringify(message.event)).catch(() => undefined);
                        }
                    }
                }
                catch (err) {
                    console.error(`[Cloud WS] ❌ Invalid provider message: ${err.message}`);
                }
            });
            socket.on('close', (code, reasonBuffer) => {
                const reason = reasonBuffer ? reasonBuffer.toString() : '';
                const existing = providerSocketsByNode.get(nodeId);
                if (existing === socket) {
                    providerSocketsByNode.delete(nodeId);
                }
                console.log(`[Cloud WS] 🔌 Provider websocket disconnected: ${nodeId} (code=${code}${reason ? `, reason=${reason}` : ''})`);
            });
            socket.on('error', (err) => {
                console.error(`[Cloud WS] ❌ Socket error (${nodeId}): ${err.message}`);
            });
        }
        catch (err) {
            console.error(`[Cloud WS] ❌ Connection setup failed: ${err.message}`);
            socket.close(1011, 'Server error');
        }
    });
}
// Middleware: Authenticate Providers (Hardware Nodes)
const authProvider = (req, res, next) => {
    const apiKey = req.headers['authorization']?.split(' ')[1];
    if (apiKey !== PROVIDER_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized. Invalid Provider API Key.' });
    }
    next();
};
// Middleware: Authenticate AI Agents
// Optional identity context for access policy enforcement is read from headers:
// - x-agent-id
// - x-agent-org-id
// - x-agent-roles (comma-separated)
const authAgent = async (req, res, next) => {
    const apiKey = req.headers['authorization']?.split(' ')[1];
    if (!apiKey) {
        return res.status(401).json({ error: 'Unauthorized. Missing Agent API Key.' });
    }
    // 1. Check the master/fallback environment key
    if (apiKey === AGENT_API_KEY) {
        return next();
    }
    // 2. Check dynamically provisioned keys in Redis (For Marketplace/Multi-tenant)
    try {
        const keyDataStr = await redisClient.get(`agent_key:${apiKey}`);
        if (keyDataStr) {
            // Key exists in the database
            // You could attach wallet balance or explicit org ID to the request object here:
            // req.agent_wallet = JSON.parse(keyDataStr);
            return next();
        }
    }
    catch (err) {
        console.error(`[Cloud Auth] ❌ Redis error checking agent key:`, err);
    }
    return res.status(401).json({ error: 'Unauthorized. Invalid Agent API Key.' });
};
// Middleware: Authenticate Admin (for Dashboard)
const authAdmin = (req, res, next) => {
    const apiKey = req.headers['authorization']?.split(' ')[1];
    if (apiKey !== ADMIN_API_KEY && apiKey !== PROVIDER_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized. Invalid Admin API Key.' });
    }
    next();
};
/**
 * 0. ADMIN / DASHBOARD ENDPOINTS
 */
// List all provisioned agents
app.get('/v1/admin/agents', authAdmin, async (req, res) => {
    try {
        const keys = await redisClient.keys('agent_key:*');
        const agents = [];
        for (const key of keys) {
            const dataStr = await redisClient.get(key);
            if (dataStr) {
                agents.push({
                    key: key.replace('agent_key:', ''),
                    ...JSON.parse(dataStr)
                });
            }
        }
        res.json({ agents });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Create a new agent key
app.post('/v1/admin/agents', authAdmin, async (req, res) => {
    try {
        const { org_id, name, initial_balance } = req.body;
        const newKey = `sk-agent-${(0, crypto_1.randomUUID)()}`;
        const agentData = {
            name: name || 'Unnamed Agent',
            org_id: org_id || 'default-org',
            balance: typeof initial_balance === 'number' ? initial_balance : 0,
            created_at: Date.now()
        };
        await redisClient.set(`agent_key:${newKey}`, JSON.stringify(agentData));
        res.json({
            status: "success",
            api_key: newKey,
            agent: agentData
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Add funds to an agent
app.post('/v1/admin/agents/:key/fund', authAdmin, async (req, res) => {
    try {
        const { amount } = req.body;
        const key = req.params.key;
        if (typeof amount !== 'number') {
            return res.status(400).json({ error: "amount must be a number" });
        }
        const dataStr = await redisClient.get(`agent_key:${key}`);
        if (!dataStr) {
            return res.status(404).json({ error: "Agent key not found" });
        }
        const agentData = JSON.parse(dataStr);
        agentData.balance = (agentData.balance || 0) + amount;
        await redisClient.set(`agent_key:${key}`, JSON.stringify(agentData));
        res.json({
            status: "success",
            agent: agentData
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * 0b. DEVELOPER PORTAL ENDPOINTS (Simulated User Auth)
 */
// Middleware: Authenticate Portal User
const authPortal = async (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized. Missing portal token.' });
    }
    try {
        const sessionStr = await redisClient.get(`portal_session:${token}`);
        if (!sessionStr) {
            return res.status(401).json({ error: 'Unauthorized. Invalid or expired portal token.' });
        }
        const sessionData = JSON.parse(sessionStr);
        req.portalUser = sessionData; // attach user to request
        next();
    }
    catch (err) {
        console.error(`[Portal Auth] Error:`, err);
        res.status(500).json({ error: 'Internal server error during authentication' });
    }
};
// Login or Register a Developer
app.post('/v1/portal/auth', async (req, res) => {
    try {
        const { email, pin } = req.body;
        if (!email || !pin || pin.length !== 6) {
            return res.status(400).json({ error: "Valid email and 6-digit pin required" });
        }
        const emailKey = email.toLowerCase().trim();
        const devKey = `developer:${emailKey}`;
        let devStr = await redisClient.get(devKey);
        if (!devStr) {
            // Auto-register new developer
            const hashedPin = await bcrypt_1.default.hash(pin, 10);
            const newDev = {
                email: emailKey,
                pin: hashedPin,
                org_id: `org_${(0, crypto_1.randomUUID)().split('-')[0]}`,
                created_at: Date.now()
            };
            await redisClient.set(devKey, JSON.stringify(newDev));
            devStr = JSON.stringify(newDev);
        }
        const devData = JSON.parse(devStr);
        // Verify PIN with backward compatibility for plaintext
        let isMatch = false;
        if (devData.pin && devData.pin.startsWith('$2b$')) {
            isMatch = await bcrypt_1.default.compare(pin, devData.pin);
        }
        else {
            isMatch = (devData.pin === pin);
            // Auto-upgrade to hashed PIN on successful login
            if (isMatch) {
                devData.pin = await bcrypt_1.default.hash(pin, 10);
                await redisClient.set(devKey, JSON.stringify(devData));
            }
        }
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid PIN" });
        }
        // Create session token
        const token = `pt_${(0, crypto_1.randomUUID)()}`;
        const sessionData = { email: devData.email, org_id: devData.org_id };
        // Sessions expire in 24 hours
        await redisClient.set(`portal_session:${token}`, JSON.stringify(sessionData), { EX: 86400 });
        res.json({
            status: "success",
            token,
            developer: { email: devData.email, org_id: devData.org_id }
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// List Agents for the logged-in Developer
app.get('/v1/portal/agents', authPortal, async (req, res) => {
    try {
        const orgId = req.portalUser.org_id;
        const keys = await redisClient.keys('agent_key:*');
        const agents = [];
        for (const key of keys) {
            const dataStr = await redisClient.get(key);
            if (dataStr) {
                const agentData = JSON.parse(dataStr);
                if (agentData.org_id === orgId) {
                    agents.push({
                        key: key.replace('agent_key:', ''),
                        ...agentData
                    });
                }
            }
        }
        res.json({ agents });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Create a new Agent Key for this Developer
app.post('/v1/portal/agents', authPortal, async (req, res) => {
    try {
        const orgId = req.portalUser.org_id;
        const { name } = req.body;
        const newKey = `sk-agent-${(0, crypto_1.randomUUID)()}`;
        const agentData = {
            name: name || 'Unnamed Agent',
            org_id: orgId,
            balance: 0,
            created_at: Date.now()
        };
        await redisClient.set(`agent_key:${newKey}`, JSON.stringify(agentData));
        res.json({
            status: "success",
            api_key: newKey,
            agent: agentData
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Revoke an Agent Key
app.delete('/v1/portal/agents/:key', authPortal, async (req, res) => {
    try {
        const orgId = req.portalUser.org_id;
        const key = req.params.key;
        const dataStr = await redisClient.get(`agent_key:${key}`);
        if (!dataStr) {
            return res.status(404).json({ error: "Agent key not found" });
        }
        const agentData = JSON.parse(dataStr);
        // Security check: ensure the developer owns this agent
        if (agentData.org_id !== orgId) {
            return res.status(403).json({ error: "You do not own this agent" });
        }
        await redisClient.del(`agent_key:${key}`);
        res.json({
            status: "success",
            message: "Agent key revoked"
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Add funds to a specific Agent (Simulated Stripe flow for the developer)
app.post('/v1/portal/agents/:key/fund', authPortal, async (req, res) => {
    try {
        const orgId = req.portalUser.org_id;
        const { amount } = req.body;
        const key = req.params.key;
        if (typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({ error: "amount must be a positive number" });
        }
        const dataStr = await redisClient.get(`agent_key:${key}`);
        if (!dataStr) {
            return res.status(404).json({ error: "Agent key not found" });
        }
        const agentData = JSON.parse(dataStr);
        // Security check: ensure the developer owns this agent
        if (agentData.org_id !== orgId) {
            return res.status(403).json({ error: "You do not own this agent" });
        }
        agentData.balance = (agentData.balance || 0) + amount;
        await redisClient.set(`agent_key:${key}`, JSON.stringify(agentData));
        res.json({
            status: "success",
            agent: agentData
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// List Available Capabilities for Portal Users
app.get('/v1/portal/capabilities', authPortal, async (req, res) => {
    try {
        // Reuse discovery logic but for portal users (no agent identity needed for browsing)
        const keys = await redisClient.keys('node:*');
        const availableDevices = [];
        for (const key of keys) {
            const nodeStr = await redisClient.get(key);
            if (nodeStr) {
                const node = JSON.parse(nodeStr);
                if (node.devices) {
                    for (const device of node.devices) {
                        // For portal browsing, we show all "public" or "shared" devices 
                        // In a real system, we'd filter by what this specific developer's org can see
                        const policy = resolveDeviceAccessPolicy(device);
                        if (policy.visibility === 'private')
                            continue;
                        availableDevices.push({
                            id: device.id,
                            type: device.type,
                            name: device.name,
                            capabilities: device.capabilities,
                            provider: node.provider?.name || "Unknown Provider",
                            node_id: node.node_id,
                            pricing: device.pricing,
                            status: "available"
                        });
                    }
                }
            }
        }
        res.json({ devices: availableDevices });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * 0c. PROVIDER PORTAL ENDPOINTS
 */
// Get Provider Stats (Earnings & Device Count)
app.get('/v1/portal/provider/stats', authPortal, async (req, res) => {
    try {
        const email = req.portalUser.email.toLowerCase().trim();
        const keys = await redisClient.keys('node:*');
        let totalEarnings = 0;
        let deviceCount = 0;
        const activeNodes = [];
        for (const key of keys) {
            const nodeStr = await redisClient.get(key);
            if (nodeStr) {
                const node = JSON.parse(nodeStr);
                // Match by email provided in the node registration (normalized)
                if (node.owner_email && node.owner_email.toLowerCase().trim() === email) {
                    totalEarnings += (node.earnings || 0);
                    deviceCount += (node.devices?.length || 0);
                    activeNodes.push({
                        node_id: node.node_id,
                        status: 'online',
                        last_seen: node.last_seen,
                        earnings: node.earnings || 0,
                        device_count: node.devices?.length || 0
                    });
                }
            }
        }
        res.json({
            total_earnings: totalEarnings,
            device_count: deviceCount,
            nodes: activeNodes
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// List Provider's Specific Devices
app.get('/v1/portal/provider/devices', authPortal, async (req, res) => {
    try {
        const email = req.portalUser.email.toLowerCase().trim();
        const keys = await redisClient.keys('node:*');
        const myDevices = [];
        for (const key of keys) {
            const nodeStr = await redisClient.get(key);
            if (nodeStr) {
                const node = JSON.parse(nodeStr);
                if (node.owner_email && node.owner_email.toLowerCase().trim() === email) {
                    if (node.devices) {
                        for (const device of node.devices) {
                            myDevices.push({
                                ...device,
                                node_id: node.node_id,
                                earnings: node.device_earnings?.[device.id] || 0
                            });
                        }
                    }
                }
            }
        }
        res.json({ devices: myDevices });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * 1. NODE REGISTRATION
 */
app.post('/v1/provider/nodes/register', authProvider, async (req, res) => {
    try {
        const nodeData = req.body;
        if (!nodeData.node_id)
            return res.status(400).json({ error: "Missing node_id" });
        // Normalize owner email
        if (nodeData.owner_email) {
            nodeData.owner_email = nodeData.owner_email.toLowerCase().trim();
        }
        // Simulation: If a node registers, we preserve its cumulative earnings if it already existed
        const existingNodeStr = await redisClient.get(`node:${nodeData.node_id}`);
        if (existingNodeStr) {
            const existing = JSON.parse(existingNodeStr);
            // Keep existing financial data if not provided in update
            nodeData.earnings = nodeData.earnings !== undefined ? nodeData.earnings : (existing.earnings || 0);
            nodeData.device_earnings = nodeData.device_earnings || existing.device_earnings || {};
        }
        else {
            nodeData.earnings = nodeData.earnings || 0;
            nodeData.device_earnings = nodeData.device_earnings || {};
        }
        nodeData.last_seen = Date.now();
        await redisClient.set(`node:${nodeData.node_id}`, JSON.stringify(nodeData), { EX: 300 });
        console.log(`[Cloud] 🟢 Node registered: ${nodeData.node_id} (Owner: ${nodeData.owner_email || 'anonymous'})`);
        res.json({ status: "success" });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/v1/provider/nodes/:id', authProvider, async (req, res) => {
    const nodeId = req.params.id;
    const nodeData = await redisClient.get(`node:${nodeId}`);
    if (!nodeData) {
        return res.status(404).json({ error: 'Node not found or expired' });
    }
    return res.json(JSON.parse(nodeData));
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
    if (completePendingWsResult(requestId, result)) {
        return res.json({ status: "success", mode: "websocket" });
    }
    await redisClient.lPush(`result:${requestId}`, JSON.stringify(result));
    await redisClient.expire(`result:${requestId}`, 60); // Expire results after 60s
    res.json({ status: "success" });
});
/**
 * 2. AGENT DISCOVERY
 */
app.get('/v1/capabilities', authAgent, async (req, res) => {
    const agent = extractAgentIdentity(req);
    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    const typeFilter = typeof req.query.type === 'string' ? req.query.type.trim().toLowerCase() : '';
    const providerFilter = typeof req.query.provider === 'string' ? req.query.provider.trim().toLowerCase() : '';
    const nodeFilter = typeof req.query.node_id === 'string' ? req.query.node_id.trim() : '';
    const capabilityFilter = typeof req.query.capability === 'string' ? req.query.capability.trim().toLowerCase() : '';
    const page = toPositiveInt(req.query.page, 1);
    const pageSize = Math.min(toPositiveInt(req.query.page_size, 25), 100);
    const keys = await redisClient.keys('node:*');
    const availableDevices = [];
    for (const key of keys) {
        const nodeStr = await redisClient.get(key);
        if (nodeStr) {
            const node = JSON.parse(nodeStr);
            if (nodeFilter && node.node_id !== nodeFilter) {
                continue;
            }
            if (node.devices) {
                for (const device of node.devices) {
                    if (!isDeviceAccessibleToAgent(node, device, agent)) {
                        continue;
                    }
                    const providerName = node.provider?.name || "Unknown Provider";
                    const capabilities = Array.isArray(device.capabilities) ? device.capabilities : [];
                    if (typeFilter && String(device.type || '').toLowerCase() !== typeFilter) {
                        continue;
                    }
                    if (providerFilter && String(providerName).toLowerCase() !== providerFilter) {
                        continue;
                    }
                    if (capabilityFilter) {
                        const hasCapability = capabilities.some((c) => capabilityMatches(c, capabilityFilter));
                        if (!hasCapability) {
                            continue;
                        }
                    }
                    if (q) {
                        const haystack = [
                            String(device.id || ''),
                            String(device.type || ''),
                            String(providerName),
                            ...capabilities.map((c) => typeof c === 'string' ? c : String(c?.name || ''))
                        ].join(' ').toLowerCase();
                        if (!haystack.includes(q)) {
                            continue;
                        }
                    }
                    availableDevices.push({
                        id: device.id,
                        type: device.type,
                        name: device.name,
                        capabilities,
                        provider: providerName,
                        node_id: node.node_id,
                        manufacturer: device.manufacturer,
                        model: device.model,
                        serial_number: device.serial_number,
                        semantic_context: device.semantic_context,
                        pricing: device.pricing,
                        status: "available"
                    });
                }
            }
        }
    }
    const total = availableDevices.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    const safePage = totalPages === 0 ? 1 : Math.min(page, totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const pagedDevices = availableDevices.slice(startIndex, startIndex + pageSize);
    res.json({
        timestamp: Date.now(),
        devices: pagedDevices,
        pagination: {
            page: safePage,
            page_size: pageSize,
            total,
            total_pages: totalPages,
            has_next: safePage < totalPages,
            has_prev: safePage > 1 && totalPages > 0
        },
        filters: {
            q: q || undefined,
            type: typeFilter || undefined,
            provider: providerFilter || undefined,
            node_id: nodeFilter || undefined,
            capability: capabilityFilter || undefined
        }
    });
});
/**
 * 2b. W3C WoT THING DESCRIPTION
 * Renders a WoT-compatible Thing Description for a device.
 * See: docs/wot-alignment.md — Forward Interoperability Path
 */
app.get('/v1/things/:device_id', authAgent, async (req, res) => {
    const deviceId = req.params.device_id;
    const agent = extractAgentIdentity(req);
    const keys = await redisClient.keys('node:*');
    let foundDevice = null;
    let foundNode = null;
    for (const key of keys) {
        const nodeStr = await redisClient.get(key);
        if (!nodeStr)
            continue;
        const node = JSON.parse(nodeStr);
        if (!node.devices)
            continue;
        for (const device of node.devices) {
            if (device.id === deviceId && isDeviceAccessibleToAgent(node, device, agent)) {
                foundDevice = device;
                foundNode = node;
                break;
            }
        }
        if (foundDevice)
            break;
    }
    if (!foundDevice) {
        return res.status(404).json({ error: 'Device not found or not accessible' });
    }
    const capabilities = Array.isArray(foundDevice.capabilities) ? foundDevice.capabilities : [];
    const actions = {};
    for (const cap of capabilities) {
        const capName = typeof cap === 'string' ? cap : cap.name;
        if (!capName)
            continue;
        const action = {
            title: capName,
            description: typeof cap === 'object' ? (cap.description || '') : '',
            safe: false,
            idempotent: false,
            forms: [{
                    href: `/v1/sessions/{session_id}/execute`,
                    contentType: 'application/json',
                    op: ['invokeaction'],
                    'oahl:relay': true
                }]
        };
        if (typeof cap === 'object' && cap.schema) {
            action.input = cap.schema;
        }
        if (typeof cap === 'object' && cap.semantic_type) {
            action['@type'] = cap.semantic_type;
        }
        actions[capName] = action;
    }
    const td = {
        '@context': [
            'https://www.w3.org/2019/wot/td/v1',
            { oahl: 'https://oahl.org/ns/v1' }
        ],
        '@type': 'Thing',
        id: `urn:oahl:device:${foundDevice.id}`,
        title: foundDevice.name || foundDevice.id,
        description: `OAHL-managed ${foundDevice.type || 'device'} on node ${foundNode.node_id}`,
        securityDefinitions: {
            bearer_sc: {
                scheme: 'bearer',
                in: 'header',
                name: 'Authorization'
            }
        },
        security: ['bearer_sc'],
        properties: {},
        actions,
        events: {},
        links: [
            { rel: 'alternate', href: `/v1/capabilities?node_id=${foundNode.node_id}`, type: 'application/json' }
        ],
        'oahl:node_id': foundNode.node_id,
        'oahl:device_type': foundDevice.type,
        'oahl:manufacturer': foundDevice.manufacturer,
        'oahl:model': foundDevice.model
    };
    if (Array.isArray(foundDevice.semantic_context) && foundDevice.semantic_context.length > 0) {
        td['@context'] = [
            ...td['@context'],
            ...foundDevice.semantic_context.filter((c) => c !== 'https://www.w3.org/2019/wot/td/v1')
        ];
    }
    res.setHeader('Content-Type', 'application/td+json');
    res.json(td);
});
/**
 * 2c. PER-NODE QUOTA ENFORCEMENT
 * Tracks execution counts per node_id within a sliding window
 * and returns 429 when a node is overloaded.
 */
const nodeExecuteCounts = new Map();
const NODE_EXECUTE_WINDOW_MS = 60_000;
const NODE_EXECUTE_MAX = parseInt(process.env.OAHL_NODE_RATE_LIMIT || '200', 10);
function checkNodeQuota(nodeId) {
    const now = Date.now();
    const entry = nodeExecuteCounts.get(nodeId);
    if (!entry || (now - entry.windowStart) >= NODE_EXECUTE_WINDOW_MS) {
        nodeExecuteCounts.set(nodeId, { count: 1, windowStart: now });
        return true;
    }
    if (entry.count >= NODE_EXECUTE_MAX) {
        return false;
    }
    entry.count++;
    return true;
}
/**

 * 3. AGENT REQUEST (START SESSION)
 */
app.post('/v1/requests', authAgent, async (req, res) => {
    const agent = extractAgentIdentity(req);
    const { capability, device_id, node_id } = req.body;
    const keys = await redisClient.keys('node:*');
    let matchedNode = null;
    let matchedDevice = null;
    let unauthorizedMatch = false;
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
            if (!isDeviceAccessibleToAgent(node, device, agent)) {
                unauthorizedMatch = true;
                continue;
            }
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
            if (unauthorizedMatch) {
                return res.status(403).json({ error: "Access denied for requested device" });
            }
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
                const devices = Array.isArray(node.devices) ? node.devices : [];
                const device = devices.find((d) => {
                    if (!isDeviceAccessibleToAgent(node, d, agent)) {
                        return false;
                    }
                    return d.capabilities?.some((c) => c === capability || c.name === capability);
                });
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
    const sessionId = `sess-${(0, crypto_1.randomUUID)()}`;
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
app.post('/v1/sessions/:id/execute', authAgent, executeRateLimiter, async (req, res) => {
    const sessionId = req.params.id;
    const command = req.body;
    const sessionStr = await redisClient.get(`session:${sessionId}`);
    if (!sessionStr)
        return res.status(404).json({ error: "Session not found" });
    const session = JSON.parse(sessionStr);
    // Per-node quota enforcement
    if (!checkNodeQuota(session.node_id)) {
        return res.status(429).json({
            error: `Node ${session.node_id} has exceeded its execution quota (${NODE_EXECUTE_MAX}/min). Try again shortly.`,
            retry_after_ms: NODE_EXECUTE_WINDOW_MS
        });
    }
    // Cloud-side JSON Schema parameter validation
    if (command.capability) {
        const nodeStr = await redisClient.get(`node:${session.node_id}`);
        if (nodeStr) {
            const node = JSON.parse(nodeStr);
            const devices = Array.isArray(node.devices) ? node.devices : [];
            const device = devices.find((d) => d.id === session.device_id);
            if (device && Array.isArray(device.capabilities)) {
                const capabilityDef = device.capabilities.find((c) => c === command.capability || (c && c.name === command.capability));
                if (capabilityDef && typeof capabilityDef === 'object' && capabilityDef.schema) {
                    try {
                        const validate = ajv.compile(capabilityDef.schema);
                        const valid = validate(command.params || {});
                        if (!valid) {
                            return res.status(400).json({
                                error: "Parameter validation failed",
                                details: validate.errors
                            });
                        }
                    }
                    catch (schemaErr) {
                        console.warn(`[Cloud] ⚠️ Failed to compile JSON Schema for ${command.capability}`);
                    }
                }
            }
        }
    }
    const requestId = `cmd-${(0, crypto_1.randomUUID)()}`;
    const requestedTimeoutMs = typeof command.timeout_ms === 'number' ? command.timeout_ms : undefined;
    const fastPathTimeout = requestedTimeoutMs || WS_FASTPATH_TIMEOUT_MS;
    const graceTimeout = requestedTimeoutMs ? 0 : WS_LATE_RESULT_GRACE_MS;
    const pollingTimeoutS = requestedTimeoutMs ? Math.ceil(requestedTimeoutMs / 1000) : POLLING_RESULT_TIMEOUT_S;
    const relayPayload = {
        requestId,
        sessionId,
        deviceId: session.device_id,
        dispatchedAt: Date.now(),
        capability: command.capability,
        params: command.params
    };
    const nodeSocket = providerSocketsByNode.get(session.node_id);
    let wsFastPathTimedOut = false;
    if (nodeSocket && nodeSocket.readyState === ws_1.WebSocket.OPEN) {
        try {
            nodeSocket.send(JSON.stringify({ type: 'command', payload: relayPayload }));
            const wsResult = await waitForWsResult(requestId, fastPathTimeout);
            res.setHeader('x-oahl-relay-mode', 'websocket');
            res.setHeader('x-oahl-request-id', requestId);
            return res.json(wsResult);
        }
        catch (wsErr) {
            console.warn(`[Cloud WS] ⚠️ Fast-path timed out for ${requestId}: ${wsErr.message}`);
            wsFastPathTimedOut = true;
            if (graceTimeout > 0) {
                const lateWsResult = await waitForLateResultFromQueue(requestId, graceTimeout);
                if (lateWsResult) {
                    res.setHeader('x-oahl-relay-mode', 'websocket-late');
                    res.setHeader('x-oahl-request-id', requestId);
                    return res.json(lateWsResult);
                }
            }
        }
    }
    if (wsFastPathTimedOut && nodeSocket?.readyState === ws_1.WebSocket.OPEN) {
        console.warn(`[Cloud WS] 🛑 WebSocket total timeout for ${requestId} after ${fastPathTimeout + graceTimeout}ms`);
        res.setHeader('x-oahl-relay-mode', 'websocket-timeout');
        res.setHeader('x-oahl-request-id', requestId);
        return res.status(504).json({
            error: 'WebSocket command timed out waiting for provider result',
            request_id: requestId,
            session_id: sessionId,
            node_id: session.node_id,
            device_id: session.device_id
        });
    }
    const relayPayloadJson = JSON.stringify(relayPayload);
    // Push to node's queue
    await redisClient.lPush(`commands:${session.node_id}`, relayPayloadJson);
    // Wait for result (timeout configurable)
    try {
        const result = await redisClient.brPop(`result:${requestId}`, pollingTimeoutS);
        if (result) {
            res.setHeader('x-oahl-relay-mode', 'polling');
            res.setHeader('x-oahl-request-id', requestId);
            res.json(JSON.parse(result.element));
        }
        else {
            res.setHeader('x-oahl-relay-mode', 'polling-timeout');
            res.setHeader('x-oahl-request-id', requestId);
            res.status(504).json({
                error: "Hardware Node Timeout",
                request_id: requestId,
                session_id: sessionId,
                node_id: session.node_id,
                device_id: session.device_id
            });
        }
    }
    catch (err) {
        res.status(500).json({ error: "Relay error: " + err.message });
    }
});
/**
 * 4b. AGENT EXECUTE BATCH (COMMAND RELAY)
 */
app.post('/v1/sessions/:id/execute-batch', authAgent, executeRateLimiter, async (req, res) => {
    const sessionId = req.params.id;
    const { commands, timeout_ms } = req.body;
    if (!Array.isArray(commands)) {
        return res.status(400).json({ error: "Expected an array of 'commands'" });
    }
    const sessionStr = await redisClient.get(`session:${sessionId}`);
    if (!sessionStr)
        return res.status(404).json({ error: "Session not found" });
    const session = JSON.parse(sessionStr);
    const requestId = `batch-${(0, crypto_1.randomUUID)()}`;
    const requestedTimeoutMs = typeof timeout_ms === 'number' ? timeout_ms : undefined;
    const fastPathTimeout = requestedTimeoutMs || (WS_FASTPATH_TIMEOUT_MS * commands.length);
    const graceTimeout = requestedTimeoutMs ? 0 : WS_LATE_RESULT_GRACE_MS;
    const pollingTimeoutS = requestedTimeoutMs ? Math.ceil(requestedTimeoutMs / 1000) : (POLLING_RESULT_TIMEOUT_S * commands.length);
    const relayPayload = {
        requestId,
        sessionId,
        deviceId: session.device_id,
        dispatchedAt: Date.now(),
        commands
    };
    const nodeSocket = providerSocketsByNode.get(session.node_id);
    let wsFastPathTimedOut = false;
    if (nodeSocket && nodeSocket.readyState === ws_1.WebSocket.OPEN) {
        try {
            nodeSocket.send(JSON.stringify({ type: 'command-batch', payload: relayPayload }));
            const wsResult = await waitForWsResult(requestId, fastPathTimeout);
            res.setHeader('x-oahl-relay-mode', 'websocket');
            res.setHeader('x-oahl-request-id', requestId);
            return res.json(wsResult);
        }
        catch (wsErr) {
            console.warn(`[Cloud WS] ⚠️ Fast-path timed out for batch ${requestId}: ${wsErr.message}`);
            wsFastPathTimedOut = true;
            if (graceTimeout > 0) {
                const lateWsResult = await waitForLateResultFromQueue(requestId, graceTimeout);
                if (lateWsResult) {
                    res.setHeader('x-oahl-relay-mode', 'websocket-late');
                    res.setHeader('x-oahl-request-id', requestId);
                    return res.json(lateWsResult);
                }
            }
        }
    }
    if (wsFastPathTimedOut && nodeSocket?.readyState === ws_1.WebSocket.OPEN) {
        console.warn(`[Cloud WS] 🛑 WebSocket total timeout for batch ${requestId}`);
        res.setHeader('x-oahl-relay-mode', 'websocket-timeout');
        res.setHeader('x-oahl-request-id', requestId);
        return res.status(504).json({
            error: 'WebSocket batch command timed out waiting for provider result',
            request_id: requestId,
            session_id: sessionId,
            node_id: session.node_id,
            device_id: session.device_id
        });
    }
    const relayPayloadJson = JSON.stringify({ type: 'command-batch', payload: relayPayload });
    // Push to node's queue
    await redisClient.lPush(`commands:${session.node_id}`, relayPayloadJson);
    // Wait for result (timeout configurable)
    try {
        const result = await redisClient.brPop(`result:${requestId}`, pollingTimeoutS);
        if (result) {
            res.setHeader('x-oahl-relay-mode', 'polling');
            res.setHeader('x-oahl-request-id', requestId);
            res.json(JSON.parse(result.element));
        }
        else {
            res.setHeader('x-oahl-relay-mode', 'polling-timeout');
            res.setHeader('x-oahl-request-id', requestId);
            res.status(504).json({
                error: "Hardware Node Timeout",
                request_id: requestId,
                session_id: sessionId,
                node_id: session.node_id,
                device_id: session.device_id
            });
        }
    }
    catch (err) {
        res.status(500).json({ error: "Relay error: " + err.message });
    }
});
/**
 * 4c. AGENT ASYNCHRONOUS EVENT SUBSCRIPTIONS (SSE)
 */
app.get('/v1/sessions/:id/events', authAgent, async (req, res) => {
    const sessionId = req.params.id;
    const capability = typeof req.query.capability === 'string' ? req.query.capability : undefined;
    const sessionStr = await redisClient.get(`session:${sessionId}`);
    if (!sessionStr) {
        return res.status(404).json({ error: "Session not found" });
    }
    const session = JSON.parse(sessionStr);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    const subscriberId = `sub-${(0, crypto_1.randomUUID)()}`;
    const channel = `events:${session.node_id}:${session.device_id}`;
    // Use a dedicated redis client for subscribing
    const subClient = redisClient.duplicate();
    await subClient.connect();
    await subClient.subscribe(channel, (message) => {
        try {
            const event = JSON.parse(message);
            if (capability && event.capability !== capability) {
                return; // Filter by capability if specified
            }
            res.write(`data: ${JSON.stringify(event)}\n\n`);
        }
        catch (err) {
            console.error(`[SSE] Error parsing event message:`, err);
        }
    });
    req.on('close', async () => {
        console.log(`[SSE] Client disconnected, closing subscription ${subscriberId}`);
        await subClient.unsubscribe(channel);
        await subClient.disconnect();
    });
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
    const server = app.listen(PORT, () => console.log(`☁️ OAHL Cloud Service running on port ${PORT}`));
    configureProviderWebSocket(server);
}
start().catch(console.error);
