import React, { useState, useEffect } from 'react';
import { Network, Server, Cpu, Key, Activity, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

interface Capability {
  name: string;
  nodes_available: number;
}

function App() {
  const [apiKey, setApiKey] = useState('');
  const [cloudUrl, setCloudUrl] = useState('https://oahl.onrender.com');
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchCapabilities = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${cloudUrl}/v1/capabilities`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      if (!res.ok) throw new Error('Unauthorized or network error');
      
      const data = await res.json();
      setCapabilities(data.available_capabilities || []);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to Cloud Registry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Network className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">OAHL <span className="text-slate-400 font-normal">Explorer</span></h1>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium">
            <a href="https://github.com/fredabila/oahl" className="text-slate-400 hover:text-white transition-colors">Documentation</a>
            <a href="https://npmjs.com/package/@fredabila/oahl" className="text-slate-400 hover:text-white transition-colors">NPM Package</a>
            <div className="flex items-center gap-2 text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-full border border-emerald-400/20">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              System Online
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="py-16 text-center max-w-3xl mx-auto">
          <h2 className="text-5xl font-extrabold text-white mb-6 tracking-tight">The Physical World API for AI</h2>
          <p className="text-lg text-slate-400 leading-relaxed mb-8">
            Open Agent Hardware Layer (OAHL) bridges the gap between autonomous AI agents and physical hardware. 
            Connect cameras, sensors, and SDRs to the network, and let your agents request capabilities globally.
          </p>
          <div className="flex items-center justify-center gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex flex-col items-center flex-1">
               <Server className="w-8 h-8 text-blue-400 mb-2" />
               <span className="font-semibold text-white">Cloud Registry</span>
               <span className="text-sm text-slate-400">Matchmaking Brain</span>
            </div>
            <ArrowRight className="text-slate-600" />
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex flex-col items-center flex-1">
               <Cpu className="w-8 h-8 text-indigo-400 mb-2" />
               <span className="font-semibold text-white">Local Nodes</span>
               <span className="text-sm text-slate-400">Hardware Hosts</span>
            </div>
            <ArrowRight className="text-slate-600" />
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex flex-col items-center flex-1">
               <Activity className="w-8 h-8 text-purple-400 mb-2" />
               <span className="font-semibold text-white">AI Agents</span>
               <span className="text-sm text-slate-400">Capability Consumers</span>
            </div>
          </div>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
           <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
             <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
               <ShieldCheck className="text-blue-400" />
             </div>
             <h3 className="text-lg font-bold text-white mb-2">Safe by Default</h3>
             <p className="text-slate-400 text-sm leading-relaxed">Hardware owners set strict policies (like max session times or receive-only modes) protecting their devices from rogue agents.</p>
           </div>
           <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
             <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4">
               <Zap className="text-emerald-400" />
             </div>
             <h3 className="text-lg font-bold text-white mb-2">Zero-Code Config</h3>
             <p className="text-slate-400 text-sm leading-relaxed">Using the CLI wizard, standard hardware like webcams are exposed to the cloud instantly without writing a single driver script.</p>
           </div>
           <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
             <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4">
               <Network className="text-purple-400" />
             </div>
             <h3 className="text-lg font-bold text-white mb-2">Capability Abstraction</h3>
             <p className="text-slate-400 text-sm leading-relaxed">Agents don't need to understand USB ports or drivers. They just request `camera.capture` and the network handles the rest.</p>
           </div>
        </div>

        {/* Explorer Dashboard */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-slate-800 bg-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-400" />
                Network Explorer
              </h2>
              <p className="text-sm text-slate-400 mt-1">Connect to your cloud registry to view available hardware capabilities.</p>
            </div>
            
            <form onSubmit={fetchCapabilities} className="flex items-center gap-2">
              <div className="relative">
                <Server className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="url" 
                  value={cloudUrl}
                  onChange={(e) => setCloudUrl(e.target.value)}
                  placeholder="Cloud URL"
                  className="bg-slate-950 border border-slate-700 text-sm rounded-lg pl-9 pr-3 py-2 text-white w-48 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Agent API Key"
                  className="bg-slate-950 border border-slate-700 text-sm rounded-lg pl-9 pr-3 py-2 text-white w-48 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <button 
                type="submit"
                disabled={loading || !apiKey}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {loading ? 'Scanning...' : 'Connect'}
              </button>
            </form>
          </div>

          <div className="p-6 min-h-[300px]">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm mb-6">
                {error}
              </div>
            )}

            {!loading && capabilities.length === 0 && !error && (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 pt-12 pb-8">
                <Network className="w-12 h-12 mb-4 opacity-20" />
                <p>Enter your Agent API Key to scan the network.</p>
              </div>
            )}

            {capabilities.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Live Capabilities</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {capabilities.map((cap) => (
                    <div key={cap.name} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between group hover:border-indigo-500/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-indigo-400 transition-colors">
                          <Activity className="w-4 h-4" />
                        </div>
                        <span className="font-mono text-sm text-slate-200">{cap.name}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                        <span className="text-xs font-medium text-emerald-400">{cap.nodes_available} node(s)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}

export default App;
