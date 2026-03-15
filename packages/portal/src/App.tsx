import React, { useState, useEffect } from 'react';
import { Bot, KeyRound, LayoutDashboard, LogOut, Wallet, Plus, CreditCard, ChevronRight, Cpu, Globe, Search, Copy, Check, Trash2 } from 'lucide-react';

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

type Device = {
  id: string;
  type: string;
  name: string;
  capabilities: any[];
  provider: string;
  node_id: string;
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
  
  // Auth state
  const [authEmail, setAuthEmail] = useState('');
  const [authPin, setAuthPin] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Dashboard state
  const [activeTab, setActiveTab] = useState<'agents' | 'billing' | 'hardware'>('agents');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // New Agent Form
  const [newAgentName, setNewAgentName] = useState('');
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);

  // Funding Form
  const [fundAmount, setFundAmount] = useState('50');
  const [fundingAgentKey, setFundingAgentKey] = useState<string | null>(null);

  // UI state
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
      fetchAgents();
      if (activeTab === 'hardware') {
        fetchCapabilities();
      }
    }
  }, [token, activeTab]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      const res = await fetch(`${cloudUrl}/v1/portal/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, pin: authPin })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      setToken(data.token);
      setDeveloper(data.developer);
      localStorage.setItem('portal_token', data.token);
      localStorage.setItem('portal_dev', JSON.stringify(data.developer));
      
      setAuthPin(''); // Clear pin for security
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
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAgents(data.agents || []);
    } catch (err) {
      console.error("Failed to fetch agents", err);
    } finally {
      setLoadingAgents(false);
    }
  };

  const fetchCapabilities = async () => {
    if (!token) return;
    setLoadingDevices(true);
    try {
      const res = await fetch(`${cloudUrl}/v1/portal/capabilities`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDevices(data.devices || []);
    } catch (err) {
      console.error("Failed to fetch capabilities", err);
    } finally {
      setLoadingDevices(false);
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
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ name: newAgentName })
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setNewAgentName('');
      await fetchAgents();
    } catch (err) {
      console.error("Failed to create agent", err);
      alert("Failed to create agent.");
    } finally {
      setIsCreatingAgent(false);
    }
  };

  const revokeAgent = async (key: string) => {
    if (!token || !confirm("Are you sure you want to revoke this agent key? It will be permanently deleted and all active sessions will fail.")) return;
    
    try {
      const res = await fetch(`${cloudUrl}/v1/portal/agents/${key}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error((await res.json()).error);
      await fetchAgents();
    } catch (err: any) {
      console.error("Failed to revoke agent", err);
      alert(err.message || "Failed to revoke agent.");
    }
  };

  const fundAgent = async (key: string) => {
    if (!token) return;
    const amount = parseFloat(fundAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    
    try {
      const res = await fetch(`${cloudUrl}/v1/portal/agents/${key}/fund`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ amount })
      });
      
      if (!res.ok) throw new Error((await res.json()).error);
      
      setFundingAgentKey(null);
      await fetchAgents();
      alert(`Successfully added $${amount} to the agent's wallet!`);
    } catch (err: any) {
      console.error("Failed to fund", err);
      alert(err.message || "Failed to fund agent.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!token || !developer) {
    return (
      <div className="min-h-screen bg-oahl-bg flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-oahl-accent/10 via-oahl-bg to-oahl-bg opacity-70 pointer-events-none" />
        
        <div className="panel w-full max-w-md p-8 relative z-10">
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-oahl-accent to-oahl-accentHover text-white font-mono font-bold shadow-lg shadow-oahl-accent/20 mb-4">
              OA
            </div>
            <h1 className="text-2xl font-semibold text-oahl-text-main tracking-tight">Developer Portal</h1>
            <p className="text-sm text-oahl-textMuted mt-2">Log in or create a PIN to manage your agents.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-oahl-textMuted mb-1.5">Email Address</label>
              <input
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="input-field w-full rounded-xl px-4 py-3 text-sm"
                placeholder="developer@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-oahl-textMuted mb-1.5">6-Digit PIN</label>
              <input
                type="password"
                required
                maxLength={6}
                minLength={6}
                pattern="\d{6}"
                value={authPin}
                onChange={(e) => setAuthPin(e.target.value.replace(/\D/g, ''))}
                className="input-field w-full rounded-xl px-4 py-3 text-sm tracking-widest font-mono"
                placeholder="••••••"
              />
              <p className="text-[10px] text-oahl-textMuted mt-1.5 text-right">New here? Just invent a 6-digit PIN.</p>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading || !authEmail || authPin.length !== 6}
              className="w-full h-[46px] mt-2 rounded-xl bg-oahl-accent text-white font-semibold text-sm transition hover:bg-oahl-accentHover disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {authLoading ? 'Authenticating...' : 'Enter Portal'}
              {!authLoading && <ChevronRight className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const filteredDevices = devices.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    d.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.provider.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-oahl-bg text-oahl-text-main selection:bg-oahl-accent/20">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-oahl-border/80 bg-oahl-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-oahl-accent text-white font-mono font-bold text-xs">
              OA
            </div>
            <span className="font-semibold tracking-wide text-sm">Developer Portal</span>
            <span className="px-2 py-0.5 rounded-full bg-oahl-border text-xs text-oahl-textMuted font-mono ml-2">
              {developer.org_id}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-oahl-textMuted hidden sm:inline-block">{developer.email}</span>
            <button 
              onClick={handleLogout}
              className="text-oahl-textMuted hover:text-white transition-colors p-2"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-64 shrink-0">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('agents')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'agents' 
                  ? 'bg-oahl-accent/10 text-oahl-accent border border-oahl-accent/20' 
                  : 'text-oahl-textMuted hover:bg-oahl-surface hover:text-oahl-text-main border border-transparent'
              }`}
            >
              <Bot className="w-4 h-4" /> Agents & Keys
            </button>
            <button
              onClick={() => setActiveTab('hardware')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'hardware' 
                  ? 'bg-oahl-accent/10 text-oahl-accent border border-oahl-accent/20' 
                  : 'text-oahl-textMuted hover:bg-oahl-surface hover:text-oahl-text-main border border-transparent'
              }`}
            >
              <Cpu className="w-4 h-4" /> Hardware Explorer
            </button>
            <button
              onClick={() => setActiveTab('billing')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'billing' 
                  ? 'bg-oahl-accent/10 text-oahl-accent border border-oahl-accent/20' 
                  : 'text-oahl-textMuted hover:bg-oahl-surface hover:text-oahl-text-main border border-transparent'
              }`}
            >
              <Wallet className="w-4 h-4" /> Wallets & Billing
            </button>
          </nav>

          <div className="mt-8 panel p-4 bg-oahl-surface/20">
            <h4 className="text-xs font-mono uppercase tracking-wider text-oahl-textMuted mb-2">Network Status</h4>
            <div className={`flex items-center gap-2 text-sm ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
              <span className="relative flex h-2 w-2">
                {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
              </span>
              {isConnected ? 'Cloud Connected' : 'Cloud Offline'}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 space-y-6">
          
          {activeTab === 'agents' && (
            <>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">Agent Identities</h2>
                <p className="text-sm text-oahl-textMuted mt-1">Manage API keys for your autonomous workloads.</p>
              </div>

              <div className="panel p-6">
                <form onSubmit={createAgent} className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-mono uppercase tracking-wider text-oahl-textMuted mb-1.5">New Agent Name</label>
                    <input
                      type="text"
                      required
                      value={newAgentName}
                      onChange={(e) => setNewAgentName(e.target.value)}
                      className="input-field w-full rounded-xl px-4 py-2.5 text-sm"
                      placeholder="e.g. Test Lab Drone"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isCreatingAgent || !newAgentName.trim()}
                    className="h-[42px] px-5 rounded-xl bg-oahl-tech/20 border border-oahl-tech/30 text-oahl-tech text-sm font-semibold hover:bg-oahl-tech/30 transition disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" /> Provision Key
                  </button>
                </form>
              </div>

              <div className="panel overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-oahl-border bg-black/20 text-oahl-textMuted text-xs uppercase tracking-wider">
                        <th className="px-6 py-4 font-medium">Agent Name</th>
                        <th className="px-6 py-4 font-medium">API Key</th>
                        <th className="px-6 py-4 font-medium">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-oahl-border/50">
                      {loadingAgents ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-8 text-center text-oahl-textMuted">Loading agents...</td>
                        </tr>
                      ) : agents.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-8 text-center text-oahl-textMuted italic">No agents provisioned yet.</td>
                        </tr>
                      ) : (
                        agents.map(agent => (
                          <tr key={agent.key} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="px-6 py-4 font-medium text-oahl-text-main">{agent.name}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <code className="px-2 py-1 rounded-md bg-black/50 border border-oahl-border text-oahl-tech font-mono text-xs">
                                  {agent.key}
                                </code>
                                <button 
                                  onClick={() => copyToClipboard(agent.key)}
                                  className="text-oahl-textMuted hover:text-white transition"
                                  title="Copy Key"
                                >
                                  {copiedId === agent.key ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-oahl-textMuted text-xs flex items-center justify-between">
                              {new Date(agent.created_at).toLocaleDateString()}
                              <button 
                                onClick={() => revokeAgent(agent.key)}
                                className="opacity-0 group-hover:opacity-100 text-red-400/50 hover:text-red-400 transition p-1"
                                title="Revoke Key"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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

          {activeTab === 'hardware' && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">Hardware Explorer</h2>
                  <p className="text-sm text-oahl-textMuted mt-1">Discover and inspect real-world hardware available on the OAHL network.</p>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-oahl-textMuted" />
                  <input 
                    type="text"
                    placeholder="Search hardware..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-field pl-10 pr-4 py-2 rounded-xl text-sm w-full sm:w-64"
                  />
                </div>
              </div>

              <div className="grid gap-4">
                {loadingDevices ? (
                  <div className="panel p-12 text-center text-oahl-textMuted">Scanning network for hardware...</div>
                ) : filteredDevices.length === 0 ? (
                  <div className="panel p-12 text-center text-oahl-textMuted italic">
                    {searchQuery ? 'No hardware matching your search.' : 'No public hardware detected on the network.'}
                  </div>
                ) : (
                  filteredDevices.map(device => (
                    <div key={device.id} className="panel p-6 flex flex-col lg:flex-row lg:items-center gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-2 py-0.5 rounded-md bg-oahl-accent/10 text-oahl-accent text-[10px] font-mono uppercase font-bold border border-oahl-accent/20">
                            {device.type}
                          </span>
                          <h3 className="text-lg font-semibold">{device.name}</h3>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-oahl-textMuted">
                          <div className="flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5" /> {device.provider}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <code className="text-xs bg-black/30 px-1.5 py-0.5 rounded border border-oahl-border">{device.id}</code>
                            <button onClick={() => copyToClipboard(device.id)} className="hover:text-white transition">
                              {copiedId === device.id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {device.capabilities.map((cap: any) => (
                            <span key={typeof cap === 'string' ? cap : cap.name} className="px-2 py-1 rounded-lg bg-white/5 border border-oahl-border text-xs font-mono">
                              {typeof cap === 'string' ? cap : cap.name}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="lg:w-48 lg:border-l border-oahl-border lg:pl-6 flex flex-col justify-center">
                        <p className="text-[10px] uppercase tracking-wider font-mono text-oahl-textMuted mb-1">Pricing Model</p>
                        {device.pricing ? (
                          <div className="space-y-1">
                            {device.pricing.rate_per_minute !== undefined && (
                              <p className="text-sm font-medium text-white">${device.pricing.rate_per_minute.toFixed(2)}<span className="text-xs text-oahl-textMuted font-normal"> / min</span></p>
                            )}
                            {device.pricing.rate_per_execution !== undefined && (
                              <p className="text-sm font-medium text-white">${device.pricing.rate_per_execution.toFixed(2)}<span className="text-xs text-oahl-textMuted font-normal"> / exec</span></p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm font-medium text-green-400">Community Free</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {activeTab === 'billing' && (
            <>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">Wallets & Billing</h2>
                <p className="text-sm text-oahl-textMuted mt-1">Add credits so your agents can rent physical hardware.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {agents.map(agent => (
                  <div key={agent.key} className="panel p-5 flex flex-col h-full">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-full bg-oahl-accent/10 border border-oahl-accent/20 flex items-center justify-center text-oahl-accent">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-oahl-text-main truncate">{agent.name}</p>
                        <p className="text-xs text-oahl-textMuted font-mono truncate">{agent.key.substring(0, 12)}...</p>
                      </div>
                    </div>
                    
                    <div className="mt-auto">
                      <p className="text-[10px] uppercase tracking-wider font-mono text-oahl-textMuted mb-1">Available Balance</p>
                      <p className="text-3xl font-mono text-white mb-4">${(agent.balance || 0).toFixed(2)}</p>
                      
                      {fundingAgentKey === agent.key ? (
                        <div className="flex items-center gap-2">
                          <input 
                            type="number"
                            min="1"
                            value={fundAmount}
                            onChange={(e) => setFundAmount(e.target.value)}
                            className="input-field w-20 rounded-lg px-2 py-1.5 text-sm"
                          />
                          <button 
                            onClick={() => fundAgent(agent.key)}
                            className="bg-oahl-accent hover:bg-oahl-accentHover text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                          >
                            Pay
                          </button>
                          <button 
                            onClick={() => setFundingAgentKey(null)}
                            className="text-oahl-textMuted hover:text-white px-2 py-1.5 text-xs transition"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => { setFundingAgentKey(agent.key); setFundAmount('50'); }}
                          className="w-full flex justify-center items-center gap-2 bg-white/5 hover:bg-white/10 border border-oahl-border rounded-xl px-4 py-2 text-sm font-medium transition"
                        >
                          <CreditCard className="w-4 h-4" /> Add Credits
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                
                {agents.length === 0 && (
                  <div className="sm:col-span-2 lg:col-span-3 panel border-dashed p-8 text-center text-sm text-oahl-textMuted">
                    Provision an agent first to manage its wallet.
                  </div>
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