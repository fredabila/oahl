"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const core_1 = require("@oahl/core");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ws_1 = require("ws");
const app = (0, express_1.default)();
app.use(express_1.default.json());
const PORT = process.env.PORT || 3000;
// Load configuration
let config = {
    node_id: 'default-node',
    devices: []
};
const configPath = path.resolve(process.cwd(), 'oahl-config.json');
if (fs.existsSync(configPath)) {
    try {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        console.log(`[Config] 🟢 Loaded config from ${configPath}`);
    }
    catch (err) {
        console.error(`[Config] ❌ Failed to parse oahl-config.json: ${err.message}`);
    }
}
// Initialize core components
const sessionManager = new core_1.SessionManager();
const adapters = [];
function resolveAdapterClass(imported) {
    if (!imported)
        return undefined;
    if (typeof imported === 'function')
        return imported;
    if (typeof imported.default === 'function')
        return imported.default;
    const exportCandidates = Object.values(imported).filter((value) => typeof value === 'function');
    if (exportCandidates.length > 0) {
        return exportCandidates[0];
    }
    return undefined;
}
function asExecutionResult(options) {
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
            let imported;
            try {
                imported = require(pluginName);
            }
            catch {
                const localPath = path.resolve(process.cwd(), 'node_modules', pluginName);
                imported = require(localPath);
            }
            const PluginClass = resolveAdapterClass(imported);
            if (typeof PluginClass === 'function') {
                adapters.push(new PluginClass());
                console.log(`[Plugins] ✅ ${pluginName} loaded successfully.`);
            }
            else {
                console.error(`[Plugins] ❌ ${pluginName} does not export a constructable adapter class.`);
            }
        }
        catch (err) {
            console.error(`[Plugins] ❌ Failed to load adapter ${pluginName}: ${err.message}`);
        }
    }
}
// Helper to find adapter for a device
async function getAdapterForDevice(deviceId) {
    for (const adapter of adapters) {
        const devices = await adapter.getDevices();
        if (devices.find(d => d.id === deviceId))
            return adapter;
    }
    return undefined;
}
let isWebSocketRelayConnected = false;
async function sendResultToCloud(config, requestId, result, resultType) {
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
}
async function handleRelayCommand(config, payload) {
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
            return { result, resultType: 'success' };
        }
        catch (execErr) {
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
            return { result, resultType: 'error' };
        }
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
    return { result, resultType: 'no-adapter' };
}
function startCloudWebSocketRelay(config) {
    if (!config.cloud_url || !config.provider_api_key || !config.node_id)
        return;
    const connect = () => {
        try {
            const wsBase = String(config.cloud_url)
                .replace(/^http:\/\//i, 'ws://')
                .replace(/^https:\/\//i, 'wss://');
            const wsUrl = `${wsBase}/ws/provider?node_id=${encodeURIComponent(config.node_id)}&api_key=${encodeURIComponent(config.provider_api_key)}`;
            const socket = new ws_1.WebSocket(wsUrl);
            socket.on('open', () => {
                isWebSocketRelayConnected = true;
                console.log('[Cloud WS] 🟢 Provider websocket connected');
            });
            socket.on('message', async (rawMessage) => {
                try {
                    const message = JSON.parse(String(rawMessage));
                    if (message?.type !== 'command' || !message?.payload?.requestId) {
                        return;
                    }
                    const payload = message.payload;
                    const { result, resultType } = await handleRelayCommand(config, payload);
                    if (socket.readyState === ws_1.WebSocket.OPEN) {
                        socket.send(JSON.stringify({
                            type: 'result',
                            requestId: payload.requestId,
                            result
                        }));
                        console.log(`[Cloud WS] 📤 Sent ${resultType} result back for ${payload.requestId}`);
                    }
                    else {
                        await sendResultToCloud(config, payload.requestId, result, resultType);
                    }
                }
                catch (err) {
                    console.error(`[Cloud WS] ❌ Failed handling websocket command: ${err.message}`);
                }
            });
            socket.on('close', () => {
                if (isWebSocketRelayConnected) {
                    console.log('[Cloud WS] 🔌 Provider websocket disconnected, falling back to polling');
                }
                isWebSocketRelayConnected = false;
                setTimeout(connect, 3000);
            });
            socket.on('error', (err) => {
                console.error(`[Cloud WS] ❌ Websocket error: ${err.message}`);
            });
        }
        catch (err) {
            console.error(`[Cloud WS] ❌ Failed to connect websocket relay: ${err.message}`);
            setTimeout(connect, 3000);
        }
    };
    connect();
}
// --- CLOUD RELAY LISTENER (The Mailbox) ---
async function startCloudRelay(config, adapters) {
    if (!config.cloud_url || !config.provider_api_key)
        return;
    console.log(`[Cloud Relay] 📬 Starting HTTP Command Listener (Polling)...`);
    const relayMaxConcurrency = Math.max(1, Number.parseInt(process.env.OAHL_RELAY_MAX_CONCURRENCY || '4', 10) || 4);
    const inFlightCommands = new Set();
    const handlePolledCommand = async (payload) => {
        const { result, resultType } = await handleRelayCommand(config, payload);
        await sendResultToCloud(config, payload.requestId, result, resultType);
    };
    while (true) {
        if (isWebSocketRelayConnected) {
            await new Promise((resolve) => setTimeout(resolve, 250));
            continue;
        }
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
                    .catch((commandErr) => {
                    console.error(`[Cloud Relay] ❌ Command handling failed: ${commandErr.message}`);
                })
                    .finally(() => {
                    inFlightCommands.delete(task);
                });
                inFlightCommands.add(task);
            }
            else if (response.status === 204) {
                // No commands waiting, just loop again
            }
            else {
                const errText = await response.text();
                console.error(`[Cloud Relay] ❌ Polling error (${response.status}): ${errText}`);
                await new Promise(r => setTimeout(r, 5000)); // Wait before retry
            }
        }
        catch (err) {
            console.error(`[Cloud Relay] ❌ Connection error: ${err.message}`);
            await new Promise(r => setTimeout(r, 5000));
        }
    }
}
// --- Dynamic Heartbeat Logic ---
async function startCloudHeartbeat(config, adapters) {
    if (!config.cloud_url || !config.provider_api_key)
        return;
    const configuredDevicesById = new Map((Array.isArray(config.devices) ? config.devices : [])
        .filter((entry) => entry && typeof entry.id === 'string')
        .map((entry) => [entry.id, entry]));
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
                }
                catch (err) {
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
        }
        catch (err) {
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
        }
        catch (err) {
            console.error(`[Adapters] ❌ Failed to initialize adapter: ${err.message}`);
        }
    }
    startCloudHeartbeat(config, adapters);
    startCloudWebSocketRelay(config);
    startCloudRelay(config, adapters).catch(console.error);
    app.listen(PORT, () => console.log(`OAHL Server running on port ${PORT}`));
}
start().catch(console.error);
