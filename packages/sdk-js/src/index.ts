import { Device, Capability, Session } from '@oahl/core';

type JsonObject = Record<string, any>;

export interface CloudCapabilitiesQuery {
  q?: string;
  type?: string;
  provider?: string;
  node_id?: string;
  capability?: string;
  page?: number;
  page_size?: number;
}

export interface CloudCapabilitiesPagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface CloudCapabilityDevice {
  id: string;
  type: string;
  capabilities: Array<string | Capability>;
  provider: string;
  node_id: string;
  status: string;
}

export interface CloudCapabilitiesResponse {
  timestamp: number;
  devices: CloudCapabilityDevice[];
  pagination?: CloudCapabilitiesPagination;
  filters?: {
    q?: string;
    type?: string;
    provider?: string;
    node_id?: string;
    capability?: string;
  };
}

export interface CloudRequestSessionInput {
  capability?: string;
  device_id?: string;
  node_id?: string;
}

export interface CloudSessionRequestResponse {
  session_id: string;
  status: string;
}

export interface CloudExecuteInput {
  capability: string;
  params?: JsonObject;
  timeout_ms?: number;
}

export interface CloudStopSessionResponse {
  status: string;
}

class HttpClient {
  protected async request<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, init);
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`HTTP error ${response.status}: ${body || response.statusText}`);
    }
    return response.json() as Promise<T>;
  }
}

export class OahlClient extends HttpClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000') {
    super();
    this.baseUrl = baseUrl;
  }

  async health(): Promise<any> {
    return this.request<any>(`${this.baseUrl}/health`);
  }

  async getDevices(): Promise<Device[]> {
    return this.request<Device[]>(`${this.baseUrl}/devices`);
  }

  async getCapabilities(deviceId: string): Promise<Capability[]> {
    return this.request<Capability[]>(`${this.baseUrl}/capabilities?deviceId=${encodeURIComponent(deviceId)}`);
  }

  async startSession(deviceId: string): Promise<Session> {
    return this.request<Session>(`${this.baseUrl}/sessions/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId })
    });
  }

  async execute(sessionId: string, capabilityName: string, args?: any): Promise<any> {
    return this.request<any>(`${this.baseUrl}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, capabilityName, args })
    });
  }

  async stopSession(sessionId: string): Promise<void> {
    await this.request<any>(`${this.baseUrl}/sessions/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });
  }

  async getSession(sessionId: string): Promise<Session> {
    return this.request<Session>(`${this.baseUrl}/sessions/${encodeURIComponent(sessionId)}`);
  }
}

export class CloudClient extends HttpClient {
  private baseUrl: string;
  private agentApiKey?: string;

  constructor(baseUrl: string = 'https://oahl.onrender.com', agentApiKey?: string) {
    super();
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.agentApiKey = agentApiKey;
  }

  setAgentApiKey(agentApiKey: string): void {
    this.agentApiKey = agentApiKey;
  }

  private authHeaders(additionalHeaders?: HeadersInit): HeadersInit {
    const headers: Record<string, string> = {
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

  async getCapabilities(query?: CloudCapabilitiesQuery): Promise<CloudCapabilitiesResponse> {
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

    return this.request<CloudCapabilitiesResponse>(url, {
      headers: this.authHeaders()
    });
  }

  async requestSession(input: CloudRequestSessionInput): Promise<CloudSessionRequestResponse> {
    return this.request<CloudSessionRequestResponse>(`${this.baseUrl}/v1/requests`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(input)
    });
  }

  async execute(sessionId: string, input: CloudExecuteInput): Promise<any> {
    return this.request<any>(`${this.baseUrl}/v1/sessions/${encodeURIComponent(sessionId)}/execute`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(input)
    });
  }

  async stopSession(sessionId: string): Promise<CloudStopSessionResponse> {
    return this.request<CloudStopSessionResponse>(`${this.baseUrl}/v1/sessions/${encodeURIComponent(sessionId)}/stop`, {
      method: 'POST',
      headers: this.authHeaders()
    });
  }
}
