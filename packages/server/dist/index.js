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
// --- CLOUD RELAY LISTENER (The Mailbox) ---
async function startCloudRelay(config, adapters) {
    if (!config.cloud_url || !config.provider_api_key)
        return;
    console.log(`[Cloud Relay] 📬 Starting HTTP Command Listener (Polling)...`);
    while (true) {
        try {
            // Poll the Cloud Registry for any pending commands
            const response = await fetch(`${config.cloud_url}/v1/provider/nodes/${config.node_id}/poll`, {
                headers: {
                    'Authorization': `Bearer ${config.provider_api_key}`
                }
            });
            if (response.status === 200) {
                const payload = await response.json();
                console.log(`[Cloud Relay] 📥 Received command: ${payload.capability} for device ${payload.deviceId}`);
                // Find adapter and execute
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
                        // Send result back to cloud
                        await fetch(`${config.cloud_url}/v1/provider/nodes/results`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${config.provider_api_key}`
                            },
                            body: JSON.stringify({
                                requestId: payload.requestId,
                                result: result
                            })
                        });
                        console.log(`[Cloud Relay] 📤 Sent result back for ${payload.requestId}`);
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
                        await fetch(`${config.cloud_url}/v1/provider/nodes/results`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${config.provider_api_key}`
                            },
                            body: JSON.stringify({
                                requestId: payload.requestId,
                                result
                            })
                        });
                    }
                }
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
    startCloudRelay(config, adapters).catch(console.error);
    app.listen(PORT, () => console.log(`OAHL Server running on port ${PORT}`));
}
start().catch(console.error);
