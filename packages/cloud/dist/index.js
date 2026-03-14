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
    let visibility = 'public';
    if (typeof policy.visibility === 'string') {
        const normalizedVisibility = policy.visibility.trim().toLowerCase();
        if (normalizedVisibility === 'public' || normalizedVisibility === 'shared' || normalizedVisibility === 'private') {
            visibility = normalizedVisibility;
        }
    }
    else if (typeof policy.public === 'boolean') {
        visibility = policy.public ? 'public' : 'private';
    }
    else if (typeof device?.isPublic === 'boolean') {
        visibility = device.isPublic ? 'public' : 'private';
    }
    return {
        visibility,
        allowedAgents: normalizeStringList(policy.allowed_agents || policy.allowedAgents),
        allowedOrgs: normalizeStringList(policy.allowed_orgs || policy.allowedOrgs),
        deniedAgents: normalizeStringList(policy.denied_agents || policy.deniedAgents)
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
                        capabilities,
                        provider: providerName,
                        node_id: node.node_id,
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
app.post('/v1/sessions/:id/execute', authAgent, async (req, res) => {
    const sessionId = req.params.id;
    const command = req.body;
    const sessionStr = await redisClient.get(`session:${sessionId}`);
    if (!sessionStr)
        return res.status(404).json({ error: "Session not found" });
    const session = JSON.parse(sessionStr);
    const requestId = `cmd-${(0, crypto_1.randomUUID)()}`;
    const relayPayload = JSON.stringify({
        requestId,
        sessionId,
        deviceId: session.device_id,
        capability: command.capability,
        params: command.params
    });
    // Push to node's queue
    await redisClient.lPush(`commands:${session.node_id}`, relayPayload);
    // Wait for result (timeout 30s)
    try {
        const result = await redisClient.brPop(`result:${requestId}`, 30);
        if (result) {
            res.json(JSON.parse(result.element));
        }
        else {
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
