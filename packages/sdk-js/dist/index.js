"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudClient = exports.OahlClient = void 0;
class HttpClient {
    async request(url, init) {
        const response = await fetch(url, init);
        if (!response.ok) {
            const body = await response.text();
            throw new Error(`HTTP error ${response.status}: ${body || response.statusText}`);
        }
        return response.json();
    }
}
class OahlClient extends HttpClient {
    baseUrl;
    constructor(baseUrl = 'http://localhost:3000') {
        super();
        this.baseUrl = baseUrl;
    }
    async health() {
        return this.request(`${this.baseUrl}/health`);
    }
    async getDevices() {
        return this.request(`${this.baseUrl}/devices`);
    }
    async getCapabilities(deviceId) {
        return this.request(`${this.baseUrl}/capabilities?deviceId=${encodeURIComponent(deviceId)}`);
    }
    async startSession(deviceId) {
        return this.request(`${this.baseUrl}/sessions/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId })
        });
    }
    async execute(sessionId, capabilityName, args) {
        return this.request(`${this.baseUrl}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, capabilityName, args })
        });
    }
    async stopSession(sessionId) {
        await this.request(`${this.baseUrl}/sessions/stop`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
        });
    }
    async getSession(sessionId) {
        return this.request(`${this.baseUrl}/sessions/${encodeURIComponent(sessionId)}`);
    }
}
exports.OahlClient = OahlClient;
class CloudClient extends HttpClient {
    baseUrl;
    agentApiKey;
    constructor(baseUrl = 'https://oahl.onrender.com', agentApiKey) {
        super();
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.agentApiKey = agentApiKey;
    }
    setAgentApiKey(agentApiKey) {
        this.agentApiKey = agentApiKey;
    }
    authHeaders(additionalHeaders) {
        const headers = {
            'Content-Type': 'application/json'
        };
        if (this.agentApiKey) {
            headers.Authorization = `Bearer ${this.agentApiKey}`;
        }
        return {
            ...headers,
            ...(additionalHeaders || {})
        };
    }
    async getCapabilities(query) {
        const params = new URLSearchParams();
        if (query) {
            for (const [key, value] of Object.entries(query)) {
                if (value !== undefined && value !== null && value !== '') {
                    params.set(key, String(value));
                }
            }
        }
        const queryString = params.toString();
        const url = `${this.baseUrl}/v1/capabilities${queryString ? `?${queryString}` : ''}`;
        return this.request(url, {
            headers: this.authHeaders()
        });
    }
    async requestSession(input) {
        return this.request(`${this.baseUrl}/v1/requests`, {
            method: 'POST',
            headers: this.authHeaders(),
            body: JSON.stringify(input)
        });
    }
    async execute(sessionId, input) {
        return this.request(`${this.baseUrl}/v1/sessions/${encodeURIComponent(sessionId)}/execute`, {
            method: 'POST',
            headers: this.authHeaders(),
            body: JSON.stringify(input)
        });
    }
    async stopSession(sessionId) {
        return this.request(`${this.baseUrl}/v1/sessions/${encodeURIComponent(sessionId)}/stop`, {
            method: 'POST',
            headers: this.authHeaders()
        });
    }
}
exports.CloudClient = CloudClient;
