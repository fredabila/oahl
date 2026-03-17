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
        <div className="mx-auto flex flex-col md:flex-row h-auto md:h-16 items-center justify-between gap-4 py-4 md:py-0 px-6">
          <button onClick={() => goToPage('home')} className="flex items-center gap-3 text-left w-full justify-center md:w-auto md:justify-start">
            <div className="flex shrink-0 h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-oahl-accent to-oahl-accentHover text-white font-mono font-bold shadow-lg shadow-oahl-accent/20">
              OA
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide">OPEN AGENT HARDWARE LAYER</p>
              <p className="text-xs text-oahl-textMuted">Sleek platform experience</p>
            </div>
          </button>

          <nav className="flex flex-wrap items-center justify-center gap-2 text-sm">
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
      {/* ═══════════════════ HERO ═══════════════════ */}
      <section className="relative overflow-hidden rounded-3xl">
        {/* Floating orbs */}
        <div className="orb orb-accent w-[400px] h-[400px] -top-40 -left-40" />
        <div className="orb orb-tech w-[300px] h-[300px] -bottom-20 -right-20" style={{ animationDelay: '-4s' }} />
        <div className="orb orb-accent w-[200px] h-[200px] top-1/2 right-1/4" style={{ animationDelay: '-8s' }} />
        <div className="grid-overlay" />

        <div className="relative z-10 py-16 md:py-24 px-8 md:px-14">
          {/* Announcement pill */}
          <div className="flex justify-center mb-8">
            <div className="gradient-border">
              <div className="inline-flex items-center gap-2.5 rounded-[19px] bg-oahl-bg/90 backdrop-blur-md px-4 py-2 text-xs font-mono">
                <span className="inline-flex items-center gap-1.5 text-oahl-accent font-semibold">
                  <Sparkles className="h-3.5 w-3.5" />
                  New
                </span>
                <span className="h-3 w-px bg-oahl-border" />
                <span className="text-oahl-textMuted">Open-source hardware protocol for AI agents</span>
              </div>
            </div>
          </div>

          {/* Headline */}
          <div className="text-center max-w-4xl mx-auto stagger-children">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95]">
              <span className="text-oahl-textMain">Give your agents</span>
              <br />
              <span className="shimmer-text">real-world hands.</span>
            </h1>

            <p className="mt-8 text-lg md:text-xl text-oahl-textMuted max-w-2xl mx-auto leading-relaxed">
              One protocol to discover, reserve, execute, and release physical hardware — 
              cameras, phones, radios, lab gear — with policy and isolation built in.
            </p>

            {/* CTA buttons */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={onOpenApiLab}
                className="group relative rounded-2xl bg-oahl-accent px-7 py-3.5 text-sm font-semibold text-white transition-all hover:bg-oahl-accentHover hover:shadow-[0_0_30px_rgba(212,126,91,0.3)] hover:scale-[1.02] active:scale-[0.98]"
              >
                Launch API Lab
                <span className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <a
                href="https://github.com/fredabila/oahl"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl border border-oahl-border bg-oahl-surface/50 backdrop-blur-sm px-7 py-3.5 text-sm font-semibold text-oahl-textMain transition-all hover:border-oahl-accent hover:bg-oahl-surface"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                Star on GitHub
              </a>
            </div>
          </div>

          {/* Terminal mockup */}
          <div className="mt-16 max-w-3xl mx-auto">
            <div className="terminal-mockup">
              <div className="terminal-titlebar">
                <div className="terminal-dot red" />
                <div className="terminal-dot yellow" />
                <div className="terminal-dot green" />
                <span className="ml-3 text-xs text-oahl-textMuted font-mono">agent-session.ts</span>
              </div>
              <div className="terminal-code">
                <div><span className="hl-comment">{'// Discover available hardware'}</span></div>
                <div><span className="hl-keyword">const</span> <span className="hl-var">devices</span> <span className="hl-method">= await</span> <span className="hl-method">oahl</span>.<span className="hl-method">capabilities</span>({'{'} <span className="hl-method">type</span>: <span className="hl-string">'android'</span> {'}'});</div>
                <div>&nbsp;</div>
                <div><span className="hl-comment">{'// Reserve a hardware session'}</span></div>
                <div><span className="hl-keyword">const</span> <span className="hl-var">session</span> <span className="hl-method">= await</span> <span className="hl-method">oahl</span>.<span className="hl-method">request</span>({'{'}</div>
                <div>  <span className="hl-method">capability</span>: <span className="hl-string">'screen.capture'</span>,</div>
                <div>  <span className="hl-method">device_id</span>:  <span className="hl-string">'pixel-7-lab-01'</span></div>
                <div>{'}'});</div>
                <div>&nbsp;</div>
                <div><span className="hl-comment">{'// Execute and get structured results'}</span></div>
                <div><span className="hl-keyword">const</span> <span className="hl-var">result</span> <span className="hl-method">= await</span> <span className="hl-method">session</span>.<span className="hl-method">execute</span>(<span className="hl-string">'screen.capture'</span>);</div>
                <div><span className="hl-method">console</span>.<span className="hl-method">log</span>(<span className="hl-var">result</span>.<span className="hl-method">data</span>.<span className="hl-method">image_path</span>); <span className="hl-comment">{'// → /captures/pixel7_001.png'}</span></div>
                <div>&nbsp;</div>
                <div><span className="hl-keyword">await</span> <span className="hl-method">session</span>.<span className="hl-method">stop</span>(); <span className="hl-comment typing-cursor">{'// Hardware released'}</span></div>
              </div>
            </div>
          </div>

          {/* Trust indicators */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-oahl-textMuted font-mono">
            <span className="inline-flex items-center gap-2"><div className="glow-dot" />Open Source</span>
            <span className="inline-flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-oahl-tech" />Bearer-Secured</span>
            <span className="inline-flex items-center gap-2"><Waypoints className="h-3.5 w-3.5 text-oahl-accent" />WebSocket + Polling Relay</span>
            <span className="inline-flex items-center gap-2"><Layers className="h-3.5 w-3.5 text-oahl-tech" />Transport Agnostic</span>
          </div>
        </div>
      </section>

      {/* ═══════════════════ HOW IT WORKS ═══════════════════ */}
      <section className="mt-20 relative">
        <div className="text-center mb-12">
          <p className="text-xs font-mono uppercase tracking-wider text-oahl-accent">How it works</p>
          <h2 className="mt-3 text-3xl md:text-5xl font-bold tracking-tight">From hardware chaos<br /><span className="text-oahl-textMuted">to one operating model.</span></h2>
          <p className="mt-4 text-sm text-oahl-textMuted max-w-lg mx-auto">
            Four lifecycle phases. One execution contract. Infinite hardware scale.
          </p>
        </div>

        {/* Horizontal connected pipeline */}
        <div className="relative max-w-5xl mx-auto">
          {/* Connecting line behind cards */}
          <div className="hidden lg:block absolute top-[52px] left-[12%] right-[12%] h-px">
            <div className="h-full bg-gradient-to-r from-oahl-accent via-oahl-tech to-oahl-accent opacity-30" />
            <div className="absolute inset-0 h-full bg-gradient-to-r from-oahl-accent via-oahl-tech to-oahl-accent opacity-60 blur-sm" />
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {FLOW_STEPS.map((step, index) => (
              <div key={step.title} className="glass-card p-6 text-center group relative">
                {/* Step number with glow */}
                <div className="relative inline-flex mx-auto">
                  <div className="w-[44px] h-[44px] rounded-2xl bg-gradient-to-br from-oahl-accent to-oahl-accentHover flex items-center justify-center text-white font-mono font-bold text-lg shadow-lg shadow-oahl-accent/20 group-hover:shadow-oahl-accent/40 transition-shadow">
                    {index + 1}
                  </div>
                </div>
                <h3 className="mt-4 text-base font-bold text-oahl-textMain">{step.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-oahl-textMuted">{step.detail}</p>
                {/* Endpoint badge */}
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-oahl-accent/5 border border-oahl-accent/10 px-2.5 py-1 text-[10px] font-mono text-oahl-accent">
                  {index === 0 && 'GET /v1/capabilities'}
                  {index === 1 && 'POST /v1/requests'}
                  {index === 2 && 'POST /sessions/:id/execute'}
                  {index === 3 && 'POST /sessions/:id/stop'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ ARCHITECTURE ═══════════════════ */}
      <section className="mt-20 panel relative overflow-hidden p-8 md:p-12 rounded-3xl">
        <div className="orb orb-accent w-[300px] h-[300px] -top-32 -right-32 opacity-40" />
        <div className="orb orb-tech w-[200px] h-[200px] -bottom-20 -left-20 opacity-30" style={{ animationDelay: '-5s' }} />
        <div className="grid-overlay" />

        <div className="relative z-10">
          <div className="text-center mb-10">
            <p className="text-xs font-mono uppercase tracking-wider text-oahl-tech">System Architecture</p>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">The full stack, <span className="shimmer-text">visualized.</span></h2>
          </div>

          {/* Layered architecture diagram */}
          <div className="max-w-4xl mx-auto space-y-3">
            {/* Layer 1: Agent */}
            <div className="glass-card p-5 group">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="flex items-center gap-3 min-w-[200px]">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-oahl-tech/10 border border-oahl-tech/20 group-hover:bg-oahl-tech/20 transition-colors">
                    <Terminal className="h-5 w-5 text-oahl-tech" />
                  </div>
                  <div>
                    <div className="font-mono text-sm font-semibold text-oahl-textMain">Agent SDK</div>
                    <div className="text-[11px] text-oahl-textMuted">Your AI agent</div>
                  </div>
                </div>
                <div className="hidden md:flex items-center flex-1 justify-center">
                  <div className="flex items-center gap-2 text-[10px] font-mono text-oahl-textMuted">
                    <span className="px-2 py-0.5 rounded bg-oahl-tech/10 text-oahl-tech">capabilities()</span>
                    <span className="text-oahl-tech">→</span>
                    <span className="px-2 py-0.5 rounded bg-oahl-tech/10 text-oahl-tech">request()</span>
                    <span className="text-oahl-tech">→</span>
                    <span className="px-2 py-0.5 rounded bg-oahl-tech/10 text-oahl-tech">execute()</span>
                    <span className="text-oahl-tech">→</span>
                    <span className="px-2 py-0.5 rounded bg-oahl-tech/10 text-oahl-tech">stop()</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Animated connector */}
            <div className="flex justify-center">
              <div className="w-px h-6 bg-gradient-to-b from-oahl-tech/40 to-oahl-accent/40 relative">
                <div className="absolute -left-[3px] bottom-0 w-[7px] h-[7px] rounded-full bg-oahl-accent/60 animate-ping-slow" />
              </div>
            </div>

            {/* Layer 2: Cloud */}
            <div className="glass-card p-5 group border-oahl-accent/20">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="flex items-center gap-3 min-w-[200px]">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-oahl-accent/10 border border-oahl-accent/20 group-hover:bg-oahl-accent/20 transition-colors">
                    <Cloud className="h-5 w-5 text-oahl-accent" />
                  </div>
                  <div>
                    <div className="font-mono text-sm font-semibold text-oahl-textMain">Cloud Registry</div>
                    <div className="text-[11px] text-oahl-textMuted">Global namespace & relay</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 flex-1 justify-center">
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-oahl-border/50 text-[10px] font-mono text-oahl-textMuted">
                    <ShieldCheck className="h-3 w-3 text-oahl-tech" /> Bearer auth
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-oahl-border/50 text-[10px] font-mono text-oahl-textMuted">
                    <Activity className="h-3 w-3 text-oahl-accent" /> WS relay
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-oahl-border/50 text-[10px] font-mono text-oahl-textMuted">
                    <Database className="h-3 w-3 text-oahl-tech" /> Session store
                  </span>
                </div>
              </div>
            </div>

            {/* Animated connector */}
            <div className="flex justify-center">
              <div className="w-px h-6 bg-gradient-to-b from-oahl-accent/40 to-oahl-tech/40 relative">
                <div className="absolute -left-[3px] bottom-0 w-[7px] h-[7px] rounded-full bg-oahl-tech/60 animate-ping-slow" style={{ animationDelay: '-1s' }} />
              </div>
            </div>

            {/* Layer 3: Node */}
            <div className="glass-card p-5 group">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="flex items-center gap-3 min-w-[200px]">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-oahl-tech/10 border border-oahl-tech/20 group-hover:bg-oahl-tech/20 transition-colors">
                    <Server className="h-5 w-5 text-oahl-tech" />
                  </div>
                  <div>
                    <div className="font-mono text-sm font-semibold text-oahl-textMain">Provider Node</div>
                    <div className="text-[11px] text-oahl-textMuted">Edge relay & policy engine</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 flex-1 justify-center">
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-oahl-border/50 text-[10px] font-mono text-oahl-textMuted">
                    <Network className="h-3 w-3 text-oahl-accent" /> NAT traversal
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-oahl-border/50 text-[10px] font-mono text-oahl-textMuted">
                    <Waypoints className="h-3 w-3 text-oahl-tech" /> Outbound-only
                  </span>
                </div>
              </div>
            </div>

            {/* Animated connector */}
            <div className="flex justify-center">
              <div className="w-px h-6 bg-gradient-to-b from-oahl-tech/40 to-oahl-accent/40 relative">
                <div className="absolute -left-[3px] bottom-0 w-[7px] h-[7px] rounded-full bg-oahl-accent/60 animate-ping-slow" style={{ animationDelay: '-2s' }} />
              </div>
            </div>

            {/* Layer 4: Adapters */}
            <div className="glass-card p-5 group">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="flex items-center gap-3 min-w-[200px]">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-oahl-accent/10 border border-oahl-accent/20 group-hover:bg-oahl-accent/20 transition-colors">
                    <Layers className="h-5 w-5 text-oahl-accent" />
                  </div>
                  <div>
                    <div className="font-mono text-sm font-semibold text-oahl-textMain">Adapter Layer</div>
                    <div className="text-[11px] text-oahl-textMuted">Hardware protocol bridge</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 flex-1 justify-center">
                  {['USB Camera', 'Android/ADB', 'RTL-SDR', 'Arduino', 'Custom'].map((adapter) => (
                    <span key={adapter} className="px-2 py-1 rounded-lg bg-oahl-accent/5 border border-oahl-accent/10 text-[10px] font-mono text-oahl-accent">
                      {adapter}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ USE CASES BENTO ═══════════════════ */}
      <section className="mt-16">
        <div className="text-center mb-10">
          <p className="text-xs font-mono uppercase tracking-wider text-oahl-accent">Use Cases</p>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">Built for <span className="shimmer-text">physical AI workloads</span></h2>
          <p className="mt-3 text-sm text-oahl-textMuted max-w-lg mx-auto">
            Run field diagnostics, automate mobile testing, control lab equipment, and operate distributed radio pipelines.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 stagger-children">
          {[
            { icon: <Bot className="h-5 w-5" />, title: 'Vision Workflows', detail: 'Capture, inspect, and route imagery from any connected camera in your lab.' },
            { icon: <Activity className="h-5 w-5" />, title: 'SDR Operations', detail: 'Scan, measure, and diagnose RF environments through software-defined radios.' },
            { icon: <Sparkles className="h-5 w-5" />, title: 'Mobile Automation', detail: 'Android and iOS device control for scripted QA validation flows.' },
            { icon: <Network className="h-5 w-5" />, title: 'Lab Orchestration', detail: 'Multi-node deterministic scheduling for complex hardware pipelines.' },
          ].map((useCase) => (
            <div key={useCase.title} className="glass-card p-6 group cursor-default">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-oahl-accent/10 text-oahl-accent border border-oahl-accent/20 group-hover:bg-oahl-accent/20 transition-colors">
                {useCase.icon}
              </div>
              <h3 className="mt-4 text-sm font-semibold text-oahl-textMain">{useCase.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-oahl-textMuted">{useCase.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════ API REFERENCE BENTO ═══════════════════ */}
      <section className="mt-16 bento-grid">
        <div className="panel bento-main p-8 relative overflow-hidden">
          <div className="orb orb-tech w-[200px] h-[200px] -bottom-10 -right-10 opacity-40" />
          <div className="relative z-10">
            <p className="text-xs font-mono uppercase tracking-wider text-oahl-tech">API Surface</p>
            <h3 className="mt-2 text-2xl font-bold">Three clean interfaces</h3>
            <p className="mt-3 text-sm leading-relaxed text-oahl-textMuted max-w-lg">
              Agents discover and execute. Providers register and relay. Nodes expose local hardware. 
              Every endpoint returns structured JSON — no guesswork.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="stat-card">
                <p className="stat-title">Agent endpoints</p>
                <p className="stat-value text-2xl">{AGENT_ENDPOINTS.length}</p>
              </div>
              <div className="stat-card">
                <p className="stat-title">Provider endpoints</p>
                <p className="stat-value text-2xl">{PROVIDER_ENDPOINTS.length}</p>
              </div>
              <div className="stat-card">
                <p className="stat-title">Node endpoints</p>
                <p className="stat-value text-2xl">{LOCAL_ENDPOINTS.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="panel p-6">
          <p className="text-xs font-mono uppercase tracking-wider text-oahl-textMuted mb-4">Agent APIs</p>
          <div className="space-y-2">
            {AGENT_ENDPOINTS.map((endpoint) => (
              <div key={`${endpoint.method}-${endpoint.path}`} className="api-line group">
                <span className="text-[10px] font-mono font-bold text-oahl-accent px-1.5 py-0.5 rounded bg-oahl-accent/10">{endpoint.method}</span>
                <span className="text-xs font-mono text-oahl-textMain group-hover:text-white transition-colors">{endpoint.path}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel p-6">
          <p className="text-xs font-mono uppercase tracking-wider text-oahl-textMuted mb-4">Provider APIs</p>
          <div className="space-y-2">
            {PROVIDER_ENDPOINTS.map((endpoint) => (
              <div key={`${endpoint.method}-${endpoint.path}`} className="api-line group">
                <span className="text-[10px] font-mono font-bold text-oahl-tech px-1.5 py-0.5 rounded bg-oahl-tech/10">{endpoint.method}</span>
                <span className="text-xs font-mono text-oahl-textMain group-hover:text-white transition-colors">{endpoint.path}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel p-6">
          <p className="text-xs font-mono uppercase tracking-wider text-oahl-textMuted mb-4">Node APIs</p>
          <div className="space-y-2">
            {LOCAL_ENDPOINTS.map((endpoint) => (
              <div key={`${endpoint.method}-${endpoint.path}`} className="api-line group">
                <span className="text-[10px] font-mono font-bold text-oahl-textMuted px-1.5 py-0.5 rounded bg-white/5">{endpoint.method}</span>
                <span className="text-xs font-mono text-oahl-textMain group-hover:text-white transition-colors">{endpoint.path}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ CTA ═══════════════════ */}
      <section className="mt-16 cta-band panel relative overflow-hidden rounded-3xl p-10 md:p-14">
        <div className="orb orb-accent w-[300px] h-[300px] -top-20 -left-20 opacity-60" />
        <div className="orb orb-tech w-[250px] h-[250px] -bottom-20 -right-20 opacity-40" style={{ animationDelay: '-6s' }} />
        <div className="grid-overlay" />

        <div className="relative z-10 text-center max-w-2xl mx-auto">
          <p className="text-xs font-mono uppercase tracking-wider text-oahl-accent mb-4">Start Building</p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Upgrade from fragile scripts<br />
            <span className="text-oahl-textMuted">to a clean agent platform.</span>
          </h2>
          <p className="mt-4 text-sm text-oahl-textMuted max-w-lg mx-auto">
            Keep your adapter ecosystem, enforce policy centrally, and evolve transport layers 
            without ever touching agent business logic.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={onOpenApiLab}
              className="group relative rounded-2xl bg-oahl-accent px-7 py-3.5 text-sm font-semibold text-white transition-all hover:bg-oahl-accentHover hover:shadow-[0_0_30px_rgba(212,126,91,0.3)] hover:scale-[1.02] active:scale-[0.98]"
            >
              Open API Lab
            </button>
            <a
              href="https://github.com/fredabila/oahl"
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-oahl-border bg-oahl-surface/50 backdrop-blur-sm px-7 py-3.5 text-sm font-semibold text-oahl-textMain transition-all hover:border-oahl-accent"
            >
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
        body: JSON.stringify({ capability: selectedCapability.trim(), params: parsedParams, timeout_ms: 300000 })
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
          try {
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
            body: JSON.stringify({ capability: targetCapability, params: targetParams, timeout_ms: 300000 })
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
          } catch (stepErr: any) {
            const errorMessage = stepErr?.message || 'Execution step failed unexpectedly';
            sequenceResults.push({ step: stepCount, capability: String(actionPayload.capability || 'unknown'), relayMode: 'error', requestId: '', status: 'error', error: errorMessage });
            setAiStepResults([...sequenceResults]);
            messages.push({ role: 'user', content: `Execution step failed: ${errorMessage}\nAdjust your strategy, fix any incorrect parameters/device IDs, and try again.` });
          }
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
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
          
          <div className="overflow-x-auto pb-2">
            <table className="w-full text-left text-sm min-w-[500px]">
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
