import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-oahl-bg text-oahl-textMain selection:bg-oahl-accent/20 selection:text-white">
      <div className="pointer-events-none fixed inset-0 opacity-80">
        <div className="absolute inset-0 bg-blueprint" />
        <div className="absolute inset-x-0 top-0 h-1 bg-oahl-accent/20 animate-scanline" />
      </div>

      <header className="sticky top-0 z-40 border-b border-oahl-border/80 bg-oahl-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-oahl-accent to-oahl-accentHover text-white font-mono font-bold shadow-lg shadow-oahl-accent/20">
              OA
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide">OPEN AGENT HARDWARE LAYER</p>
              <p className="text-xs text-oahl-textMuted">Admin Control Center</p>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 pb-16 pt-10">
        <DashboardPage />
      </main>

      <footer className="relative z-10 border-t border-oahl-border/70 py-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 text-xs text-oahl-textMuted">
          <p>OAHL © {new Date().getFullYear()} · Core Admin Portal</p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Secure Environment</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, className = '', disabled = false }: any) {
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
                  agents.map((agent: any) => (
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
