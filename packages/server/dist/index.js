"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const core_1 = require("@oahl/core");
const adapter_mock_1 = require("@oahl/adapter-mock");
const adapter_usb_camera_1 = require("@oahl/adapter-usb-camera");
const adapter_rtl_sdr_1 = require("@oahl/adapter-rtl-sdr");
const app = (0, express_1.default)();
app.use(express_1.default.json());
const PORT = process.env.PORT || 3000;
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
        // Normally we would check policy here
        // const allowed = policyEngine.checkCapability(session.deviceId, capabilityName);
        // if (!allowed) { return res.status(403).json({ error: 'Capability not allowed by policy' }); }
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
    app.listen(PORT, () => {
        console.log(`OAHL Server running on port ${PORT}`);
    });
}
start().catch(console.error);
