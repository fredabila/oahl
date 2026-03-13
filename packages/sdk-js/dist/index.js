"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OahlClient = void 0;
class OahlClient {
    baseUrl;
    constructor(baseUrl = 'http://localhost:3000') {
        this.baseUrl = baseUrl;
    }
    async health() {
        const res = await fetch(`${this.baseUrl}/health`);
        if (!res.ok)
            throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
    }
    async getDevices() {
        const res = await fetch(`${this.baseUrl}/devices`);
        if (!res.ok)
            throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
    }
    async getCapabilities(deviceId) {
        const res = await fetch(`${this.baseUrl}/capabilities?deviceId=${encodeURIComponent(deviceId)}`);
        if (!res.ok)
            throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
    }
    async startSession(deviceId) {
        const res = await fetch(`${this.baseUrl}/sessions/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId })
        });
        if (!res.ok)
            throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
    }
    async execute(sessionId, capabilityName, args) {
        const res = await fetch(`${this.baseUrl}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, capabilityName, args })
        });
        if (!res.ok)
            throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
    }
    async stopSession(sessionId) {
        const res = await fetch(`${this.baseUrl}/sessions/stop`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
        });
        if (!res.ok)
            throw new Error(`HTTP error! status: ${res.status}`);
    }
    async getSession(sessionId) {
        const res = await fetch(`${this.baseUrl}/sessions/${encodeURIComponent(sessionId)}`);
        if (!res.ok)
            throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
    }
}
exports.OahlClient = OahlClient;
