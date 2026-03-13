import { Device, Capability, Session } from '@oahl/core';

export class OahlClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  async health(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/health`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return res.json();
  }

  async getDevices(): Promise<Device[]> {
    const res = await fetch(`${this.baseUrl}/devices`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return res.json();
  }

  async getCapabilities(deviceId: string): Promise<Capability[]> {
    const res = await fetch(`${this.baseUrl}/capabilities?deviceId=${encodeURIComponent(deviceId)}`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return res.json();
  }

  async startSession(deviceId: string): Promise<Session> {
    const res = await fetch(`${this.baseUrl}/sessions/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId })
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return res.json();
  }

  async execute(sessionId: string, capabilityName: string, args?: any): Promise<any> {
    const res = await fetch(`${this.baseUrl}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, capabilityName, args })
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return res.json();
  }

  async stopSession(sessionId: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/sessions/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  }

  async getSession(sessionId: string): Promise<Session> {
    const res = await fetch(`${this.baseUrl}/sessions/${encodeURIComponent(sessionId)}`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return res.json();
  }
}
