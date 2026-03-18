import React, { useState, useEffect } from 'react';
import {
  Bot, LayoutDashboard, LogOut, Wallet, Plus, CreditCard, ChevronRight,
  Cpu, Globe, Search, Copy, Check, Trash2, RefreshCw, User, HardDrive,
} from 'lucide-react';

type Developer = {
  email: string;
  org_id: string;
};

type Agent = {
  key: string;
  name: string;
  org_id: string;
  balance: number;
  created_at: number;
};

type ProviderStats = {
  total_earnings: number;
  device_count: number;
  nodes: any[];
};

type Device = {
  id: string;
  type: string;
  name: string;
  capabilities: any[];
  provider: string;
  node_id: string;
  earnings?: number;
  pricing?: {
    rate_per_minute?: number;
    rate_per_execution?: number;
    currency: string;
  };
  status: string;
};

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('portal_token'));
  const [developer, setDeveloper] = useState<Developer | null>(
    localStorage.getItem('portal_dev') ? JSON.parse(localStorage.getItem('portal_dev') as string) : null
  );

  const [cloudUrl] = useState(import.meta.env.VITE_CLOUD_URL || 'https://oahl.onrender.com');

  const [authEmail, setAuthEmail] = useState('');
  const [authPin, setAuthPin] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [portalMode, setPortalMode] = useState<'developer' | 'provider'>('developer');
  const [activeTab, setActiveTab] = useState<'agents' | 'billing' | 'hardware' | 'earnings'>('agents');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [providerStats, setProviderStats] = useState<ProviderStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [providerDevices, setProviderDevices] = useState<Device[]>([]);
  const [loadingProviderDevices, setLoadingProviderDevices] = useState(false);

  const [newAgentName, setNewAgentName] = useState('');
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);

  const [fundAmount, setFundAmount] = useState('50');
  const [fundingAgentKey, setFundingAgentKey] = useState<string | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const res = await fetch(`${cloudUrl}/v1/portal/auth`, { method: 'OPTIONS' });
        setIsConnected(res.ok || res.status === 204);
      } catch {
        setIsConnected(false);
      }
    };
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (token) {
      if (portalMode === 'developer') {
        fetchAgents();
        if (activeTab === 'hardware') fetchCapabilities();
      } else {
        fetchProviderStats();
        fetchProviderDevices();
      }
    }
  }, [token, portalMode, activeTab]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await fetch(`${cloudUrl}/v1/portal/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, pin: authPin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');
      setToken(data.token);
      setDeveloper(data.developer);
      localStorage.setItem('portal_token', data.token);
      localStorage.setItem('portal_dev', JSON.stringify(data.developer));
      setAuthPin('');
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setDeveloper(null);
    localStorage.removeItem('portal_token');
    localStorage.removeItem('portal_dev');
    setAgents([]);
  };

  const fetchAgents = async () => {
    if (!token) return;
    setLoadingAgents(true);
    try {
      const res = await fetch(`${cloudUrl}/v1/portal/agents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAgents(data.agents || []);
    } catch (err) {
      console.error('Failed to fetch agents', err);
    } finally {
      setLoadingAgents(false);
    }
  };

  const fetchCapabilities = async () => {
    if (!token) return;
    setLoadingDevices(true);
    try {
      const res = await fetch(`${cloudUrl}/v1/portal/capabilities`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDevices(data.devices || []);
    } catch (err) {
      console.error('Failed to fetch capabilities', err);
    } finally {
      setLoadingDevices(false);
    }
  };

  const fetchProviderStats = async () => {
    if (!token) return;
    setLoadingStats(true);
    try {
      const res = await fetch(`${cloudUrl}/v1/portal/provider/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProviderStats(data);
    } catch (err) {
      console.error('Failed to fetch provider stats', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchProviderDevices = async () => {
    if (!token) return;
    setLoadingProviderDevices(true);
    try {
      const res = await fetch(`${cloudUrl}/v1/portal/provider/devices`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProviderDevices(data.devices || []);
    } catch (err) {
      console.error('Failed to fetch provider devices', err);
    } finally {
      setLoadingProviderDevices(false);
    }
  };

  const createAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newAgentName.trim()) return;
    setIsCreatingAgent(true);
    try {
      const res = await fetch(`${cloudUrl}/v1/portal/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newAgentName }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setNewAgentName('');
      await fetchAgents();
    } catch (err) {
      console.error('Failed to create agent', err);
      alert('Failed to create agent.');
    } finally {
      setIsCreatingAgent(false);
    }
  };

  const revokeAgent = async (key: string) => {
    if (!token || !confirm('Revoke this agent key? All active sessions will fail immediately.')) return;
    try {
      const res = await fetch(`${cloudUrl}/v1/portal/agents/${key}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json()).error);
      await fetchAgents();
    } catch (err: any) {
      console.error('Failed to revoke agent', err);
      alert(err.message || 'Failed to revoke agent.');
    }
  };

  const fundAgent = async (key: string) => {
    if (!token) return;
    const amount = parseFloat(fundAmount);
    if (isNaN(amount) || amount <= 0) { alert('Please enter a valid amount.'); return; }
    try {
      const res = await fetch(`${cloudUrl}/v1/portal/agents/${key}/fund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setFundingAgentKey(null);
      await fetchAgents();
      alert(`Successfully added $${amount} to the agent's wallet.`);
    } catch (err: any) {
      console.error('Failed to fund', err);
      alert(err.message || 'Failed to fund agent.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ─── Login ────────────────────────────────────────────────────────────────
  if (!token || !developer) {
    return (
      <div className="min-h-screen bg-oahl-bg flex items-center justify-center p-6 relative overflow-hidden">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full bg-oahl-accent/5 blur-[100px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 w-[400px] h-[300px] rounded-full bg-oahl-tech/4 blur-[80px]" />

        <div className="w-full max-w-[380px] relative z-10">
          {/* Logo */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-oahl-accent/20 to-oahl-accent/5 border border-oahl-accent/25 flex items-center justify-center text-oahl-accent font-mono font-bold text-xs mb-6 shadow-lg shadow-oahl-accent/10 ring-4 ring-oahl-accent/5">
              OA
            </div>
            <h1 className="text-xl font-semibold text-white tracking-tight">Developer Portal</h1>
            <p className="text-sm text-oahl-textMuted mt-1.5 text-center max-w-[260px]">
              Sign in to manage your agents and hardware.
            </p>
          </div>

          {/* Card */}
          <div className="panel-raised p-7">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-oahl-textMuted">Email address</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="input-field"
                  placeholder="you@example.com"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <label className="block text-xs font-medium text-oahl-textMuted">6-digit PIN</label>
                  <span className="text-[11px] text-oahl-textFaint">New? Just invent one.</span>
                </div>
                <input
                  type="password"
                  required
                  maxLength={6}
                  minLength={6}
                  pattern="\d{6}"
                  value={authPin}
                  onChange={(e) => setAuthPin(e.target.value.replace(/\D/g, ''))}
                  className="input-field font-mono tracking-[0.4em]"
                  placeholder="••••••"
                />
              </div>

              {authError && (
                <div className="px-3.5 py-3 rounded-lg bg-red-950/30 border border-red-900/30 text-red-400 text-xs leading-relaxed">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading || !authEmail || authPin.length !== 6}
                className="btn-primary w-full mt-1"
              >
                {authLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 border border-white/30 border-t-white rounded-full animate-spin" />
                    Authenticating
                  </>
                ) : (
                  <>Continue <ChevronRight className="w-3.5 h-3.5" /></>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-[11px] text-oahl-textFaint mt-6">
            Open Agent Hardware Layer
          </p>
        </div>
      </div>
    );
  }

  const filteredDevices = devices.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.provider.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isProvider = portalMode === 'provider';

  // ─── Dashboard ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-oahl-bg text-oahl-text-main">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-oahl-border/60 bg-oahl-bg/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-oahl-accent/10 border border-oahl-accent/25 text-oahl-accent font-mono font-bold text-[10px]">
              OA
            </div>
            <span className="text-sm font-semibold tracking-tight">Portal</span>
            <span className="hidden sm:inline-flex items-center h-5 px-2 rounded-md bg-oahl-surface border border-oahl-border text-[10px] font-mono text-oahl-textMuted ml-1">
              {developer.org_id}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-oahl-textMuted hidden sm:block">{developer.email}</span>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-oahl-textMuted hover:text-oahl-text-main hover:bg-white/5 transition-all"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-56 shrink-0 space-y-5">
          {/* Mode Switcher */}
          <div className="relative flex p-1 bg-oahl-surface border border-oahl-border rounded-xl">
            <div
              className={`absolute top-1 bottom-1 rounded-lg transition-all duration-200 ${
                isProvider
                  ? 'right-1 left-[50%] bg-oahl-tech/15 border border-oahl-tech/25'
                  : 'left-1 right-[50%] bg-oahl-accent/15 border border-oahl-accent/25'
              }`}
            />
            <button
              onClick={() => { setPortalMode('developer'); setActiveTab('agents'); }}
              className={`relative flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                !isProvider ? 'text-oahl-accent' : 'text-oahl-textMuted hover:text-oahl-text-main'
              }`}
            >
              <User className="w-3 h-3" /> Dev
            </button>
            <button
              onClick={() => { setPortalMode('provider'); setActiveTab('earnings'); }}
              className={`relative flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                isProvider ? 'text-oahl-tech' : 'text-oahl-textMuted hover:text-oahl-text-main'
              }`}
            >
              <HardDrive className="w-3 h-3" /> Provider
            </button>
          </div>

          {/* Navigation */}
          <nav className="space-y-0.5">
            {!isProvider ? (
              <>
                <button
                  onClick={() => setActiveTab('agents')}
                  className={`nav-link w-full ${activeTab === 'agents' ? 'nav-link-active' : 'nav-link-inactive'}`}
                >
                  <Bot className="w-3.5 h-3.5" /> Agents & Keys
                </button>
                <button
                  onClick={() => setActiveTab('hardware')}
                  className={`nav-link w-full ${activeTab === 'hardware' ? 'nav-link-active' : 'nav-link-inactive'}`}
                >
                  <Cpu className="w-3.5 h-3.5" /> Hardware
                </button>
                <button
                  onClick={() => setActiveTab('billing')}
                  className={`nav-link w-full ${activeTab === 'billing' ? 'nav-link-active' : 'nav-link-inactive'}`}
                >
                  <Wallet className="w-3.5 h-3.5" /> Billing
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setActiveTab('earnings')}
                  className={`nav-link w-full ${activeTab === 'earnings' ? 'nav-link-active-tech' : 'nav-link-inactive-tech'}`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" /> Earnings
                </button>
                <button
                  onClick={() => setActiveTab('hardware')}
                  className={`nav-link w-full ${activeTab === 'hardware' ? 'nav-link-active-tech' : 'nav-link-inactive-tech'}`}
                >
                  <HardDrive className="w-3.5 h-3.5" /> My Hardware
                </button>
              </>
            )}
          </nav>

          {/* Network Status */}
          <div className="px-3 py-2.5 rounded-lg bg-oahl-surface border border-oahl-border">
            <p className="text-[10px] font-mono uppercase tracking-widest text-oahl-textMuted mb-1.5">Network</p>
            <div className={`flex items-center gap-2 text-xs font-medium ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
              <span className="relative flex h-1.5 w-1.5">
                {isConnected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                )}
                <span className={`relative rounded-full h-1.5 w-1.5 ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
              </span>
              {isConnected ? 'Cloud online' : 'Cloud offline'}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 space-y-6">

          {/* ── Agents ── */}
          {activeTab === 'agents' && (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">Agent Identities</h2>
                  <p className="text-sm text-oahl-textMuted mt-0.5">API keys for autonomous agent workloads.</p>
                </div>
                <button
                  onClick={fetchAgents}
                  disabled={loadingAgents}
                  className="btn-ghost mt-0.5"
                  title="Refresh"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingAgents ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Create agent */}
              <div className="panel p-5">
                <form onSubmit={createAgent} className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className="block text-[10px] font-mono uppercase tracking-widest text-oahl-textMuted mb-1.5">
                      Agent name
                    </label>
                    <input
                      type="text"
                      required
                      value={newAgentName}
                      onChange={(e) => setNewAgentName(e.target.value)}
                      className="input-field"
                      placeholder="e.g. Lab Drone Alpha"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={isCreatingAgent || !newAgentName.trim()}
                      className="h-10 px-4 rounded-lg bg-oahl-tech/10 border border-oahl-tech/20 text-oahl-tech text-sm font-semibold hover:bg-oahl-tech/20 transition-all disabled:opacity-40 flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5" /> Provision
                    </button>
                  </div>
                </form>
              </div>

              {/* Agents table */}
              <div className="panel overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-oahl-border bg-black/20">
                        <th className="table-header">Name</th>
                        <th className="table-header">API Key</th>
                        <th className="table-header">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-oahl-border/30">
                      {loadingAgents ? (
                        <tr>
                          <td colSpan={3} className="table-cell text-center text-oahl-textMuted text-xs py-10">
                            Loading agents…
                          </td>
                        </tr>
                      ) : agents.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="table-cell text-center text-oahl-textMuted text-xs py-10">
                            No agents provisioned yet.
                          </td>
                        </tr>
                      ) : (
                        agents.map((agent) => (
                          <tr key={agent.key} className="group hover:bg-white/[0.015] transition-colors">
                            <td className="table-cell">
                              <div className="flex items-center gap-2.5">
                                <div className="w-6 h-6 rounded-md bg-oahl-accent/10 border border-oahl-accent/15 flex items-center justify-center text-oahl-accent shrink-0">
                                  <Bot className="w-3 h-3" />
                                </div>
                                <span className="font-medium text-oahl-text-main text-sm">{agent.name}</span>
                              </div>
                            </td>
                            <td className="table-cell">
                              <div className="flex items-center gap-2">
                                <code className="px-2 py-1 rounded-md bg-oahl-bg border border-oahl-border text-oahl-tech font-mono text-[11px]">
                                  {agent.key}
                                </code>
                                <button
                                  onClick={() => copyToClipboard(agent.key)}
                                  className="text-oahl-textMuted hover:text-oahl-text-main transition-colors p-0.5"
                                  title="Copy"
                                >
                                  {copiedId === agent.key
                                    ? <Check className="w-3 h-3 text-emerald-400" />
                                    : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                            </td>
                            <td className="table-cell">
                              <div className="flex items-center justify-between">
                                <span className="text-oahl-textMuted text-xs">
                                  {new Date(agent.created_at).toLocaleDateString()}
                                </span>
                                <button
                                  onClick={() => revokeAgent(agent.key)}
                                  className="opacity-0 group-hover:opacity-100 text-red-500/50 hover:text-red-400 transition-all p-1 rounded"
                                  title="Revoke"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ── Hardware Explorer (Developer) ── */}
          {activeTab === 'hardware' && !isProvider && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">Hardware Explorer</h2>
                  <p className="text-sm text-oahl-textMuted mt-0.5">Discover real-world devices available on the OAHL network.</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-oahl-textMuted" />
                    <input
                      type="text"
                      placeholder="Search hardware…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="input-field pl-9 py-2 text-sm w-full sm:w-56"
                    />
                  </div>
                  <button
                    onClick={fetchCapabilities}
                    disabled={loadingDevices}
                    className="btn-ghost"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingDevices ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {loadingDevices ? (
                  <div className="panel p-12 text-center text-oahl-textMuted text-sm">
                    Scanning network…
                  </div>
                ) : filteredDevices.length === 0 ? (
                  <div className="panel p-12 text-center text-oahl-textMuted text-sm">
                    {searchQuery ? 'No hardware matched your search.' : 'No public hardware detected on the network.'}
                  </div>
                ) : (
                  filteredDevices.map((device) => (
                    <div key={device.id} className="panel p-5 flex flex-col lg:flex-row lg:items-center gap-5 hover:border-oahl-border-strong transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2.5 mb-2.5">
                          <span className="badge-accent">{device.type}</span>
                          <h3 className="font-semibold text-oahl-text-main">{device.name}</h3>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-oahl-textMuted">
                          <span className="flex items-center gap-1.5">
                            <Globe className="w-3 h-3" /> {device.provider}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <code className="font-mono text-oahl-textMuted bg-oahl-bg border border-oahl-border px-1.5 py-0.5 rounded">
                              {device.id}
                            </code>
                            <button
                              onClick={() => copyToClipboard(device.id)}
                              className="hover:text-oahl-text-main transition-colors"
                            >
                              {copiedId === device.id
                                ? <Check className="w-3 h-3 text-emerald-400" />
                                : <Copy className="w-3 h-3" />}
                            </button>
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {device.capabilities.map((cap: any) => (
                            <span key={typeof cap === 'string' ? cap : cap.name} className="capability-tag">
                              {typeof cap === 'string' ? cap : cap.name}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="lg:w-44 lg:border-l lg:border-oahl-border lg:pl-5 flex flex-col">
                        <p className="stat-label">Pricing</p>
                        {device.pricing ? (
                          <div className="space-y-1">
                            {device.pricing.rate_per_minute !== undefined && (
                              <p className="text-sm font-mono font-semibold text-oahl-text-main">
                                ${device.pricing.rate_per_minute.toFixed(2)}
                                <span className="text-xs font-normal text-oahl-textMuted"> / min</span>
                              </p>
                            )}
                            {device.pricing.rate_per_execution !== undefined && (
                              <p className="text-sm font-mono font-semibold text-oahl-text-main">
                                ${device.pricing.rate_per_execution.toFixed(2)}
                                <span className="text-xs font-normal text-oahl-textMuted"> / exec</span>
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm font-semibold text-emerald-400">Community Free</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* ── Billing ── */}
          {activeTab === 'billing' && (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">Wallets & Billing</h2>
                  <p className="text-sm text-oahl-textMuted mt-0.5">Add credits so your agents can rent physical hardware.</p>
                </div>
                <button
                  onClick={fetchAgents}
                  disabled={loadingAgents}
                  className="btn-ghost mt-0.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingAgents ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {agents.length === 0 ? (
                  <div className="sm:col-span-2 lg:col-span-3 panel border-dashed p-10 text-center text-sm text-oahl-textMuted">
                    Provision an agent first to manage its wallet.
                  </div>
                ) : (
                  agents.map((agent) => (
                    <div key={agent.key} className="panel p-5 flex flex-col hover:border-oahl-border-strong transition-colors">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-8 h-8 rounded-lg bg-oahl-accent/8 border border-oahl-accent/15 flex items-center justify-center text-oahl-accent shrink-0">
                          <Bot className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-oahl-text-main truncate">{agent.name}</p>
                          <p className="text-[10px] text-oahl-textMuted font-mono truncate">{agent.key.substring(0, 14)}…</p>
                        </div>
                      </div>

                      <div className="mt-auto">
                        <p className="stat-label">Balance</p>
                        <p className="text-2xl font-mono font-semibold text-oahl-text-main mb-4">
                          ${(agent.balance || 0).toFixed(2)}
                        </p>

                        {fundingAgentKey === agent.key ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              value={fundAmount}
                              onChange={(e) => setFundAmount(e.target.value)}
                              className="input-field w-20 py-1.5 text-sm"
                            />
                            <button
                              onClick={() => fundAgent(agent.key)}
                              className="h-8 px-3 rounded-lg bg-oahl-accent hover:bg-oahl-accentHover text-white text-xs font-semibold transition-all"
                            >
                              Pay
                            </button>
                            <button
                              onClick={() => setFundingAgentKey(null)}
                              className="h-8 px-2 text-oahl-textMuted hover:text-oahl-text-main text-xs transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setFundingAgentKey(agent.key); setFundAmount('50'); }}
                            className="w-full flex justify-center items-center gap-2 h-9 rounded-lg bg-white/4 hover:bg-white/8 border border-oahl-border hover:border-oahl-border-strong text-sm font-medium transition-all"
                          >
                            <CreditCard className="w-3.5 h-3.5" /> Add Credits
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* ── Provider Earnings ── */}
          {activeTab === 'earnings' && isProvider && (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">Provider Earnings</h2>
                  <p className="text-sm text-oahl-textMuted mt-0.5">Revenue generated by your hardware nodes.</p>
                </div>
                <button
                  onClick={fetchProviderStats}
                  disabled={loadingStats}
                  className="btn-ghost mt-0.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingStats ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Stats */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="panel p-5 bg-gradient-to-br from-oahl-tech/8 to-transparent border-oahl-tech/20">
                  <p className="stat-label">Total Revenue</p>
                  {loadingStats ? (
                    <div className="h-8 w-24 rounded-md bg-oahl-border animate-pulse mt-1" />
                  ) : (
                    <p className="text-2xl font-mono font-semibold text-oahl-tech">
                      ${(providerStats?.total_earnings || 0).toFixed(2)}
                    </p>
                  )}
                </div>
                <div className="panel p-5">
                  <p className="stat-label">Active Devices</p>
                  {loadingStats ? (
                    <div className="h-8 w-16 rounded-md bg-oahl-border animate-pulse mt-1" />
                  ) : (
                    <p className="text-2xl font-mono font-semibold text-oahl-text-main">
                      {providerStats?.device_count || 0}
                    </p>
                  )}
                </div>
                <div className="panel p-5">
                  <p className="stat-label">Online Nodes</p>
                  {loadingStats ? (
                    <div className="h-8 w-16 rounded-md bg-oahl-border animate-pulse mt-1" />
                  ) : (
                    <p className="text-2xl font-mono font-semibold text-oahl-text-main">
                      {providerStats?.nodes?.length || 0}
                    </p>
                  )}
                </div>
              </div>

              {/* Nodes table */}
              <div className="panel overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-oahl-border bg-black/20">
                        <th className="table-header">Node ID</th>
                        <th className="table-header">Status</th>
                        <th className="table-header">Devices</th>
                        <th className="table-header">Earnings</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-oahl-border/30">
                      {loadingStats ? (
                        <tr>
                          <td colSpan={4} className="table-cell text-center text-oahl-textMuted text-xs py-10">
                            Loading stats…
                          </td>
                        </tr>
                      ) : (providerStats?.nodes || []).map((node) => (
                        <tr key={node.node_id} className="hover:bg-white/[0.015] transition-colors">
                          <td className="table-cell font-mono text-xs text-oahl-textMuted">{node.node_id}</td>
                          <td className="table-cell">
                            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Online
                            </span>
                          </td>
                          <td className="table-cell text-sm text-oahl-text-main">{node.device_count}</td>
                          <td className="table-cell font-mono text-sm text-oahl-tech font-semibold">
                            ${node.earnings.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ── Provider Hardware ── */}
          {activeTab === 'hardware' && isProvider && (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">Your Hardware</h2>
                  <p className="text-sm text-oahl-textMuted mt-0.5">Monitor connected devices and their earnings.</p>
                </div>
                <button
                  onClick={fetchProviderDevices}
                  disabled={loadingProviderDevices}
                  className="btn-ghost mt-0.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingProviderDevices ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="space-y-3">
                {loadingProviderDevices ? (
                  <div className="panel p-12 text-center text-oahl-textMuted text-sm">
                    Fetching device status…
                  </div>
                ) : providerDevices.length === 0 ? (
                  <div className="panel p-10 text-center text-oahl-textMuted text-sm">
                    No hardware registered.{' '}
                    <span className="font-mono text-oahl-textMuted/70">Run `oahl start` on your node.</span>
                  </div>
                ) : (
                  providerDevices.map((device) => (
                    <div key={device.id} className="panel p-5 flex flex-col lg:flex-row lg:items-center gap-5 hover:border-oahl-border-strong transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2.5 mb-2.5">
                          <span className="badge-tech">{device.type}</span>
                          <h3 className="font-semibold text-oahl-text-main">{device.name}</h3>
                        </div>
                        <p className="text-[11px] font-mono text-oahl-textMuted mb-3">{device.id}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {device.capabilities.map((cap: any) => (
                            <span key={typeof cap === 'string' ? cap : cap.name} className="capability-tag">
                              {typeof cap === 'string' ? cap : cap.name}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="lg:w-44 lg:border-l lg:border-oahl-border lg:pl-5 flex flex-col">
                        <p className="stat-label">Device Earnings</p>
                        <p className="text-xl font-mono font-semibold text-oahl-tech">
                          ${(device.earnings || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

        </main>
      </div>
    </div>
  );
}

export default App;
