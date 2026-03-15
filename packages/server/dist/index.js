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
    cloud_url: 'https://oahl.onrender.com',
    provider_api_key: '123456',
    devices: []
};
const configPath = path.resolve(process.cwd(), 'oahl-config.json');
if (fs.existsSync(configPath)) {
    try {
        const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        config = { ...config, ...fileConfig };
        console.log(`[Config] 🟢 Loaded config from ${configPath}`);
    }
    catch (err) {
        console.error(`[Config] ❌ Failed to parse oahl-config.json: ${err.message}`);
    }
}
// Initialize core components
const sessionManager = new core_1.SessionManager();
const adapters = [];
const ADAPTER_RECOVERY_COOLDOWN_MS = Math.max(1_000, Number.parseInt(process.env.OAHL_ADAPTER_RECOVERY_COOLDOWN_MS || '5000', 10) || 5_000);
const HEARTBEAT_INTERVAL_MS = Math.max(5_000, Number.parseInt(process.env.OAHL_HEARTBEAT_INTERVAL_MS || '15000', 10) || 15_000);
const lastAdapterRecoveryAttempt = new Map();
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
function adapterLabel(adapter) {
    return adapter.id || adapter.constructor?.name || 'unknown-adapter';
}
async function recoverAdapter(adapter, reason) {
    const now = Date.now();
    const lastAttempt = lastAdapterRecoveryAttempt.get(adapter) || 0;
    if (now - lastAttempt < ADAPTER_RECOVERY_COOLDOWN_MS) {
        return false;
    }
    lastAdapterRecoveryAttempt.set(adapter, now);
    try {
        await adapter.initialize();
        console.log(`[Adapters] ♻️ Recovered ${adapterLabel(adapter)} (${reason})`);
        return true;
    }
    catch (err) {
        console.error(`[Adapters] ❌ Recovery failed for ${adapterLabel(adapter)} (${reason}): ${err.message}`);
        return false;
    }
}
async function ensureAdapterHealthy(adapter) {
    if (typeof adapter.healthCheck !== 'function')
        return;
    try {
        const health = await adapter.healthCheck();
        if (health?.status !== 'ok') {
            await recoverAdapter(adapter, `health-check:${health?.message || 'error'}`);
        }
    }
    catch (err) {
        await recoverAdapter(adapter, `health-check-threw:${err.message}`);
    }
}
async function getDevicesWithRecovery(adapter) {
    try {
        const devices = await adapter.getDevices();
        return Array.isArray(devices) ? devices : [];
    }
    catch (err) {
        const recovered = await recoverAdapter(adapter, `getDevices-failed:${err.message}`);
        if (!recovered) {
            throw err;
        }
        const devices = await adapter.getDevices();
        return Array.isArray(devices) ? devices : [];
    }
}
async function getCapabilitiesWithRecovery(adapter, deviceId) {
    try {
        const capabilities = await adapter.getCapabilities(deviceId);
        return Array.isArray(capabilities) ? capabilities : [];
    }
    catch (err) {
        const recovered = await recoverAdapter(adapter, `getCapabilities-failed:${deviceId}:${err.message}`);
        if (!recovered) {
            throw err;
        }
        const capabilities = await adapter.getCapabilities(deviceId);
        return Array.isArray(capabilities) ? capabilities : [];
    }
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
function capabilityEntryName(capability) {
    if (typeof capability === 'string')
        return capability;
    if (capability && typeof capability.name === 'string')
        return capability.name;
    return '';
}
function resolveBaselineCapability(configuredDevice, device, existingCapabilities) {
    const rawDeviceBaseline = configuredDevice?.baseline_capability;
    const rawGlobalBaseline = config?.baseline_capability;
    if (rawDeviceBaseline === false) {
        return null;
    }
    let baselineConfig = null;
    if (rawDeviceBaseline === true) {
        baselineConfig = {};
    }
    else if (rawDeviceBaseline && typeof rawDeviceBaseline === 'object') {
        baselineConfig = rawDeviceBaseline;
    }
    else if (rawGlobalBaseline === true) {
        baselineConfig = {};
    }
    else if (rawGlobalBaseline && typeof rawGlobalBaseline === 'object') {
        baselineConfig = rawGlobalBaseline;
    }
    if (!baselineConfig || baselineConfig.enabled === false) {
        return null;
    }
    const name = (typeof baselineConfig.name === 'string' && baselineConfig.name.trim())
        ? baselineConfig.name.trim()
        : 'hardware.baseline';
    const alreadyDefined = existingCapabilities.some((cap) => capabilityEntryName(cap) === name);
    if (alreadyDefined) {
        return null;
    }
    const helperUrl = (baselineConfig.helper_url ||
        baselineConfig.helperUrl ||
        configuredDevice?.helper_url ||
        config?.baseline_helper_url ||
        '').toString().trim();
    const description = (typeof baselineConfig.description === 'string' && baselineConfig.description.trim())
        ? baselineConfig.description.trim()
        : `Fallback capability template for ${device?.name || device?.id || 'device'} when a direct capability is not available.`;
    const template = (typeof baselineConfig.template === 'string' && baselineConfig.template.trim())
        ? baselineConfig.template.trim()
        : 'Describe desired hardware action, safety constraints, expected output shape, and timeout budget.';
    const contextHint = (typeof baselineConfig.context === 'string' && baselineConfig.context.trim())
        ? baselineConfig.context.trim()
        : '';
    return {
        name,
        description,
        schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                intent: {
                    type: 'string',
                    description: 'Natural-language action request when no dedicated capability exists.'
                },
                params: {
                    type: 'object',
                    description: 'Structured parameters the provider helper can map to device actions.'
                },
                expected_output: {
                    type: 'object',
                    description: 'Optional output contract expected by agent workflow.'
                },
                timeout_ms: {
                    type: 'number',
                    minimum: 1,
                    description: 'Desired execution timeout in milliseconds.'
                }
            },
            required: ['intent']
        },
        helper_url: helperUrl || undefined,
        template,
        context: contextHint || undefined,
        metadata: {
            baseline: true,
            helper_url: helperUrl || undefined,
            template
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
        const devices = await getDevicesWithRecovery(adapter);
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
async function handleBatchCommand(config, payload) {
    console.log(`[Cloud Relay] 📥 Received batch commands for device ${payload.deviceId}`);
    const relayStartedAt = Date.now();
    const results = [];
    const adapter = await getAdapterForDevice(payload.deviceId);
    if (!adapter) {
        const errResult = asExecutionResult({
            requestId: payload.requestId,
            deviceId: payload.deviceId,
            capability: 'batch',
            error: new Error(`No adapter found for device ${payload.deviceId}`)
        });
        return { result: errResult, resultType: 'no-adapter' };
    }
    let hasError = false;
    for (const cmd of payload.commands || []) {
        try {
            const rawResult = await adapter.execute(payload.deviceId, cmd.capability, cmd.params || {});
            results.push({ capability: cmd.capability, status: 'success', data: rawResult });
        }
        catch (execErr) {
            console.error(`[Cloud Relay] ❌ Batch execution failed on ${cmd.capability}: ${execErr.message}`);
            results.push({ capability: cmd.capability, status: 'error', error: execErr.message });
            hasError = true;
            break; // Stop on first error
        }
    }
    const result = asExecutionResult({
        requestId: payload.requestId,
        deviceId: payload.deviceId,
        capability: 'batch',
        adapterId: adapter.id || adapter.constructor.name,
        rawResult: results
    });
    if (hasError) {
        result.status = 'error';
        result.error = { code: 'BATCH_ERROR', message: 'One or more commands failed in batch' };
    }
    const dispatchTimestamp = Number(payload.dispatchedAt) || relayStartedAt;
    result.meta = {
        ...(result.meta || {}),
        relay_latency_ms: Date.now() - dispatchTimestamp,
        node_id: config.node_id
    };
    return { result, resultType: hasError ? 'error' : 'success' };
}
function startCloudWebSocketRelay(config) {
    if (!config.cloud_url || !config.provider_api_key || !config.node_id)
        return;
    const connect = () => {
        try {
            const wsBase = String(config.cloud_url)
                .replace(/^http:\/\//i, 'ws://')
                .replace(/^https:\/\//i, 'wss://');
            const wsUrl = `${wsBase}/ws/provider?node_id=${encodeURIComponent(String(config.node_id))}`;
            const socket = new ws_1.WebSocket(wsUrl, {
                headers: {
                    Authorization: `Bearer ${config.provider_api_key}`,
                    'x-node-id': String(config.node_id)
                }
            });
            let keepAliveTimer;
            socket.on('open', () => {
                isWebSocketRelayConnected = true;
                console.log('[Cloud WS] 🟢 Provider websocket connected');
                keepAliveTimer = setInterval(() => {
                    if (socket.readyState === ws_1.WebSocket.OPEN) {
                        socket.ping();
                    }
                }, 20_000);
            });
            socket.on('message', async (rawMessage) => {
                try {
                    const message = JSON.parse(String(rawMessage));
                    if (!message?.type || !message?.payload?.requestId) {
                        return;
                    }
                    const payload = message.payload;
                    let result, resultType;
                    if (message.type === 'command-batch') {
                        ({ result, resultType } = await handleBatchCommand(config, payload));
                    }
                    else if (message.type === 'command') {
                        ({ result, resultType } = await handleRelayCommand(config, payload));
                    }
                    else {
                        return;
                    }
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
            socket.on('close', (code, reasonBuffer) => {
                if (keepAliveTimer) {
                    clearInterval(keepAliveTimer);
                    keepAliveTimer = undefined;
                }
                const reason = reasonBuffer ? reasonBuffer.toString() : '';
                if (isWebSocketRelayConnected) {
                    console.log(`[Cloud WS] 🔌 Provider websocket disconnected, falling back to polling (code=${code}${reason ? `, reason=${reason}` : ''})`);
                }
                else {
                    console.log(`[Cloud WS] 🔌 Provider websocket closed before ready (code=${code}${reason ? `, reason=${reason}` : ''})`);
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
    const handlePolledCommand = async (payloadMsg) => {
        let result, resultType;
        if (payloadMsg.type === 'command-batch') {
            ({ result, resultType } = await handleBatchCommand(config, payloadMsg.payload));
            await sendResultToCloud(config, payloadMsg.payload.requestId, result, resultType);
        }
        else {
            const actualPayload = payloadMsg.type === 'command' ? payloadMsg.payload : payloadMsg;
            ({ result, resultType } = await handleRelayCommand(config, actualPayload));
            await sendResultToCloud(config, actualPayload.requestId, result, resultType);
        }
    };
    while (true) {
        try {
            if (isWebSocketRelayConnected) {
                await new Promise(r => setTimeout(r, 250));
                continue;
            }
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
                    await ensureAdapterHealthy(adapter);
                    const devices = await getDevicesWithRecovery(adapter);
                    for (const device of devices) {
                        const configured = configuredDevicesById.get(device.id) || {};
                        const adapterCapabilities = await getCapabilitiesWithRecovery(adapter, device.id);
                        const capabilities = Array.isArray(adapterCapabilities) ? [...adapterCapabilities] : [];
                        const baselineCapability = resolveBaselineCapability(configured, device, capabilities);
                        if (baselineCapability) {
                            capabilities.push(baselineCapability);
                        }
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
                            manufacturer: configured.manufacturer,
                            model: configured.model,
                            serial_number: configured.serial_number,
                            semantic_context: configured.semantic_context,
                            pricing: configured.pricing,
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
                    owner_email: process.env.OAHL_OWNER_EMAIL,
                    owner_pin: process.env.OAHL_OWNER_PIN,
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
    setInterval(registerNode, HEARTBEAT_INTERVAL_MS);
}
// Local API endpoints
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/devices', async (req, res) => {
    const allDevices = [];
    for (const adapter of adapters) {
        const devices = await getDevicesWithRecovery(adapter);
        allDevices.push(...devices);
    }
    res.json(allDevices);
});
// Start everything
async function start() {
    for (const adapter of adapters) {
        try {
            await recoverAdapter(adapter, 'startup');
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
