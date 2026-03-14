import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Cloud,
  Code2,
  Database,
  Globe,
  KeyRound,
  Layers,
  Network,
  Play,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  Square,
  Terminal,
  Waypoints
} from 'lucide-react';

type Page = 'home' | 'api-lab';
type CapabilityLike = string | { name?: string; description?: string };

interface Device {
  id: string;
  type: string;
  capabilities: CapabilityLike[];
  provider: string;
  node_id: string;
  status: string;
}

interface CapabilitiesResponse {
  devices: Device[];
  pagination?: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

interface SessionResponse {
  session_id: string;
  status: string;
}

interface ExecutionResult {
  schema_version?: string;
  operation_id?: string;
  status?: string;
  completion?: {
    done?: boolean;
    state?: string;
    progress_pct?: number;
  };
  capability?: string;
  device_id?: string;
  timestamp?: string;
  data?: unknown;
  error?: unknown;
}

const AGENT_ENDPOINTS = [
  { method: 'GET', path: '/v1/capabilities', purpose: 'Discover global hardware inventory with filtering and pagination.' },
  { method: 'POST', path: '/v1/requests', purpose: 'Request a session by capability or deterministically by device_id (+ node_id).' },
  { method: 'POST', path: '/v1/sessions/:id/execute', purpose: 'Execute capability calls through cloud relay.' },
  { method: 'POST', path: '/v1/sessions/:id/stop', purpose: 'Release an active hardware session.' }
];

const PROVIDER_ENDPOINTS = [
  { method: 'POST', path: '/v1/provider/nodes/register', purpose: 'Publish online node and device inventory.' },
  { method: 'GET', path: '/v1/provider/nodes/:id/poll', purpose: 'Fetch queued execution requests for a provider node.' },
  { method: 'POST', path: '/v1/provider/nodes/results', purpose: 'Return execution results back to cloud.' }
];

const LOCAL_ENDPOINTS = [
  { method: 'GET', path: '/health', purpose: 'Node health status endpoint.' },
  { method: 'GET', path: '/devices', purpose: 'List devices from loaded adapters on the node.' }
];

const FLOW_STEPS = [
  { title: 'Discover', detail: 'Agent finds capabilities through /v1/capabilities.' },
  { title: 'Allocate', detail: 'Agent acquires session_id through /v1/requests.' },
  { title: 'Execute', detail: 'Agent sends command to /v1/sessions/:id/execute.' },
  { title: 'Release', detail: 'Agent stops session using /v1/sessions/:id/stop.' }
];

function capabilityName(capability: CapabilityLike): string {
  if (typeof capability === 'string') return capability;
  return capability?.name || 'unknown.capability';
}

function detectPage(): Page {
  return window.location.pathname.includes('api-lab') ? 'api-lab' : 'home';
}

function setPagePath(page: Page) {
  const path = page === 'api-lab' ? '/api-lab' : '/';
  window.history.pushState({}, '', path);
}

function App() {
  const [page, setPage] = useState<Page>(() => detectPage());

  useEffect(() => {
    const onPopState = () => setPage(detectPage());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const goToPage = (next: Page) => {
    setPagePath(next);
    setPage(next);
  };

  return (
    <div className="min-h-screen bg-oahl-bg text-oahl-textMain selection:bg-oahl-accent/20 selection:text-white">
      <div className="pointer-events-none fixed inset-0 opacity-80">
        <div className="absolute inset-0 bg-blueprint" />
        <div className="absolute inset-x-0 top-0 h-1 bg-oahl-accent/20 animate-scanline" />
      </div>

      <header className="sticky top-0 z-40 border-b border-oahl-border/80 bg-oahl-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <button onClick={() => goToPage('home')} className="flex items-center gap-3 text-left">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-oahl-accent to-oahl-accentHover text-white font-mono font-bold shadow-lg shadow-oahl-accent/20">
              OA
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide">OPEN AGENT HARDWARE LAYER</p>
              <p className="text-xs text-oahl-textMuted">Sleek platform experience</p>
            </div>
          </button>

          <nav className="flex items-center gap-2 text-sm">
            <NavButton active={page === 'home'} onClick={() => goToPage('home')} label="Home" />
            <NavButton active={page === 'api-lab'} onClick={() => goToPage('api-lab')} label="API Lab" />
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 pb-16 pt-10">
        {page === 'home' ? <HomePage onOpenApiLab={() => goToPage('api-lab')} /> : <ApiLabPage />}
      </main>

      <footer className="relative z-10 border-t border-oahl-border/70 py-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 text-xs text-oahl-textMuted">
          <p>OAHL © {new Date().getFullYear()} · Standards-first hardware interface for AI agents</p>
          <div className="flex items-center gap-4">
            <a href="https://github.com/fredabila/oahl" target="_blank" rel="noreferrer" className="hover:text-oahl-accent transition-colors">GitHub</a>
            <a href="https://oahl.onrender.com/v1/capabilities" target="_blank" rel="noreferrer" className="hover:text-oahl-accent transition-colors">Cloud API</a>
            <span className="inline-flex items-center gap-1"><KeyRound className="h-3.5 w-3.5" /> Bearer-secured</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function HomePage({ onOpenApiLab }: { onOpenApiLab: () => void }) {
  return (
    <>
      <section className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="panel p-8 md:p-10">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-oahl-tech/30 bg-oahl-tech/10 px-3 py-1 text-xs font-mono text-oahl-tech">
            <Sparkles className="h-3.5 w-3.5" />
            Protocol + Cloud + Node + Adapter
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight">
            A modern hardware cloud interface where agents discover, allocate, execute, and control real devices.
          </h1>
          <p className="mt-5 max-w-3xl text-oahl-textMuted leading-relaxed">
            OAHL provides a consistent API contract across cloud relay and local hardware nodes. Use Home for architecture context, then switch to API Lab for live endpoint testing.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={onOpenApiLab} className="rounded-2xl bg-oahl-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-oahl-accentHover transition-colors">
              Open API Lab
            </button>
            <a href="https://github.com/fredabila/oahl" target="_blank" rel="noreferrer" className="rounded-2xl border border-oahl-border px-5 py-2.5 text-sm font-semibold text-oahl-textMain hover:border-oahl-accent transition-colors">
              View Repository
            </a>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <StatCard label="Agent APIs" value="4 endpoints" />
            <StatCard label="Provider APIs" value="3 endpoints" />
            <StatCard label="Local Node APIs" value="2 endpoints" />
          </div>
        </div>

        <div className="panel p-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Waypoints className="h-5 w-5 text-oahl-accent" />
            Architecture Flow
          </h2>
          <div className="space-y-3 text-sm text-oahl-textMuted">
            <FlowStep icon={<Terminal className="h-4 w-4 text-oahl-tech" />} label="Agent/SDK" />
            <FlowConnector />
            <FlowStep icon={<Cloud className="h-4 w-4 text-oahl-accent" />} label="Cloud Registry" />
            <FlowConnector />
            <FlowStep icon={<Server className="h-4 w-4 text-oahl-tech" />} label="Provider Node" />
            <FlowConnector />
            <FlowStep icon={<Layers className="h-4 w-4 text-oahl-accent" />} label="Adapter + Device" />
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-3">
        <ApiGroup title="Agent Cloud APIs" icon={<Globe className="h-4 w-4 text-oahl-accent" />} endpoints={AGENT_ENDPOINTS} />
        <ApiGroup title="Provider Relay APIs" icon={<Network className="h-4 w-4 text-oahl-tech" />} endpoints={PROVIDER_ENDPOINTS} />
        <ApiGroup title="Local Node APIs" icon={<Database className="h-4 w-4 text-oahl-accent" />} endpoints={LOCAL_ENDPOINTS} />
      </section>

      <section className="mt-10 panel p-8">
        <h2 className="mb-5 flex items-center gap-2 text-xl font-semibold">
          <ShieldCheck className="h-5 w-5 text-oahl-tech" />
          Session Lifecycle
        </h2>
        <div className="grid gap-4 md:grid-cols-4">
          {FLOW_STEPS.map((step, index) => (
            <div key={step.title} className="api-card">
              <div className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-oahl-border bg-black text-xs font-mono">
                {index + 1}
              </div>
              <h3 className="mt-3 text-sm font-semibold">{step.title}</h3>
              <p className="mt-2 text-xs text-oahl-textMuted leading-relaxed">{step.detail}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function ApiLabPage() {
  const [cloudUrl, setCloudUrl] = useState('https://oahl.onrender.com');
  const [apiKey, setApiKey] = useState('');

  const [queryText, setQueryText] = useState('');
  const [queryCapability, setQueryCapability] = useState('');
  const [queryType, setQueryType] = useState('');
  const [queryProvider, setQueryProvider] = useState('');
  const [queryNodeId, setQueryNodeId] = useState('');

  const [devices, setDevices] = useState<Device[]>([]);
  const [paginationLabel, setPaginationLabel] = useState('');
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [selectedCapability, setSelectedCapability] = useState('');

  const [sessionId, setSessionId] = useState('');
  const [executeParams, setExecuteParams] = useState('{\n  "sample": true\n}');
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);

  const [loadingCapabilities, setLoadingCapabilities] = useState(false);
  const [requestingSession, setRequestingSession] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [actionError, setActionError] = useState('');

  const selectedDevice = useMemo(() => devices.find((d) => d.id === selectedDeviceId) || null, [devices, selectedDeviceId]);

  function bearerHeaders(includeJson = false): HeadersInit {
    const headers: Record<string, string> = { Authorization: `Bearer ${apiKey}` };
    if (includeJson) headers['Content-Type'] = 'application/json';
    return headers;
  }

  function buildCapabilitiesUrl(): string {
    const url = new URL(`${cloudUrl}/v1/capabilities`);
    if (queryText.trim()) url.searchParams.set('q', queryText.trim());
    if (queryCapability.trim()) url.searchParams.set('capability', queryCapability.trim());
    if (queryType.trim()) url.searchParams.set('type', queryType.trim());
    if (queryProvider.trim()) url.searchParams.set('provider', queryProvider.trim());
    if (queryNodeId.trim()) url.searchParams.set('node_id', queryNodeId.trim());
    url.searchParams.set('page', '1');
    url.searchParams.set('page_size', '25');
    return url.toString();
  }

  async function fetchCapabilities() {
    setActionError('');
    setLoadingCapabilities(true);

    try {
      const res = await fetch(buildCapabilitiesUrl(), { method: 'GET', headers: bearerHeaders(false) });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Failed to fetch capabilities');
      }

      const data = (await res.json()) as CapabilitiesResponse;
      const fetchedDevices = Array.isArray(data.devices) ? data.devices : [];
      setDevices(fetchedDevices);

      if (data.pagination) {
        setPaginationLabel(`Page ${data.pagination.page}/${Math.max(data.pagination.total_pages, 1)} • Total ${data.pagination.total}`);
      } else {
        setPaginationLabel(`Found ${fetchedDevices.length} devices`);
      }

      if (fetchedDevices.length > 0 && !selectedDeviceId) {
        const first = fetchedDevices[0];
        setSelectedDeviceId(first.id);
        setSelectedCapability(capabilityName(first.capabilities?.[0] || ''));
      }
    } catch (err: any) {
      setActionError(err?.message || 'Unable to fetch capabilities');
    } finally {
      setLoadingCapabilities(false);
    }
  }

  async function requestSession() {
    if (!selectedCapability.trim()) {
      setActionError('Select or enter a capability first.');
      return;
    }

    setActionError('');
    setRequestingSession(true);

    try {
      const payload: Record<string, string> = { capability: selectedCapability.trim() };
      if (selectedDeviceId) {
        payload.device_id = selectedDeviceId;
        if (selectedDevice?.node_id) payload.node_id = selectedDevice.node_id;
      }

      const res = await fetch(`${cloudUrl}/v1/requests`, {
        method: 'POST',
        headers: bearerHeaders(true),
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Unable to request session');
      }

      const data = (await res.json()) as SessionResponse;
      setSessionId(data.session_id || '');
      setExecutionResult(null);
    } catch (err: any) {
      setActionError(err?.message || 'Session request failed');
    } finally {
      setRequestingSession(false);
    }
  }

  async function executeCapability() {
    if (!sessionId.trim()) {
      setActionError('Request or provide a session_id before execute.');
      return;
    }

    if (!selectedCapability.trim()) {
      setActionError('Capability is required for execute.');
      return;
    }

    setActionError('');
    setExecuting(true);

    try {
      const parsedParams = executeParams.trim() ? JSON.parse(executeParams) : {};

      const res = await fetch(`${cloudUrl}/v1/sessions/${sessionId.trim()}/execute`, {
        method: 'POST',
        headers: bearerHeaders(true),
        body: JSON.stringify({ capability: selectedCapability.trim(), params: parsedParams })
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Execute failed');
      }

      const data = (await res.json()) as ExecutionResult;
      setExecutionResult(data);
    } catch (err: any) {
      if (err?.message?.includes('JSON')) {
        setActionError('Execute params must be valid JSON.');
      } else {
        setActionError(err?.message || 'Capability execution failed');
      }
    } finally {
      setExecuting(false);
    }
  }

  async function stopSession() {
    if (!sessionId.trim()) {
      setActionError('No active session_id to stop.');
      return;
    }

    setActionError('');
    setStopping(true);

    try {
      const res = await fetch(`${cloudUrl}/v1/sessions/${sessionId.trim()}/stop`, {
        method: 'POST',
        headers: bearerHeaders(false)
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Stop session failed');
      }

      setSessionId('');
    } catch (err: any) {
      setActionError(err?.message || 'Unable to stop session');
    } finally {
      setStopping(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="panel p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">API Lab</h1>
            <p className="mt-2 text-sm text-oahl-textMuted">Dedicated page for testing OAHL cloud session APIs end-to-end.</p>
          </div>
          <div className="badge"><Code2 className="h-3.5 w-3.5" /> /v1/capabilities · /v1/requests · /execute · /stop</div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-5">
          <Field label="Cloud URL" value={cloudUrl} onChange={setCloudUrl} placeholder="https://oahl.onrender.com" className="xl:col-span-2" />
          <Field label="Agent API Key" value={apiKey} onChange={setApiKey} placeholder="dev_agent_key" className="xl:col-span-2" />
          <button
            onClick={fetchCapabilities}
            disabled={loadingCapabilities || !apiKey.trim()}
            className="h-[46px] self-end rounded-xl border border-oahl-accent bg-oahl-accent px-4 text-sm font-semibold text-white transition hover:bg-oahl-accentHover disabled:opacity-50"
          >
            {loadingCapabilities ? 'Fetching...' : 'Fetch Capabilities'}
          </button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-5">
          <Field label="q" value={queryText} onChange={setQueryText} placeholder="camera" />
          <Field label="capability" value={queryCapability} onChange={setQueryCapability} placeholder="camera.capture" />
          <Field label="type" value={queryType} onChange={setQueryType} placeholder="camera" />
          <Field label="provider" value={queryProvider} onChange={setQueryProvider} placeholder="Local Lab" />
          <Field label="node_id" value={queryNodeId} onChange={setQueryNodeId} placeholder="node-01" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-semibold"><Search className="h-4 w-4 text-oahl-accent" /> Capability Results</p>
            <p className="text-xs text-oahl-textMuted">{paginationLabel || 'No query yet'}</p>
          </div>

          <div className="max-h-[520px] space-y-3 overflow-auto pr-1 code-scroll">
            {devices.length === 0 && (
              <div className="rounded-2xl border border-dashed border-oahl-border p-8 text-center text-sm text-oahl-textMuted">
                Run fetch to load capability inventory.
              </div>
            )}

            {devices.map((device) => {
              const isSelected = device.id === selectedDeviceId;
              return (
                <div
                  key={`${device.node_id}-${device.id}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedDeviceId(device.id);
                    setSelectedCapability(capabilityName(device.capabilities?.[0] || ''));
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedDeviceId(device.id);
                      setSelectedCapability(capabilityName(device.capabilities?.[0] || ''));
                    }
                  }}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    isSelected
                      ? 'border-oahl-accent bg-oahl-accent/10'
                      : 'border-oahl-border bg-oahl-surface hover:border-oahl-accent/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-sm font-semibold text-oahl-textMain">{device.id}</p>
                    <p className="text-xs uppercase tracking-wide text-oahl-textMuted">{device.type}</p>
                  </div>
                  <p className="mt-1 text-xs text-oahl-textMuted">{device.provider} · {device.node_id}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(device.capabilities || []).map((cap) => (
                      <button
                        key={`${device.id}-${capabilityName(cap)}`}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedDeviceId(device.id);
                          setSelectedCapability(capabilityName(cap));
                        }}
                        className={`rounded-full border px-2 py-1 text-[11px] transition ${
                          selectedCapability === capabilityName(cap)
                            ? 'border-oahl-accent bg-oahl-accent/20 text-oahl-accent'
                            : 'border-oahl-border text-oahl-textMain hover:border-oahl-accent/60'
                        }`}
                      >
                        {capabilityName(cap)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="panel p-5">
            <p className="mb-3 text-sm font-semibold">1) Request Session</p>
            <Field label="device_id" value={selectedDeviceId} onChange={setSelectedDeviceId} placeholder="camera-01" />
            <Field label="capability" value={selectedCapability} onChange={setSelectedCapability} placeholder="camera.capture" className="mt-3" />
            <Field label="node_id" value={selectedDevice?.node_id || ''} onChange={() => {}} disabled className="mt-3" />
            <button
              onClick={requestSession}
              disabled={requestingSession || !apiKey.trim() || !selectedCapability.trim()}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-oahl-tech bg-oahl-tech/20 px-4 py-2.5 text-sm font-semibold text-oahl-tech hover:bg-oahl-tech/30 disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              {requestingSession ? 'Requesting...' : 'Create Session'}
            </button>
          </div>

          <div className="panel p-5">
            <p className="mb-3 text-sm font-semibold">2) Execute Capability</p>
            <Field label="session_id" value={sessionId} onChange={setSessionId} placeholder="sess-abc123" />
            <div className="mt-3">
              <label className="mb-1 block text-xs font-mono uppercase tracking-wider text-oahl-textMuted">params (JSON)</label>
              <textarea
                value={executeParams}
                onChange={(e) => setExecuteParams(e.target.value)}
                className="input-field h-28 w-full rounded-xl px-3 py-2 font-mono text-xs"
              />
            </div>
            <button
              onClick={executeCapability}
              disabled={executing || !apiKey.trim() || !sessionId.trim()}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-oahl-accent bg-oahl-accent/20 px-4 py-2.5 text-sm font-semibold text-oahl-accent hover:bg-oahl-accent/30 disabled:opacity-50"
            >
              <Code2 className="h-4 w-4" />
              {executing ? 'Executing...' : 'Execute'}
            </button>
          </div>

          <div className="panel p-5">
            <p className="mb-3 text-sm font-semibold">3) Stop Session</p>
            <button
              onClick={stopSession}
              disabled={stopping || !apiKey.trim() || !sessionId.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-oahl-border bg-oahl-surface px-4 py-2.5 text-sm font-semibold text-oahl-textMain hover:border-oahl-accent disabled:opacity-50"
            >
              <Square className="h-4 w-4" />
              {stopping ? 'Stopping...' : 'Stop Session'}
            </button>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{actionError}</div>
      )}

      {executionResult && (
        <div className="panel p-5">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="h-4 w-4 text-oahl-tech" />
            Execution Result Envelope
          </p>
          <pre className="code-scroll overflow-auto text-xs text-oahl-textMuted">{JSON.stringify(executionResult, null, 2)}</pre>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <MiniInfo label="Cloud Auth" value="Bearer API key" />
        <MiniInfo label="Routing" value="device_id + optional node_id" />
        <MiniInfo label="Result Schema" value="oahl-execution-result v1.0" />
      </div>
    </section>
  );
}

function NavButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
        active ? 'bg-oahl-accent/20 text-oahl-accent border border-oahl-accent/40' : 'text-oahl-textMuted border border-transparent hover:border-oahl-border hover:text-oahl-textMain'
      }`}
    >
      {label}
    </button>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-card">
      <p className="stat-title">{label}</p>
      <p className="stat-value">{value}</p>
    </div>
  );
}

function FlowStep({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <div className="flow-step">{icon}{label}</div>;
}

function FlowConnector() {
  return (
    <div className="flow-link">
      <Activity className="h-4 w-4" />
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="api-card">
      <p className="text-xs text-oahl-textMuted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-oahl-textMain">{value}</p>
    </div>
  );
}

function ApiGroup({
  title,
  icon,
  endpoints
}: {
  title: string;
  icon: React.ReactNode;
  endpoints: Array<{ method: string; path: string; purpose: string }>;
}) {
  return (
    <div className="panel p-6">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">{icon}{title}</h3>
      <div className="space-y-3">
        {endpoints.map((endpoint) => (
          <div key={`${endpoint.method}-${endpoint.path}`} className="api-card">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-mono text-oahl-tech">{endpoint.method}</span>
              <span className="text-[11px] font-mono text-oahl-textMain">{endpoint.path}</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-oahl-textMuted">{endpoint.purpose}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  className = '',
  disabled = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-mono uppercase tracking-wider text-oahl-textMuted">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="input-field w-full rounded-xl px-3 py-2 text-sm disabled:opacity-70"
      />
    </div>
  );
}

export default App;
