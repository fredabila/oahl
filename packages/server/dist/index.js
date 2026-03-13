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
const adapter_mock_1 = require("@oahl/adapter-mock");
const adapter_usb_camera_1 = require("@oahl/adapter-usb-camera");
const adapter_rtl_sdr_1 = require("@oahl/adapter-rtl-sdr");
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
else {
    console.log('[Config] 🟡 No oahl-config.json found. Using defaults.');
}
// Initialize core components
const sessionManager = new core_1.SessionManager();
const policyEngine = new core_1.PolicyEngine();
const adapters = [
    new adapter_mock_1.MockAdapter(),
    new adapter_usb_camera_1.UsbCameraAdapter(),
    new adapter_rtl_sdr_1.RtlSdrAdapter()
];
// Helper to find adapter for a device
async function getAdapterForDevice(deviceId) {
    for (const adapter of adapters) {
        const devices = await adapter.getDevices();
        if (devices.find(d => d.id === deviceId)) {
            return adapter;
        }
    }
    return undefined;
}
// --- Heartbeat Logic ---
async function startCloudHeartbeat(config) {
    // If the user hasn't configured a cloud URL, just run locally
    if (!config.cloud_url || !config.provider_api_key) {
        console.log("[Cloud] 🟡 No cloud_url or provider_api_key found in config. Running in Local-Only mode.");
        return;
    }
    const registerNode = async () => {
        try {
            console.log(`[Cloud] 🔵 Syncing with ${config.cloud_url}...`);
            const response = await fetch(`${config.cloud_url}/v1/provider/nodes/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.provider_api_key}`
                },
                body: JSON.stringify({
                    node_id: config.node_id,
                    provider: config.provider,
                    devices: config.devices
                })
            });
            if (response.ok) {
                console.log(`[Cloud] 🟢 Successfully synced hardware with ${config.cloud_url}`);
            }
            else {
                const errorText = await response.text();
                console.error(`[Cloud] ❌ Failed to sync: ${errorText}`);
            }
        }
        catch (err) {
            console.error(`[Cloud] ❌ Could not reach cloud registry: ${err.message}`);
        }
    };
    // Register immediately on startup
    await registerNode();
    // And then send a heartbeat every 2 minutes to keep the node "Alive" in Redis
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
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/capabilities', async (req, res) => {
    try {
        const deviceId = req.query.deviceId;
        if (!deviceId) {
            return res.status(400).json({ error: 'deviceId query parameter is required' });
        }
        const adapter = await getAdapterForDevice(deviceId);
        if (!adapter) {
            return res.status(404).json({ error: 'Device not found' });
        }
        const capabilities = await adapter.getCapabilities(deviceId);
        res.json(capabilities);
    }
    catch (error) {
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
    }
    catch (error) {
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
    }
    catch (error) {
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
    }
    catch (error) {
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
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Initialize and start server
async function start() {
    for (const adapter of adapters) {
        await adapter.initialize();
    }
    // Start the cloud heartbeat if configured
    await startCloudHeartbeat(config);
    app.listen(PORT, () => {
        console.log(`OAHL Server running on port ${PORT}`);
    });
}
start().catch(console.error);
