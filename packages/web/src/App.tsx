import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Bot,
  CheckCircle2,
  Cloud,
  Code2,
  Database,
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

type Page = 'home' | 'about' | 'api-lab' | 'dashboard';
type CapabilityLike = string | { name?: string; description?: string; schema?: unknown };

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

interface RelayInfo {
  mode: string;
  requestId: string;
}


interface AiStepResult {
  step: number;
  capability: string;
  relayMode: string;
  requestId: string;
  status: 'success' | 'error';
  result?: ExecutionResult;
  error?: string;
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

function parseJsonFromText(value: string): any {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error('Empty model output');
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1].trim() : trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    const first = candidate.indexOf('{');
    const last = candidate.lastIndexOf('}');
    if (first >= 0 && last > first) {
      return JSON.parse(candidate.slice(first, last + 1));
    }
    throw new Error('Unable to parse JSON from model output');
  }
}

function detectPage(): Page {
  if (window.location.pathname.includes('about')) return 'about';
  if (window.location.pathname.includes('api-lab')) return 'api-lab';
  if (window.location.pathname.includes('dashboard')) return 'dashboard';
  return 'home';
}

function setPagePath(page: Page) {
  let path = '/';
  if (page === 'api-lab') path = '/api-lab';
  if (page === 'about') path = '/about';
  if (page === 'dashboard') path = '/dashboard';
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
            <NavButton active={page === 'about'} onClick={() => goToPage('about')} label="About" />
            <NavButton active={page === 'api-lab'} onClick={() => goToPage('api-lab')} label="API Lab" />
            <NavButton active={page === 'dashboard'} onClick={() => goToPage('dashboard')} label="Dashboard" />
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 pb-16 pt-10">
        {page === 'home' && <HomePage onOpenApiLab={() => goToPage('api-lab')} />}
        {page === 'about' && <AboutPage />}
        {page === 'api-lab' && <ApiLabPage />}
        {page === 'dashboard' && <DashboardPage />}
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

function AboutPage() {
  return (
    <article className="prose prose-oahl mx-auto max-w-3xl pt-10">
      <header className="mb-12">
        <div className="mb-4 flex items-center gap-3 text-sm font-mono text-oahl-textMuted uppercase tracking-widest">
          <span>March 14, 2026</span>
          <span className="h-1 w-1 rounded-full bg-oahl-border"></span>
          <span>Product Announcement</span>
        </div>
        <h1 className="mb-4 text-4xl font-semibold tracking-tight text-oahl-textMain md:text-5xl leading-tight">
          Introducing the Open Agent Hardware Layer
        </h1>
        <p className="text-xl leading-relaxed text-oahl-textMuted">
          A standard protocol to seamlessly connect AI agents to physical hardware, from lab test rigs to sensory networks.
        </p>
      </header>

      <div className="h-px w-full bg-oahl-border mb-12"></div>

      <p>
        AI agents represent the next major evolution in computing, moving from conversational interfaces to autonomous systems that reason and execute complex workflows. Yet, up to this point, the operational theater of these agents has been largely restricted to the digital world. They can write code, manipulate databases, and call APIs—but the exact moment an agent needs to turn a camera, read a spectrum analyzer, or interact with a mobile test board, the ecosystem collapses into bespoke, fragile integration scripts.
      </p>

      <p>
        Today, we are introducing the <strong>Open Agent Hardware Layer (OAHL)</strong>, an open-source standard and architecture designed to bridge the gap between AI agents and the physical world through a secure, uniform protocol.
      </p>

      <h3>The Hardware Integration Barrier</h3>
      <p>
        Currently, if a developer wants their agent to capture an image from a local USB camera and analyze it, they must write custom adapter code, manage driver dependencies, and insecurely expose local network endpoints to the cloud. When they try to scale this to hundreds of devices—or a mix of Android phones, Software Defined Radios (SDRs), and lab equipment—the overhead becomes entirely unmanageable.
      </p>
      <p>
        Hardware has no standard native prompt language. Different vendors use different transports (USB, RTSP, BLE, proprietary SDKs). Asking an AI model to navigate these physical topologies safely is a profound security and architectural risk.
      </p>

      <h3>A Standardized Protocol for the Physical World</h3>
      <p>
        OAHL solves this by replacing ad-hoc integration scripts with a formalized capability contract. The system treats physical devices not as IP addresses or USB ports, but as normalized semantic capabilities (<code>camera.capture</code>, <code>android.screen.tap</code>, <code>sdr.measure</code>) that agents can natively understand.
      </p>

      <p>The OAHL architecture enables four clear lifecycle phases:</p>
      <ul>
        <li><strong>Discover:</strong> Agents dynamically query the OAHL registry for hardware that satisfies specific capability requirements, regardless of where that hardware physically lives.</li>
        <li><strong>Reserve:</strong> The system enforces strictly isolated, lease-based hardware sessions, ensuring that two agents cannot collide and inadvertently mutate physical device state simultaneously.</li>
        <li><strong>Execute:</strong> A unified execution envelope normalizes requests—handling fast-path WebSocket relay and graceful polling fallbacks for heavily firewalled lab environments.</li>
        <li><strong>Release:</strong> Immediate tear-down of the session, releasing the hardware lock for the next intelligence workload.</li>
      </ul>

      <h3>Built for Enterprise Constraints</h3>
      <p>
        Unlike software, physical hardware exists in constrained, often highly secure network topologies. OAHL utilizes a <strong>Provider Node</strong> model. Hardware operators install a lightweight Node in their local lab or edge environment, which reaches <em>out</em> to the cloud registry. At no point do firewall ports need to be opened inbound.
      </p>

      <p>
        Furthermore, OAHL implements explicit ownership metadata and access control lists right at registration, allowing hardware owners to cryptographically sign exactly which agent identities or tenant organizations are permitted to claim a session on their physical toolchains.
      </p>

      <h3>Get Started</h3>
      <p>
        We believe that the next breakthrough in AI requires agents to interact with our reality. OAHL is available today. You can build provider nodes, write adapters for custom hardware, and begin routing agent workloads immediately.
      </p>
      <p>
        Read the documentation or explore the <code>@oahl/cli</code> on our <a href="https://github.com/fredabila/oahl" className="text-oahl-textMain underline decoration-oahl-border underline-offset-4 hover:decoration-oahl-textMain transition-all cursor-pointer">GitHub repository</a>.
      </p>
    </article>
  );
}

function HomePage({ onOpenApiLab }: { onOpenApiLab: () => void }) {
  return (
    <>
      <section className="aesthetic-hero panel relative overflow-hidden p-8 md:p-12 lg:p-14">
        <div className="relative z-10 grid items-end gap-10 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-oahl-border bg-oahl-surface px-3 py-1 text-xs font-mono text-oahl-accent">
              <Sparkles className="h-3.5 w-3.5" />
              Agent-native Hardware Platform
            </div>

            <h1 className="max-w-4xl text-4xl font-semibold leading-[1.02] tracking-tight md:text-6xl text-oahl-textMain">
              A standard protocol for
              <span className="block text-oahl-accent mt-1">real-world agent execution.</span>
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-relaxed text-oahl-textMuted md:text-lg">
              OAHL gives your agents one elegant interface to orchestrate cameras, radios, phones, and lab gear with
              isolation, policy, and deterministic routing built into the core lifecycle.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={onOpenApiLab} className="rounded-2xl bg-oahl-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-oahl-accentHover">
                Launch API Lab
              </button>
              <a href="https://github.com/fredabila/oahl" target="_blank" rel="noreferrer" className="rounded-2xl border border-oahl-border bg-black/30 px-5 py-2.5 text-sm font-semibold text-oahl-textMain transition-colors hover:border-oahl-accent">
                Explore Repository
              </a>
            </div>
          </div>

          <div className="hero-panel p-6 flex flex-col relative overflow-hidden">
            <div className="absolute top-[-50px] right-[-50px] h-[200px] w-[200px] bg-oahl-tech/5 blur-[80px] rounded-full pointer-events-none" />
            
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-oahl-tech relative z-10">
              <Waypoints className="h-4 w-4" />
              Live topology
            </h3>
            
            <div className="mt-8 flex flex-col relative z-10">
              <div className="absolute left-[15px] top-4 bottom-4 w-px bg-gradient-to-b from-oahl-tech/50 via-oahl-accent/50 to-oahl-tech/50" />
              
              <div className="flex items-center gap-4 relative py-3 group">
                <div className="flex items-center justify-center w-8 h-8 rounded-full border border-oahl-tech/30 bg-[#171615] z-10 transition-colors group-hover:border-oahl-tech shadow-[0_0_15px_rgba(115,149,128,0.1)] group-hover:shadow-[0_0_15px_rgba(115,149,128,0.3)]">
                  <Terminal className="h-4 w-4 text-oahl-tech" />
                </div>
                <div>
                  <div className="font-mono text-sm text-oahl-textMain">Agent SDK</div>
                  <div className="text-xs text-oahl-textMuted">Local Execution Context</div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 relative py-3 group">
                <div className="flex items-center justify-center w-8 h-8 rounded-full border border-oahl-accent/30 bg-[#171615] z-10 transition-colors group-hover:border-oahl-accent shadow-[0_0_15px_rgba(212,126,91,0.1)] group-hover:shadow-[0_0_15px_rgba(212,126,91,0.3)]">
                  <Cloud className="h-4 w-4 text-oahl-accent" />
                </div>
                <div>
                  <div className="font-mono text-sm text-oahl-textMain">Cloud Registry</div>
                  <div className="text-xs text-oahl-textMuted">Global Namespace Map</div>
                </div>
              </div>

              <div className="flex items-center gap-4 relative py-3 group">
                <div className="flex items-center justify-center w-8 h-8 rounded-full border border-oahl-tech/30 bg-[#171615] z-10 transition-colors group-hover:border-oahl-tech shadow-[0_0_15px_rgba(115,149,128,0.1)] group-hover:shadow-[0_0_15px_rgba(115,149,128,0.3)]">
                  <Server className="h-4 w-4 text-oahl-tech" />
                </div>
                <div>
                  <div className="font-mono text-sm text-oahl-textMain">Provider Node</div>
                  <div className="text-xs text-oahl-textMuted">Relay & Policy Engine</div>
                </div>
              </div>

              <div className="flex items-center gap-4 relative py-3 group">
                <div className="flex items-center justify-center w-8 h-8 rounded-full border border-oahl-accent/30 bg-[#171615] z-10 transition-colors group-hover:border-oahl-accent shadow-[0_0_15px_rgba(212,126,91,0.1)] group-hover:shadow-[0_0_15px_rgba(212,126,91,0.3)]">
                  <Layers className="h-4 w-4 text-oahl-accent" />
                </div>
                <div>
                  <div className="font-mono text-sm text-oahl-textMain">Adapter Base</div>
                  <div className="text-xs text-oahl-textMuted">Hardware Protocol</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-8 grid gap-3 md:grid-cols-3">
          <StatCard label="Device Families" value="Cameras · SDR · Android · Custom" />
          <StatCard label="Control Model" value="Discover · Reserve · Execute · Release" />
          <StatCard label="Relay Strategy" value="WebSocket Fast Path + Polling Fallback" />
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <div className="panel p-7">
          <h2 className="text-2xl font-semibold md:text-3xl">From hardware chaos to one operating model</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-oahl-textMuted md:text-base">
            OAHL replaces ad-hoc device scripts with a standards-first execution contract, so teams can scale from single benches to
            distributed hardware farms without rewriting agent orchestration each time a transport or vendor changes.
          </p>

          <div className="flow-rail mt-6">
            {FLOW_STEPS.map((step, index) => (
              <div key={step.title} className="flow-rail-node">
                <div className="flow-rail-index">{index + 1}</div>
                <p className="mt-3 text-sm font-semibold text-oahl-textMain">{step.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-oahl-textMuted">{step.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="panel p-7">
          <h3 className="text-lg font-semibold">Designed for serious operations</h3>
          <div className="mt-4 space-y-3 text-sm text-oahl-textMuted">
            <LandingFeatureCard icon={<ShieldCheck className="h-4 w-4 text-oahl-tech" />} title="Policy-aware access" detail="Owner visibility and allow/deny rules at device level." />
            <LandingFeatureCard icon={<Activity className="h-4 w-4 text-oahl-accent" />} title="Low-latency execution" detail="WS relay first, queue fallback if transport quality drops." />
            <LandingFeatureCard icon={<Database className="h-4 w-4 text-oahl-tech" />} title="Structured responses" detail="Execution Result envelope for predictable agent parsing." />
            <LandingFeatureCard icon={<Network className="h-4 w-4 text-oahl-accent" />} title="Scale-ready topology" detail="Register many nodes and route deterministically." />
          </div>
        </div>
      </section>

      <section className="mt-10 bento-grid">
        <div className="panel bento-main p-7">
          <p className="text-xs font-mono uppercase tracking-wider text-oahl-textMuted">Use Cases</p>
          <h3 className="mt-2 text-2xl font-semibold">Built for physical AI workloads</h3>
          <p className="mt-3 text-sm leading-relaxed text-oahl-textMuted">
            Run field diagnostics, automate inspections, control mobile test fleets, and operate distributed radio pipelines through a single cloud-native hardware interface.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <MiniInfo label="Vision Workflows" value="Capture, inspect, and route imagery" />
            <MiniInfo label="SDR Operations" value="Scan and diagnose RF environments" />
            <MiniInfo label="Mobile Automation" value="Android control for scripted validation" />
            <MiniInfo label="Lab Orchestration" value="Multi-node deterministic scheduling" />
          </div>
        </div>

        <div className="panel p-6">
          <p className="text-xs font-mono uppercase tracking-wider text-oahl-textMuted">Agent APIs</p>
          <div className="mt-4 space-y-2">
            {AGENT_ENDPOINTS.map((endpoint) => (
              <div key={`${endpoint.method}-${endpoint.path}`} className="api-line">
                <span className="text-xs font-mono text-oahl-textMuted">{endpoint.method}</span>
                <span className="text-xs font-mono text-oahl-textMain">{endpoint.path}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel p-6">
          <p className="text-xs font-mono uppercase tracking-wider text-oahl-textMuted">Provider APIs</p>
          <div className="mt-4 space-y-2">
            {PROVIDER_ENDPOINTS.map((endpoint) => (
              <div key={`${endpoint.method}-${endpoint.path}`} className="api-line">
                <span className="text-xs font-mono text-oahl-textMuted">{endpoint.method}</span>
                <span className="text-xs font-mono text-oahl-textMain">{endpoint.path}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel p-6">
          <p className="text-xs font-mono uppercase tracking-wider text-oahl-textMuted">Node APIs</p>
          <div className="mt-4 space-y-2">
            {LOCAL_ENDPOINTS.map((endpoint) => (
              <div key={`${endpoint.method}-${endpoint.path}`} className="api-line">
                <span className="text-xs font-mono text-oahl-textMuted">{endpoint.method}</span>
                <span className="text-xs font-mono text-oahl-textMain">{endpoint.path}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-10 cta-band panel overflow-hidden p-8 md:p-10">
        <div className="relative z-10 flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-oahl-textMuted">Start Building</p>
            <h2 className="mt-2 max-w-2xl text-3xl font-semibold leading-tight">
              Upgrade from fragile hardware scripts to a clean agent platform.
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-oahl-textMuted">
              Keep your adapter ecosystem, enforce policy centrally, and evolve transport layers without changing agent business logic.
            </p>
          </div>

          <div className="flex w-full flex-wrap gap-3 lg:w-auto">
            <button onClick={onOpenApiLab} className="rounded-2xl bg-oahl-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-oahl-accentHover">
              Open API Lab
            </button>
            <a href="https://github.com/fredabila/oahl" target="_blank" rel="noreferrer" className="rounded-2xl border border-oahl-border px-5 py-2.5 text-sm font-semibold text-oahl-textMain transition-colors hover:border-oahl-accent">
              Read Documentation
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

function ApiLabPage() {
  const [cloudUrl, setCloudUrl] = useState('https://oahl.onrender.com');
  const [apiKey, setApiKey] = useState('');
  const [llmUrl, setLlmUrl] = useState('https://api.openai.com/v1');
  const [llmApiKey, setLlmApiKey] = useState('');
  const [llmModel, setLlmModel] = useState('gpt-4o-mini');
  const [aiPrompt, setAiPrompt] = useState('Take a screenshot from my Android device and return metadata.');
  const [aiExecutionSummary, setAiExecutionSummary] = useState('');
  const [aiPlanOnlyMode, setAiPlanOnlyMode] = useState(false);
  const [aiPlanJson, setAiPlanJson] = useState('');
  const [aiStepResults, setAiStepResults] = useState<AiStepResult[]>([]);

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
  const [relayInfo, setRelayInfo] = useState<RelayInfo | null>(null);

  const [loadingCapabilities, setLoadingCapabilities] = useState(false);
  const [requestingSession, setRequestingSession] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [aiRunning, setAiRunning] = useState(false);
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
      setRelayInfo(null);
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
      setRelayInfo({
        mode: res.headers.get('x-oahl-relay-mode') || 'unknown',
        requestId: res.headers.get('x-oahl-request-id') || ''
      });
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
      setRelayInfo(null);
    } catch (err: any) {
      setActionError(err?.message || 'Unable to stop session');
    } finally {
      setStopping(false);
    }
  }

  async function runAiExecution() {
    if (!apiKey.trim()) {
      setActionError('Agent API key is required.');
      return;
    }
    if (!llmApiKey.trim()) {
      setActionError('LLM API key is required.');
      return;
    }
    if (!aiPrompt.trim()) {
      setActionError('Describe the action you want hardware to execute.');
      return;
    }

    setActionError('');
    setAiExecutionSummary('');
    setAiPlanJson('');
    setAiStepResults([]);
    setAiRunning(true);

    let currentSessionId = '';
    let currentDeviceId = '';

    try {
      let inventory = devices;
      if (inventory.length === 0) {
        const capsResponse = await fetch(buildCapabilitiesUrl(), { method: 'GET', headers: bearerHeaders(false) });
        if (!capsResponse.ok) throw new Error((await capsResponse.text()) || 'Failed to fetch capabilities for AI execution');
        const capsData = (await capsResponse.json()) as CapabilitiesResponse;
        inventory = Array.isArray(capsData.devices) ? capsData.devices : [];
        setDevices(inventory);
      }

      if (inventory.length === 0) {
        throw new Error('No devices available. Fetch capabilities first or ensure hardware is online.');
      }

      const capabilityCatalog = inventory.slice(0, 30).map((device) => ({
        device_id: device.id,
        type: device.type,
        node_id: device.node_id,
        capabilities: (device.capabilities || []).map((cap) => ({
          name: capabilityName(cap),
          description: typeof cap === 'string' ? '' : cap.description || '',
          schema: typeof cap === 'string' ? undefined : cap.schema
        }))
      }));

      const messages: any[] = [
        {
          role: 'system',
          content: 'You are an autonomous hardware orchestration agent. You have access to the following devices and capabilities:\n' + JSON.stringify(capabilityCatalog) + '\n\nAt each step, decide to either execute a capability or complete the task. Return STRICTLY JSON (no markdown) with keys:\n- "action" (string: "execute" or "done")\n- "rationale" (string: your reasoning)\n- "device_id" (string: if executing)\n- "capability" (string: if executing)\n- "params" (object: if executing)\n- "final_summary" (string: if done).'
        },
        {
          role: 'user',
          content: aiPrompt.trim()
        }
      ];

      const sequenceResults: AiStepResult[] = [];
      let stepCount = 0;
      const MAX_STEPS = 8;
      let finalSummary = '';

      while (stepCount < MAX_STEPS) {
        stepCount++;
        
        const llmResponse = await fetch(`${llmUrl.replace(/\/$/, '')}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${llmApiKey.trim()}`
          },
          body: JSON.stringify({
            model: llmModel.trim(),
            temperature: 0.1,
            messages
          })
        });

        if (!llmResponse.ok) throw new Error((await llmResponse.text()) || 'LLM planning failed');
        const llmData = await llmResponse.json();
        const rawMessage = llmData?.choices?.[0]?.message?.content;
        
        if (!rawMessage) throw new Error('LLM did not return a usable response');
        
        messages.push({ role: 'assistant', content: rawMessage });
        
        const actionPayload = parseJsonFromText(rawMessage);
        
        // UI Debug: Update the live plan JSON state to show the latest LLM thought process
        setAiPlanJson(JSON.stringify(actionPayload, null, 2));

        const actionType = actionPayload?.action || 'done';
        
        if (actionType === 'done') {
          finalSummary = actionPayload.final_summary || actionPayload.rationale || 'Task completed via AI orchestration.';
          break;
        }

        if (actionType === 'execute') {
          const targetDeviceId = String(actionPayload.device_id || '').trim();
          const targetCapability = String(actionPayload.capability || '').trim();
          const targetParams = actionPayload.params || {};
          
          if (!targetDeviceId || !targetCapability) {
             throw new Error('LLM attempted to execute without device_id or capability');
          }

          // Request new hardware session if device changed or if none active
          if (targetDeviceId !== currentDeviceId || !currentSessionId) {
             if (currentSessionId) {
               try { await fetch(`${cloudUrl}/v1/sessions/${currentSessionId}/stop`, { method: 'POST', headers: bearerHeaders(false) }); } catch (e) {}
             }
             
             const targetDeviceObj = inventory.find((d) => d.id === targetDeviceId);
             const requestPayload: Record<string, string> = { capability: targetCapability, device_id: targetDeviceId };
             if (targetDeviceObj?.node_id) requestPayload.node_id = targetDeviceObj.node_id;

             const requestRes = await fetch(`${cloudUrl}/v1/requests`, {
               method: 'POST',
               headers: bearerHeaders(true),
               body: JSON.stringify(requestPayload)
             });
             
             if (!requestRes.ok) throw new Error(`Unable to request session for ${targetDeviceId}: ` + await requestRes.text());
             const requestData = (await requestRes.json()) as SessionResponse;
             currentSessionId = requestData.session_id || '';
             currentDeviceId = targetDeviceId;
             
             setSessionId(currentSessionId);
             setSelectedDeviceId(currentDeviceId);
          }

          setSelectedCapability(targetCapability);
          setExecuteParams(JSON.stringify(targetParams, null, 2));

          if (aiPlanOnlyMode) {
             setAiExecutionSummary(`Plan mode active: First suggested action is ${targetCapability} on ${targetDeviceId}. Run without plan mode to orchestrate fully.`);
             break;
          }

          // Fire the physical capability
          const execRes = await fetch(`${cloudUrl}/v1/sessions/${currentSessionId}/execute`, {
            method: 'POST',
            headers: bearerHeaders(true),
            body: JSON.stringify({ capability: targetCapability, params: targetParams })
          });

          const relayMode = execRes.headers.get('x-oahl-relay-mode') || 'unknown';
          const requestId = execRes.headers.get('x-oahl-request-id') || '';

          // Allow the LLM to recover from execution errors!
          if (!execRes.ok) {
            const errorText = (await execRes.text()) || 'Execute failed';
            sequenceResults.push({ step: stepCount, capability: targetCapability, relayMode, requestId, status: 'error', error: errorText });
            setAiStepResults([...sequenceResults]);
            
            messages.push({ role: 'user', content: `Execution failed with HTTP ${execRes.status}: ${errorText}\nAdjust your strategy and try again, or finish if recovery is impossible.` });
            continue;
          }

          const execData = (await execRes.json()) as ExecutionResult;
          sequenceResults.push({ step: stepCount, capability: targetCapability, relayMode, requestId, status: 'success', result: execData });
          
          setExecutionResult(execData);
          setRelayInfo({ mode: relayMode, requestId });
          setAiStepResults([...sequenceResults]);

          // Feed result back into the Agent Orchestration Loop!
          messages.push({ role: 'user', content: `Execution Result from device:\n${JSON.stringify(execData)}\nWhat is the next action?` });
        }
      }
      
      if (stepCount >= MAX_STEPS) {
         setAiExecutionSummary('Agent loop reached maximum step limit (' + MAX_STEPS + '). ' + finalSummary);
      } else {
         setAiExecutionSummary(finalSummary || 'Agent orchestration completed successfully.');
      }
      
    } catch (err: any) {
      setActionError(err?.message || 'AI execution orchestration failed');
    } finally {
      if (currentSessionId) {
        try {
          await fetch(`${cloudUrl}/v1/sessions/${currentSessionId}/stop`, { method: 'POST', headers: bearerHeaders(false) });
        } catch {}
        setSessionId('');
      }
      setAiRunning(false);
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

        <div className="mt-6 rounded-2xl border border-oahl-tech/40 bg-oahl-tech/10 p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-oahl-tech">
            <Bot className="h-4 w-4" />
            AI Execute (Hardware Skill Flow)
          </p>
          <p className="mt-1 text-xs text-oahl-textMuted">Prompt in plain English. The model picks device + capability + params, then runs discover → reserve → execute → stop automatically.</p>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Field label="LLM URL" value={llmUrl} onChange={setLlmUrl} placeholder="https://api.openai.com/v1" />
            <Field label="LLM Model" value={llmModel} onChange={setLlmModel} placeholder="gpt-4o-mini" />
            <Field label="LLM API Key" value={llmApiKey} onChange={setLlmApiKey} placeholder="sk-..." />
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-xs font-mono uppercase tracking-wider text-oahl-textMuted">Prompt</label>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className="input-field h-24 w-full rounded-xl px-3 py-2 text-sm"
              placeholder="Example: Take a screenshot from my Android test device and return the file path."
            />
          </div>

          <label className="mt-3 inline-flex items-center gap-2 text-xs text-oahl-textMuted">
            <input
              type="checkbox"
              checked={aiPlanOnlyMode}
              onChange={(e) => setAiPlanOnlyMode(e.target.checked)}
              className="h-4 w-4 rounded border-oahl-border bg-oahl-surface"
            />
            Plan only (do not create session or execute hardware)
          </label>

          <button
            onClick={runAiExecution}
            disabled={aiRunning || !apiKey.trim() || !llmApiKey.trim()}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-oahl-tech bg-oahl-tech/20 px-4 py-2.5 text-sm font-semibold text-oahl-tech hover:bg-oahl-tech/30 disabled:opacity-50"
          >
            <Bot className="h-4 w-4" />
            {aiRunning ? 'Planning + Executing...' : aiPlanOnlyMode ? 'Generate Plan' : 'Run Prompt'}
          </button>

          {aiExecutionSummary && (
            <div className="mt-3 rounded-xl border border-oahl-border bg-oahl-surface px-3 py-2 text-xs text-oahl-textMuted">
              {aiExecutionSummary}
            </div>
          )}

          {aiPlanJson && (
            <div className="mt-3">
              <p className="mb-1 text-xs font-mono uppercase tracking-wider text-oahl-textMuted">AI Plan JSON</p>
              <pre className="code-scroll overflow-auto rounded-xl border border-oahl-border bg-oahl-surface px-3 py-2 text-xs text-oahl-textMuted">{aiPlanJson}</pre>
            </div>
          )}

          {aiStepResults.length > 0 && (
            <div className="mt-3">
              <p className="mb-1 text-xs font-mono uppercase tracking-wider text-oahl-textMuted">Sequence Execution</p>
              <div className="space-y-2">
                {aiStepResults.map((stepResult) => (
                  <div key={`${stepResult.step}-${stepResult.requestId || stepResult.capability}`} className="rounded-xl border border-oahl-border bg-oahl-surface px-3 py-2 text-xs text-oahl-textMuted">
                    <p className="font-semibold text-oahl-textMain">
                      Step {stepResult.step}: {stepResult.capability} · {stepResult.status}
                    </p>
                    <p>Relay: {stepResult.relayMode}{stepResult.requestId ? ` · Request: ${stepResult.requestId}` : ''}</p>
                    {stepResult.error && <p className="text-red-300">{stepResult.error}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
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
          {relayInfo && (
            <div className="mb-3 rounded-xl border border-oahl-border bg-oahl-surface px-3 py-2 text-xs text-oahl-textMuted">
              Relay mode: <span className="font-semibold text-oahl-textMain">{relayInfo.mode}</span>
              {relayInfo.requestId ? ` · Request ID: ${relayInfo.requestId}` : ''}
            </div>
          )}
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

function LandingFeatureCard({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return (
    <div className="landing-feature">
      <div className="mb-2 inline-flex items-center justify-center rounded-lg border border-oahl-border/70 bg-black/40 p-1.5">
        {icon}
      </div>
      <p className="text-xs font-semibold text-oahl-textMain">{title}</p>
      <p className="mt-1 text-[11px] text-oahl-textMuted">{detail}</p>
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

function DashboardPage() {
  const [cloudUrl, setCloudUrl] = useState('https://oahl.onrender.com');
  const [adminKey, setAdminKey] = useState('');
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentOrg, setNewAgentOrg] = useState('');
  const [fundAmount, setFundAmount] = useState('50');

  async function fetchAgents() {
    if (!adminKey) return setError('Admin API key required');
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${cloudUrl}/v1/admin/agents`, {
        headers: { Authorization: `Bearer ${adminKey}` }
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setAgents(data.agents || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch agents');
    } finally {
      setLoading(false);
    }
  }

  async function createAgent() {
    if (!adminKey) return setError('Admin API key required');
    setError('');
    try {
      const res = await fetch(`${cloudUrl}/v1/admin/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminKey}`
        },
        body: JSON.stringify({
          name: newAgentName || 'Unnamed Agent',
          org_id: newAgentOrg || 'default-org',
          initial_balance: 0
        })
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchAgents();
      setNewAgentName('');
      setNewAgentOrg('');
    } catch (err: any) {
      setError(err.message || 'Failed to create agent');
    }
  }

  async function fundAgent(key: string) {
    if (!adminKey) return setError('Admin API key required');
    const amount = parseFloat(fundAmount);
    if (isNaN(amount) || amount <= 0) return setError('Invalid fund amount');
    
    setError('');
    try {
      const res = await fetch(`${cloudUrl}/v1/admin/agents/${key}/fund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminKey}`
        },
        body: JSON.stringify({ amount })
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchAgents();
    } catch (err: any) {
      setError(err.message || 'Failed to fund agent');
    }
  }

  return (
    <section className="space-y-6">
      <div className="panel p-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Marketplace Dashboard</h1>
          <p className="mt-2 text-sm text-oahl-textMuted">Manage AI agent wallets and provision access keys.</p>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-5">
          <Field label="Cloud URL" value={cloudUrl} onChange={setCloudUrl} placeholder="https://oahl.onrender.com" className="xl:col-span-2" />
          <Field label="Admin API Key" value={adminKey} onChange={setAdminKey} placeholder="admin123" className="xl:col-span-2" />
          <button
            onClick={fetchAgents}
            disabled={loading || !adminKey.trim()}
            className="h-[46px] self-end rounded-xl border border-oahl-accent bg-oahl-accent px-4 text-sm font-semibold text-white transition hover:bg-oahl-accentHover disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load Agents'}
          </button>
        </div>
        {error && <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <div className="panel p-6 h-fit">
          <h3 className="text-lg font-semibold mb-4">Provision New Agent</h3>
          <Field label="Agent Name" value={newAgentName} onChange={setNewAgentName} placeholder="E.g. QA Testing Bot" />
          <Field label="Organization ID" value={newAgentOrg} onChange={setNewAgentOrg} placeholder="tenant-xyz" className="mt-4" />
          <button
            onClick={createAgent}
            disabled={!adminKey.trim()}
            className="mt-6 w-full rounded-xl border border-oahl-tech bg-oahl-tech/20 px-4 py-2.5 text-sm font-semibold text-oahl-tech hover:bg-oahl-tech/30 disabled:opacity-50"
          >
            Generate Key
          </button>
        </div>

        <div className="panel p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Active Agent Wallets</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-oahl-textMuted">Fund amount:</span>
              <input 
                type="number" 
                value={fundAmount} 
                onChange={(e) => setFundAmount(e.target.value)} 
                className="w-20 rounded-lg bg-black/30 border border-oahl-border px-2 py-1 text-xs" 
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-oahl-border text-oahl-textMuted text-xs uppercase tracking-wider">
                  <th className="pb-3 font-medium">Agent</th>
                  <th className="pb-3 font-medium">API Key</th>
                  <th className="pb-3 font-medium">Balance</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-oahl-border/50">
                {agents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-oahl-textMuted italic">No agents found.</td>
                  </tr>
                ) : (
                  agents.map((agent) => (
                    <tr key={agent.key} className="group hover:bg-white/5 transition-colors">
                      <td className="py-3">
                        <div className="font-medium text-oahl-textMain">{agent.name}</div>
                        <div className="text-xs text-oahl-textMuted font-mono">{agent.org_id}</div>
                      </td>
                      <td className="py-3">
                        <code className="rounded bg-black/40 px-1.5 py-0.5 text-xs text-oahl-tech">{agent.key}</code>
                      </td>
                      <td className="py-3 font-mono">
                        ${(agent.balance || 0).toFixed(2)}
                      </td>
                      <td className="py-3 text-right">
                        <button 
                          onClick={() => fundAgent(agent.key)}
                          className="rounded-lg bg-oahl-accent/20 px-3 py-1 text-xs font-medium text-oahl-accent hover:bg-oahl-accent/30 transition-colors"
                        >
                          + Fund
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

export default App;
